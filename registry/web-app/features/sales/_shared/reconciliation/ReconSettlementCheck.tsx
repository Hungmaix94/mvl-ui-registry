import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Clock, TriangleAlert } from 'lucide-react'

import { IconCaretdown, IconCaretup } from '@/assets/icons/arrows'
import FormulaInfo from '@/features/sales/_shared/components/FormulaInfo'
import { formatCurrencyVND } from '@/utils/common'
import { cn } from '@/utils'

import type { InvestorReconciliationSheetCreateItemValues } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import { filterPriorHistoryRows } from './recon-calculations'
import {
  RECON_SETTLEMENT_MATCH_THRESHOLD,
  computeReconSettlement,
  type ReconSettleState,
} from './recon-settlement'
import type { ReconMvReference } from './useReconMvReference'
import { useReconKind } from './ReconKindContext'
import { buildReconHistoryQuery } from './recon-history-source'

function money(value: number): string {
  return `${formatCurrencyVND(value, { maximumFractionDigits: 0 })} đ`
}

const STATE_STYLE: Record<ReconSettleState, { border: string; bg: string; text: string }> = {
  ready: {
    border: 'border-data-green-default',
    bg: 'bg-data-green-disabled',
    text: 'text-data-green-default',
  },
  // Thiếu / dư khi tất toán = cảnh báo (amber), không phải lỗi đỏ — theo mockup `is-warn`.
  shortfall: {
    border: 'border-data-yellow-default',
    bg: 'bg-data-yellow-disabled',
    text: 'text-data-yellow-default',
  },
  over: {
    border: 'border-data-yellow-default',
    bg: 'bg-data-yellow-disabled',
    text: 'text-data-yellow-default',
  },
  progress: {
    border: 'border-data-blue-default',
    bg: 'bg-data-blue-disabled',
    text: 'text-data-blue-default',
  },
}

const PILL_BASE =
  'typo-body-xs-medium inline-flex items-center gap-1 rounded-full border px-2 py-0.5'
const PILL_OK = 'border-data-green-default bg-data-green-disabled text-data-green-default'
const PILL_WARN = 'border-data-yellow-default bg-data-yellow-disabled text-data-yellow-default'
const PILL_NEUTRAL = 'border-border-2 bg-background-2 text-content-dark-3'
const PILL_DANGER = 'border-data-red-default bg-data-red-disabled text-data-red-default'

/**
 * Đối-chiếu pill (mockup `rf5-chip-*`): green ✓ "Đủ" trong ngưỡng; lũy kế < dự kiến → ⚠ "Thiếu" (amber,
 * ở đợt tất toán) hoặc "Còn …" (trung tính, khi đang đối chiếu); vượt MV → "+…" (xanh).
 */
function VerdictPill({
  actual,
  expected,
  okLabel,
  settled,
  shortPrefix = 'Thiếu',
}: {
  actual: number
  expected: number
  okLabel: string
  /** Đợt tất toán (tiến độ = 100%). Khi false, thiếu = "Còn …" tone trung tính. */
  settled: boolean
  shortPrefix?: string
}) {
  const delta = actual - expected // < 0 ⇒ lũy kế < dự kiến ⇒ chưa đủ
  if (Math.abs(delta) <= RECON_SETTLEMENT_MATCH_THRESHOLD) {
    return (
      <span className={cn(PILL_BASE, PILL_OK)}>
        <Check size={12} />
        {okLabel}
      </span>
    )
  }
  if (delta < 0) {
    if (!settled) {
      return <span className={cn(PILL_BASE, PILL_NEUTRAL)}>Còn {money(-delta)}</span>
    }
    return (
      <span className={cn(PILL_BASE, PILL_WARN)}>
        <TriangleAlert size={12} />
        {shortPrefix} {money(-delta)}
      </span>
    )
  }
  // Lũy kế > dự kiến (dư): hiển thị "+{tiền}" màu xanh.
  return <span className={cn(PILL_BASE, PILL_OK)}>+{money(delta)}</span>
}

type Props = {
  item: InvestorReconciliationSheetCreateItemValues
  /** Deal PK — lịch sử đối chiếu scope theo deal (không theo mã căn) để loại đối chiếu deal cũ. */
  dealId: number
  mv: ReconMvReference
  /** Hoa hồng đợt này (phí base × Δ tiến độ) — từ preview/BE. */
  periodCommission: number
  /** Điều chỉnh truy hồi kỳ này. */
  retroactiveAdjustment: number
  /** Phí tăng thêm đợt này (tổng × Δ tiến độ riêng) — từ preview/BE. */
  extraBonusPeriodAmount: number
  excludeInvestorSheetId?: number | null
}

/**
 * Settlement check (mockup `SettlementCheck5`) — collapsible panel với bảng 4 cột + dòng Σ TỔNG.
 * Toàn bộ phép tính lũy-kế-vs-dự-kiến + state máy nằm trong {@link computeReconSettlement}; component
 * chỉ fetch lịch sử + render.
 *
 * Kind-aware: lịch sử lấy theo preset đối chiếu ({@link buildReconHistoryQuery}) — F2 đọc endpoint
 * `f2-reconciliation-history` (adapt sang canonical), CĐT đọc `investor-reconciliation-history`. Cờ
 * `features.extraBonus` quyết định có hiện dòng "Phí tăng thêm" hay không (F2 tắt ⇒ ẩn + loại khỏi tổng).
 */
function ReconSettlementCheck({
  item,
  dealId,
  mv,
  periodCommission,
  retroactiveAdjustment,
  extraBonusPeriodAmount,
  excludeInvestorSheetId,
}: Props) {
  const { kind, features, beneficiaryLabel, payerLabel, supplementaryRowLabel } = useReconKind()

  // Lũy kế các đợt ĐÃ đối chiếu trước — nguồn thật cho cột "Lũy kế đã/sẽ ĐC" (React Query dedupe với
  // bảng "Lịch sử đối chiếu" inline; theo preset: F2 → endpoint F2, CTV → endpoint CTV, CĐT → investor).
  const { data: historyData } = useQuery(buildReconHistoryQuery(kind, dealId))
  const priorRows = filterPriorHistoryRows(historyData?.results ?? [], excludeInvestorSheetId)

  const {
    rows,
    totalActual,
    totalExpected,
    diff,
    isSettlement,
    state,
    remainingReceivable,
    bonusOverMv,
    cumulativeFee,
    cumulativeBonus,
    cumulativeDeduct,
    expectedBonus,
    extraActualForFormula,
  } = computeReconSettlement({
    item,
    mv,
    priorRows,
    periodCommission,
    retroactiveAdjustment,
    extraBonusPeriodAmount,
    includeExtraBonus: features.extraBonus,
    supplementaryRowLabel,
  })

  const style = STATE_STYLE[state]

  // "Còn phải thu" (hàng ∑ TỔNG, cột còn lại) — đã trừ phần thưởng dư (max(thưởng lũy kế − thưởng MV, 0)).
  // `extraActualForFormula` lấy từ computeReconSettlement để khỏi tái suy diễn (tránh drift).
  const remainingReceivableFormula = [
    `Còn phải thu = Tổng ${beneficiaryLabel} dự kiến nhận`,
    '  − ( Phí đại lý (lũy kế) + Phí tăng thêm (lũy kế)',
    '      + max(Thưởng lũy kế − Thưởng MV, 0) − Khấu trừ (lũy kế) )',
    '',
    `= ${money(totalExpected)}`,
    `  − ( ${money(cumulativeFee)} + ${money(extraActualForFormula)}`,
    `      + max(${money(cumulativeBonus)} − ${money(expectedBonus)}, 0) − ${money(cumulativeDeduct)} )`,
    `= ${money(remainingReceivable)}`,
  ].join('\n')

  // Thu gọn khi sẵn sàng / đang đối chiếu; mở sẵn khi đã tới đợt tất toán mà lệch (mockup: open khi !ok).
  const [open, setOpen] = useState(state === 'shortfall' || state === 'over')

  const th = 'typo-body-xs-semibold text-content-dark-3 uppercase px-3 py-2'

  return (
    <div className={cn('overflow-hidden rounded-md border', style.border)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={cn(
          'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors',
          style.bg
        )}
      >
        <span className={cn('shrink-0', style.text)}>
          {state === 'ready' ? (
            <Check size={16} />
          ) : state === 'progress' ? (
            <Clock size={15} />
          ) : (
            <TriangleAlert size={15} />
          )}
        </span>
        <span className={cn('typo-body-sm-semibold shrink-0', style.text)}>
          Kiểm tra điều kiện tất toán
        </span>

        {open ? (
          <span className="typo-body-xs-regular text-content-dark-3 hidden md:inline">
            — đối chiếu tổng lũy kế (bao gồm kỳ này) với tổng {beneficiaryLabel} dự kiến nhận
          </span>
        ) : (
          <span className="typo-body-xs-regular text-content-dark-2 truncate">
            {state === 'ready' ? (
              <>
                — Khớp <b>{money(totalActual)}</b> / <b>{money(totalExpected)}</b> · sẵn sàng tất
                toán
              </>
            ) : state === 'shortfall' ? (
              <>
                — Lệch: thiếu <b className="text-data-yellow-default">{money(-diff)}</b> so với MV
                dự kiến
              </>
            ) : state === 'over' ? (
              <>
                — Dư <b>{money(diff)}</b> so với MV dự kiến
              </>
            ) : (
              <>
                — Chưa đến đợt tất toán · còn <b>{money(remainingReceivable)}</b> phải thu
              </>
            )}
          </span>
        )}

        <span className="text-content-dark-3 ml-auto shrink-0">
          {open ? <IconCaretup size={16} /> : <IconCaretdown size={16} />}
        </span>
      </button>

      {/* Nội dung bảng — animate đóng/mở bằng grid-rows (0fr↔1fr) + mờ dần cho mượt, không giật. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div
          className={cn(
            'min-h-0 overflow-hidden transition-opacity duration-200',
            open ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="bg-background-1 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-border-1 bg-background-2 border-b">
                  <th className={cn(th, 'text-left')}>Khoản mục</th>
                  <th className={cn(th, 'text-right')}>Lũy kế đã / sẽ ĐC</th>
                  <th className={cn(th, 'text-right')}>{beneficiaryLabel} dự kiến nhận</th>
                  <th className={cn(th, 'text-right')}>
                    {isSettlement ? 'Thiếu / Đủ' : 'Còn lại'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-border-1 border-b">
                    <td className="typo-body-sm-medium text-content-dark-2 px-3 py-2 align-middle">
                      {row.label}
                    </td>
                    <td className="typo-body-sm-medium text-content-dark-1 px-3 py-2 text-right align-middle">
                      {money(row.actual)}
                    </td>
                    <td className="typo-body-sm-medium text-content-dark-1 px-3 py-2 text-right align-middle">
                      {money(row.expected)}
                    </td>
                    <td className="px-3 py-2 text-right align-middle">
                      <span className="inline-flex justify-end">
                        {row.negative ? (
                          // Khoản giảm trừ: hiển thị "−{lũy kế}" màu đỏ (trừ vào số phải thu).
                          <span className={cn(PILL_BASE, PILL_DANGER)}>−{money(row.actual)}</span>
                        ) : (
                          <VerdictPill
                            actual={row.actual}
                            expected={row.expected}
                            okLabel="Đủ"
                            settled={isSettlement}
                          />
                        )}
                      </span>
                    </td>
                  </tr>
                ))}

                <tr className="border-data-blue-default border-t-2">
                  <td className="typo-body-sm-semibold text-content-dark-1 px-3 py-2.5 align-middle">
                    ∑ TỔNG
                  </td>
                  <td className="typo-body-sm-semibold text-content-dark-1 px-3 py-2.5 text-right align-middle">
                    {money(totalActual)}
                  </td>
                  <td className="typo-body-sm-semibold text-content-dark-1 px-3 py-2.5 text-right align-middle">
                    {money(totalExpected)}
                  </td>
                  <td className="px-3 py-2.5 text-right align-middle">
                    <div className="flex flex-col items-end gap-1">
                      {state === 'progress' ? (
                        <span
                          className={cn(
                            PILL_BASE,
                            'border-data-blue-default bg-data-blue-disabled text-data-blue-default'
                          )}
                        >
                          <Clock size={12} />
                          Còn {money(remainingReceivable)} phải thu
                          <FormulaInfo formula={remainingReceivableFormula} size={13} />
                        </span>
                      ) : (
                        <VerdictPill
                          actual={totalActual}
                          expected={totalExpected}
                          okLabel="KHỚP — sẵn sàng tất toán"
                          settled
                          shortPrefix="Chưa đủ — thiếu"
                        />
                      )}
                      {/* "Còn phải thu" đã trừ phần thưởng dư (max(5−4,0)) — ghi chú số thưởng không nằm trong phần phải thu. */}
                      {state === 'progress' && bonusOverMv > 0 && (
                        <span className="typo-body-xs-regular text-content-dark-3">
                          Không bao gồm {money(bonusOverMv)} {supplementaryRowLabel}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {state === 'shortfall' && (
              <div className="bg-data-yellow-disabled flex items-start gap-2 px-3 py-2">
                <TriangleAlert size={13} className="text-data-yellow-default mt-0.5 shrink-0" />
                <p className="typo-body-xs-regular text-content-dark-2">
                  Tất toán nghĩa là <b>đóng case</b> — không thể đối chiếu thêm. Cần đảm bảo{' '}
                  {payerLabel} đã thanh toán đủ hoặc waiver phần thiếu bằng văn bản.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReconSettlementCheck
