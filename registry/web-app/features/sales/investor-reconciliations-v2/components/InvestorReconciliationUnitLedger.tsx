import type { ReactNode } from 'react'

import { formatPercent } from '@/utils/common'
import { cn } from '@/utils'
import FormulaInfo from '@/features/sales/_shared/components/FormulaInfo'
import {
  pickReconCheckDisplay,
  reconCheckCompareUnit,
  reconCheckMvFlag,
  type ReconCheck,
  type ReconCheckEntry,
} from '@/features/sales/_shared/reconciliation/recon-server-check'
import {
  reconVatPair,
  resolveReconVatRate,
} from '@/features/sales/_shared/reconciliation/recon-calculations'
import type { InvestorReconciliationLine } from '@/features/sales/investor-reconciliations/services/investor-reconciliation-line-service'
import {
  amtOrNull,
  numOrNull,
  vnd,
} from '@/features/sales/investor-reconciliations-v2/utils/recon-v2-format'

const PRICE_FORMULA = 'Giá tính phí (A) = giá CĐT dùng để tính hoa hồng đại lý.'
const PERIOD_COMMISSION_FORMULA = 'Hoa hồng đợt này = Giá tính phí × Tỷ lệ HH × Δ tiến độ kỳ này.'

/** Nền dải section (mockup 2.0) — MỘT màu duy nhất cho mọi Phần (khác v1: mỗi Phần 1 màu riêng). */
const BAND_CLS = 'bg-data-blue-disabled text-data-blue-hover'

function signedMoney(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${vnd(Math.abs(value))}`
}

/** Màu "Số tiền điều chỉnh truy hồi" (mirror ReconConfigTable): >0 xanh lá, <0 đỏ, =0 xám. */
function retroToneClass(value: number): string {
  if (value > 0) return 'text-data-green-default'
  if (value < 0) return 'text-data-red-default'
  return 'text-content-dark-3'
}

const Dash = () => <span className="text-content-dark-4">—</span>

/* ------------------------------------------------------------------ */
/* Band / row primitives                                              */
/* ------------------------------------------------------------------ */

function LedgerBand({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={4} className={cn('px-3 py-2', BAND_CLS)}>
        <span className="typo-body-sm-semibold">{label}</span>
      </td>
    </tr>
  )
}

/** Chip "Khớp" / "Cảnh báo" cột Đối chiếu — v2 dùng "Cảnh báo" (vàng) thay "Lệch" (đỏ/xanh có delta)
 * của v1 để nhất quán với badge "N Cảnh báo" trên header card gộp. Vẫn 100% dữ liệu BE (recon_check):
 * match=true → Khớp, match=false → Cảnh báo, match=null/không có gì để so → "—" (KHÔNG fabricate). */
function LedgerCheckChip({ match }: { match: boolean | null }) {
  if (match == null) return <Dash />
  if (match) {
    return (
      <span className="bg-data-green-disabled text-data-green-default typo-body-xs-medium inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5">
        <span className="bg-data-green-default size-[6px] shrink-0 rounded-full" />
        Khớp
      </span>
    )
  }
  return (
    <span className="bg-data-yellow-disabled text-data-yellow-default typo-body-xs-medium inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5">
      <span className="bg-data-yellow-default size-[6px] shrink-0 rounded-full" />
      Cảnh báo
    </span>
  )
}

/** Ô 2 dòng (cột hẹp MVL/CĐT): nhãn "(Gồm/Chưa gồm VAT)" mờ phía trên, giá trị đậm phía dưới.
 * `vatOn` undefined ⇒ không hiện nhãn VAT (field không có VAT). */
function LedgerValueCell({ value, vatOn }: { value: ReactNode; vatOn?: boolean }) {
  return (
    <div className="flex flex-col items-end">
      {vatOn != null && (
        <span className="typo-body-xs-regular text-content-dark-3">
          {vatOn ? '(Gồm VAT)' : '(Chưa gồm VAT)'}
        </span>
      )}
      <span className="typo-body-base-medium text-content-dark-1">{value}</span>
    </div>
  )
}

interface LedgerRowProps {
  label: ReactNode
  sub?: ReactNode
  mv: ReactNode
  cdt: ReactNode
  match?: boolean | null
  muted?: boolean
  indent?: boolean
}

function LedgerRow({ label, sub, mv, cdt, match, muted, indent }: LedgerRowProps) {
  return (
    <tr className={cn('border-border-1 border-b', muted && 'opacity-70')}>
      <td className="px-3 py-2.5 align-middle">
        <span className={cn('typo-body-base text-content-dark-2 block', indent && 'pl-4')}>
          {label}
        </span>
        {sub != null && (
          <span className="typo-body-xs-regular text-content-dark-3 mt-0.5 block">{sub}</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right align-middle">{mv}</td>
      <td className="px-3 py-2.5 text-right align-middle">{cdt}</td>
      <td className="px-3 py-2.5 text-right align-middle">
        {match === undefined ? <Dash /> : <LedgerCheckChip match={match} />}
      </td>
    </tr>
  )
}

/** Ô số tiền của MỘT cột ("Chưa VAT" hoặc "Gồm VAT") trong khối "Tổng số tiền đối chiếu kỳ này".
 * Tự khai báo màu chữ (span luôn tự set màu nên không kế thừa được từ thẻ cha). */
function LedgerTotalCell({
  value,
  strong,
  tone,
}: {
  value: ReactNode
  strong?: boolean
  /** Lớp màu cho SỐ TIỀN. Mặc định `text-content-dark-1`. */
  tone?: string
}) {
  return (
    // Chọn ĐÚNG MỘT lớp typo: '.typo-body-base-medium' (tailwind-typography.css L219) khai báo SAU
    // '.typo-body-base-semibold' (L123) nên cùng cn() thì medium(500) đè semibold(600) — bold mất.
    <span
      className={cn(
        strong ? 'typo-body-base-semibold' : 'typo-body-base-medium',
        tone ?? 'text-content-dark-1'
      )}
    >
      {value}
    </span>
  )
}

/** Dòng tổng kết 3 ô: nhãn (gộp 2 cột đầu) | Chưa VAT | Gồm VAT. Số BE vào cột theo cờ
 * `is_*_include_vat`, cột còn lại FE quy đổi × / ÷ (1 + VAT) — thay cho tag "(Gồm/Chưa gồm VAT)" cũ. */
function LedgerTotalRow({
  label,
  noVat,
  vat,
  highlighted,
  strong,
}: {
  label: ReactNode
  noVat: ReactNode
  vat: ReactNode
  highlighted?: boolean
  /** Dòng kết chuyển (NET / phải thu) — nhãn in đậm. `highlighted` luôn kéo theo `strong`. */
  strong?: boolean
}) {
  const isStrong = strong || highlighted
  return (
    <tr
      className={cn(
        'border-border-1 border-b last:border-b-0',
        highlighted && 'bg-data-red-disabled'
      )}
    >
      <td colSpan={2} className="px-3 py-2.5 align-middle">
        {/* Ternary (KHÔNG cn 2 lớp typo chồng nhau): 'typo-body-base' và 'typo-body-base-semibold'
            cùng khai báo font-weight, thứ tự thắng do CSS source order chứ không do thứ tự class. */}
        <span
          className={
            isStrong
              ? 'typo-body-base-semibold text-content-dark-1'
              : 'typo-body-base text-content-dark-2'
          }
        >
          {label}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right align-middle">{noVat}</td>
      <td className="px-3 py-2.5 text-right align-middle">{vat}</td>
    </tr>
  )
}

/** MV ghi nhận cho 1/nhiều field XOR (%/₫) — lấy TỪ recon_check[field].mv_config của BE, KHÔNG fetch
 * commission-config riêng: recon_check đã là snapshot BE so sánh ngay tại thời điểm lưu dòng này. */
function mvCellFromCheck(
  reconCheck: ReconCheck | null | undefined,
  fields: string[],
  /** Chỉ dùng khi field không tự suy ra được đơn vị (không có trong RECON_CHECK_FIELD_UNIT). */
  fallbackUnit: 'percent' | 'currency'
): ReactNode {
  for (const field of fields) {
    const entry: ReconCheckEntry | undefined = reconCheck?.[field]
    if (entry?.mv_config != null && entry.mv_config !== '') {
      const n = Number(entry.mv_config)
      if (Number.isFinite(n) && n !== 0) {
        // Đơn vị phải theo ĐÚNG FIELD cấp giá trị, KHÔNG phải một đơn vị cứng cho cả dòng: các dòng
        // này map cặp %/₫ loại trừ nhau (`extra_bonus_pct` XOR `extra_bonus_amount`, `pct_agency_fee`
        // XOR `amt_agency_fee`, …) nên HĐPP cấu hình "phí tăng thêm 2%" từng bị in ra "2 VNĐ" — số vô
        // nghĩa nằm ngay cạnh "1%" của cột CĐT (ClickUp 86eyee86j); chiều ngược lại, phí đại lý cấu
        // hình 55.000.000 ₫ thành "55.000.000%". v1 đã đúng qua `pickReconCheckDisplay().unit`
        // (ReconConfigTable `reconCheckCell`) — v2 dựng lại ô MVL nên phải lặp lại quy tắc đó.
        const unit = reconCheckCompareUnit(field) ?? fallbackUnit
        return unit === 'percent' ? formatPercent(n) : vnd(n)
      }
    }
  }
  return <Dash />
}

/* ------------------------------------------------------------------ */
/* Progress bar (3-segment: kỳ trước / kỳ này / còn lại)               */
/* ------------------------------------------------------------------ */

function clampPct(value: number | null): number {
  if (value == null || !Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

/** Chấm màu + nhãn + số, buộc mỗi đoạn của thanh vào đúng con số của nó. */
function ProgressLegendItem({
  swatchClass,
  label,
  value,
  emphasis,
}: {
  swatchClass: string
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-2 shrink-0 rounded-full', swatchClass)} />
      <span className="typo-body-xs-regular text-content-dark-3">{label}</span>
      <span
        className={cn(
          'typo-body-xs-semibold',
          emphasis ? 'text-data-red-default' : 'text-content-dark-2'
        )}
      >
        {value}
      </span>
    </span>
  )
}

function LedgerProgressRow({
  label,
  fromPct,
  toPct,
}: {
  label: string
  fromPct: number | null
  toPct: number | null
}) {
  // fromPct/toPct null nghĩa là kỳ này KHÔNG dùng cơ chế tiến độ (BE tính period_commission theo cách
  // khác, không phải Δ tiến độ) — KHÁC với 0%: vẽ bar với cạnh null coi như 0 là fabricate, gây hiểu
  // nhầm "chưa làm gì" trong khi thực ra tiến độ không áp dụng (hoặc chưa đủ dữ liệu). Field BE luôn đi
  // cùng cặp (cả hai set hoặc cả hai null) nhưng type không đảm bảo — hiện "—" khi THIẾU MỘT TRONG HAI,
  // không chỉ khi thiếu cả hai, để không fabricate cạnh còn thiếu.
  if (fromPct == null || toPct == null) {
    return (
      <tr className="border-border-1 border-b">
        <td colSpan={4} className="px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="typo-body-base text-content-dark-2">{label}</span>
            <Dash />
          </div>
        </td>
      </tr>
    )
  }

  const from = clampPct(fromPct)
  const to = Math.max(from, clampPct(toPct))
  const delta = to - from
  const remaining = 100 - to
  const hasDelta = delta > 0

  return (
    <tr className="border-border-1 border-b">
      <td colSpan={4} className="px-3 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="typo-body-base text-content-dark-2">{label}</span>
            {/* Câu trả lời của cả dòng này là "đợt này cộng thêm bao nhiêu" — cho nó lên đầu
                dưới dạng chip đỏ nhạt thay vì nhét làm caption nhỏ giữa hai mốc. */}
            <div className="flex items-center gap-2">
              <span className="typo-body-sm-regular text-content-dark-3 whitespace-nowrap">
                {formatPercent(from)} → {formatPercent(to)}
              </span>
              <span
                className={cn(
                  'typo-body-sm-semibold rounded-full px-2 py-0.5 whitespace-nowrap',
                  hasDelta
                    ? 'bg-data-red-disabled text-data-red-default'
                    : 'bg-background-3 text-content-dark-3'
                )}
              >
                {hasDelta ? `+${formatPercent(delta)}` : 'Không đổi'}
              </span>
            </div>
          </div>

          {/*
            Một sắc đỏ, hai độ đậm: đậm = phần đã đối chiếu từ các kỳ trước (đã chốt), nhạt =
            phần đợt này cộng thêm. Bản cũ dùng xanh lá cho kỳ trước — lạc khỏi hệ màu đỏ của
            sản phẩm và khiến hai đoạn đọc như hai chỉ số khác nhau chứ không phải một tiến độ.
          */}
          <div
            role="img"
            aria-label={`Kỳ trước ${formatPercent(from)}, đợt này cộng thêm ${formatPercent(
              delta
            )}, còn lại ${formatPercent(remaining)}`}
            className="bg-background-3 border-border-1 flex h-2.5 w-full overflow-hidden rounded-full border"
          >
            {from > 0 && (
              <div className="bg-data-red-default h-full" style={{ width: `${from}%` }} />
            )}
            {hasDelta && (
              <div
                // Vạch trắng lót vào trong: tách đoạn mới khỏi đoạn cũ mà không ăn thêm bề rộng.
                className={cn(
                  'bg-data-red-focus h-full',
                  from > 0 && 'shadow-[inset_2px_0_0_var(--color-content-light-1)]'
                )}
                style={{ width: `${delta}%` }}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <ProgressLegendItem
              swatchClass="bg-data-red-default"
              label="Kỳ trước"
              value={formatPercent(from)}
            />
            <ProgressLegendItem
              swatchClass="bg-data-red-focus"
              label="Đợt này"
              value={hasDelta ? `+${formatPercent(delta)}` : formatPercent(0)}
              emphasis={hasDelta}
            />
            <ProgressLegendItem
              swatchClass="bg-background-3 border-border-1 border"
              label="Còn lại"
              value={formatPercent(remaining)}
            />
          </div>
        </div>
      </td>
    </tr>
  )
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export interface InvestorReconciliationUnitLedgerProps {
  item: InvestorReconciliationLine
}

/**
 * "Chi tiết đối chiếu" đầy đủ của 1 căn (view mở rộng, Đối chiếu chủ đầu tư 2.0) — hiển thị TRỰC TIẾP
 * khi card mở rộng (KHÔNG phải nội dung của "Lịch sử đối chiếu" — đó là
 * `AddInvestorReconciliationUnitHistoryCards`, xem `InvestorReconciliationUnitCard.tsx`). Bảng 4 cột
 * `nhãn | MVL ghi nhận | CĐT đề nghị | Đối chiếu` + tổng kết kỳ này, trong MỘT khung viền liền mạch
 * (mockup). CHỈ ĐỌC, dựng thẳng từ `item` + `item.recon_check` (snapshot BE), KHÔNG fetch thêm
 * commission-config / KHÔNG tự tính lại (nguyên tắc "FE không tự tính" — xem ReconConfigTable.tsx /
 * useReconLineDerived.ts).
 */
function InvestorReconciliationUnitLedger({ item }: InvestorReconciliationUnitLedgerProps) {
  const reconCheck = item.recon_check as ReconCheck | null

  /** Chip cột "Đối chiếu" của 1 dòng: lệch ở BẤT KỲ field nào trong `fields` ⇒ "Cảnh báo".
   *
   * Dòng nào in cặp nhãn `(Gồm VAT)/(Chưa gồm VAT)` thì PHẢI truyền kèm field cờ `is_*_include_vat`:
   * hai vế khác cơ sở VAT là lệch TIỀN trọn một nhịp VAT, trong khi mọi field SỐ của dòng vẫn bằng
   * nhau (giá × tỷ lệ không đổi theo cờ) ⇒ thiếu cờ thì chip báo "Khớp" trên một dòng đang tự in ra
   * hai cơ sở mâu thuẫn. Đặt cờ CUỐI danh sách để field số (có delta) được ưu tiên khi cả hai lệch.
   * Xem `backend/docs/issues/ir_v2_vat_basis_mismatch_shows_match.md`. */
  const checkFor = (...fields: string[]) => pickReconCheckDisplay(reconCheck, fields)?.match ?? null

  /** Cờ VAT cho cột "MVL ghi nhận" — lấy từ `recon_check.<field>.mv_config`, KHÔNG dùng cờ của dòng
   * (`item.is_*_include_vat`) vì cờ đó là giá trị CĐT đề nghị, chỉ thuộc cột "CĐT đề nghị". */
  const mvVatOn = (field: string) => reconCheckMvFlag(reconCheck, field)

  const feePrice = numOrNull(item.fee_calculation_price)
  const commissionFeePriceOwn = numOrNull(item.commission_fee_calculation_price)
  const pctAgencyFee = numOrNull(item.pct_agency_fee)
  const amtAgencyFee = amtOrNull(item.amt_agency_fee)
  const agencyVatOn = !!item.is_agency_fee_include_vat

  const progressFrom = numOrNull(item.progress_from_pct)
  const progressTo = numOrNull(item.progress_to_pct)

  const retroactive = numOrNull(item.retroactive_adjustment_amount) ?? 0

  const sharedBonusAmount = amtOrNull(item.shared_bonus_amount)
  const sharedBonusPct = numOrNull(item.shared_bonus_pct)
  const sharedBonusVatOn = !!item.is_shared_bonus_include_vat
  const sharedBonusPeriod = numOrNull(item.shared_bonus_period_amount)
  const sharedBonusToSalePct = numOrNull(item.shared_bonus_to_sale_pct)
  const sharedBonusToSaleAmount = Number(item.shared_bonus_to_sale_amount) || 0
  const feeDeduction = numOrNull(item.fee_deduction)
  const feeDeductionToSale = numOrNull(item.fee_deduction_to_sale_amount)
  const deductionVatOn = !!item.is_fee_deduction_include_vat

  const extraBonusAmount = amtOrNull(item.extra_bonus_amount)
  const extraBonusPct = numOrNull(item.extra_bonus_pct)
  const extraVatOn = !!item.is_extra_bonus_include_vat
  const extraProgressFrom = numOrNull(item.extra_bonus_progress_from_pct)
  const extraProgressTo = numOrNull(item.extra_bonus_progress_to_pct)
  const extraBonusPeriod = numOrNull(item.extra_bonus_period_amount)

  const periodCommission = numOrNull(item.period_commission)
  const netAmount = Number(item.total_amount)
  const vatRate = resolveReconVatRate(item.vat_rate)
  const sharedBonusPrepaid = numOrNull(item.shared_bonus_prepaid_amount)
  const amountToCollect = numOrNull(item.amount_to_collect)
  const receivable =
    sharedBonusPrepaid != null && sharedBonusPrepaid > 0
      ? (amountToCollect ?? Number(item.total_amount_with_vat))
      : Number(item.total_amount_with_vat)

  /** Cặp ô (Chưa VAT | Gồm VAT) cho 1 dòng cấu phần: số BE vào cột khớp cờ `includeVat`, cột kia FE
   * quy đổi × / ÷ (1 + VAT). `null` ⇒ cả 2 ô "—" (không bịa số). `signed` cho mục cộng/trừ (truy hồi,
   * phí tăng thêm, khấu trừ) để giữ dấu +/−. */
  const componentCells = (
    value: number | null,
    includeVat: boolean,
    signed = false
  ): { noVat: ReactNode; vat: ReactNode } => {
    if (value == null) return { noVat: <Dash />, vat: <Dash /> }
    const pair = reconVatPair(value, includeVat, vatRate)
    const fmt = signed ? signedMoney : vnd
    return {
      noVat: <LedgerTotalCell value={fmt(pair.noVat)} />,
      vat: <LedgerTotalCell value={fmt(pair.vat)} />,
    }
  }

  const commissionCells = componentCells(periodCommission, agencyVatOn)
  const retroCells = componentCells(retroactive, agencyVatOn, true)
  const extraCells = componentCells(extraBonusPeriod, extraVatOn, true)
  const bonusCells = componentCells(sharedBonusPeriod ?? 0, sharedBonusVatOn)
  const deductionCells = componentCells(
    feeDeduction != null ? -feeDeduction : null,
    deductionVatOn,
    true
  )

  return (
    <div className="border-border-1 overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <colgroup>
            <col className="w-[36%]" />
            <col className="w-[22%]" />
            <col className="w-[22%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr className="border-border-1 border-b">
              <th className="px-3 py-2" />
              <th className="typo-body-sm-regular text-content-dark-3 px-3 py-2 text-right font-normal">
                MVL ghi nhận
              </th>
              <th className="typo-body-sm-regular text-content-dark-3 px-3 py-2 text-right font-normal">
                CĐT đề nghị
              </th>
              <th className="typo-body-sm-regular text-content-dark-3 px-3 py-2 text-right font-normal">
                Đối chiếu
              </th>
            </tr>
          </thead>
          <tbody>
            <LedgerBand label="Giá tính phí và tỷ lệ hoa hồng" />

            <LedgerRow
              label={
                <span className="inline-flex items-center gap-1">
                  Giá tính phí (HĐMB) <FormulaInfo formula={PRICE_FORMULA} size={14} />
                </span>
              }
              sub="Có thể nhập số khác để điều chỉnh"
              mv={mvCellFromCheck(reconCheck, ['fee_calculation_price'], 'currency')}
              cdt={feePrice != null ? vnd(feePrice) : <Dash />}
              match={checkFor('fee_calculation_price')}
            />

            <LedgerRow
              label="% Hoa hồng (theo HĐPP)"
              sub="Nhập % khác hoặc bấm ₫ để đối chiếu sang phí cố định"
              mv={
                <LedgerValueCell
                  vatOn={mvVatOn('is_agency_fee_include_vat')}
                  value={mvCellFromCheck(
                    reconCheck,
                    ['pct_agency_fee', 'amt_agency_fee'],
                    'percent'
                  )}
                />
              }
              cdt={
                <LedgerValueCell
                  vatOn={agencyVatOn}
                  value={
                    amtAgencyFee != null
                      ? vnd(amtAgencyFee)
                      : pctAgencyFee != null
                        ? formatPercent(pctAgencyFee)
                        : '—'
                  }
                />
              }
              match={checkFor('pct_agency_fee', 'amt_agency_fee', 'is_agency_fee_include_vat')}
            />

            <LedgerRow
              label="Giá tính phí riêng (Sale/F2)"
              sub="Chỉ tính HH Sale/F2 nội bộ — không ảnh hưởng đối chiếu CĐT"
              mv={<Dash />}
              cdt={commissionFeePriceOwn != null ? vnd(commissionFeePriceOwn) : <Dash />}
            />

            <LedgerBand label="Tiến độ" />
            <LedgerProgressRow
              label="Tiến độ đối chiếu đợt này"
              fromPct={progressFrom}
              toPct={progressTo}
            />

            <LedgerBand label="Điều chỉnh truy hồi" />
            <LedgerRow
              label="Số tiền điều chỉnh truy hồi"
              muted
              mv={<Dash />}
              cdt={
                retroactive === 0 ? (
                  <Dash />
                ) : (
                  <span className={cn('typo-body-base-medium', retroToneClass(retroactive))}>
                    {signedMoney(retroactive)}
                  </span>
                )
              }
            />

            <LedgerBand label="Thưởng đại lý / Khấu trừ" />

            <LedgerRow
              label="Tổng thưởng đại lý"
              sub="Tổng thưởng CĐT"
              mv={
                <LedgerValueCell
                  vatOn={mvVatOn('is_shared_bonus_include_vat')}
                  value={mvCellFromCheck(
                    reconCheck,
                    ['shared_bonus_amount', 'shared_bonus_pct'],
                    'currency'
                  )}
                />
              }
              cdt={
                <LedgerValueCell
                  vatOn={sharedBonusVatOn}
                  value={
                    sharedBonusAmount != null
                      ? vnd(sharedBonusAmount)
                      : sharedBonusPct != null
                        ? formatPercent(sharedBonusPct)
                        : '—'
                  }
                />
              }
              match={checkFor(
                'shared_bonus_amount',
                'shared_bonus_pct',
                'is_shared_bonus_include_vat'
              )}
            />

            <LedgerRow
              label="Thưởng ghi nhận kỳ này"
              sub="Thưởng CĐT thực ghi nhận kỳ này — cộng vào tổng phụ."
              mv={<Dash />}
              cdt={
                sharedBonusPeriod != null && sharedBonusPeriod !== 0 ? (
                  vnd(sharedBonusPeriod)
                ) : (
                  <Dash />
                )
              }
              match={checkFor('shared_bonus_period_amount')}
            />

            <LedgerRow
              indent
              label="· Tiến độ thanh toán thưởng sale/F2 kỳ này"
              sub="Thưởng cho Sale (F2 + CTV) kỳ này. Điền 0 = tạm dừng chia (vẫn ghi nhận thưởng)."
              mv={<Dash />}
              cdt={
                sharedBonusToSalePct != null ? (
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="typo-body-base-medium text-content-dark-1">
                      {formatPercent(sharedBonusToSalePct)}
                    </span>
                    {sharedBonusToSaleAmount > 0 && (
                      <span className="typo-body-xs-regular text-content-dark-3">
                        = {vnd(sharedBonusToSaleAmount)} chia về Sale/F2 kỳ này
                      </span>
                    )}
                  </div>
                ) : (
                  <Dash />
                )
              }
            />

            <LedgerRow
              label="Giảm trừ khác"
              sub="CĐT khấu trừ trong kỳ"
              mv={<Dash />}
              cdt={
                <LedgerValueCell
                  vatOn={deductionVatOn}
                  value={feeDeduction != null && feeDeduction !== 0 ? vnd(feeDeduction) : <Dash />}
                />
              }
              match={checkFor('fee_deduction')}
            />

            {/* Cùng điều kiện hiện với dialog thêm/sửa (AddInvestorReconciliationUnitConfigTable):
                chỉ có nghĩa khi thực sự có khấu trừ trong kỳ. */}
            {feeDeduction != null && feeDeduction > 0 && (
              <LedgerRow
                indent
                label="· Trong đó Sale / F2 phải chịu"
                sub="Phần khấu trừ áp vào Sale (F2 + CTV) — để trống hoặc 0 = không trừ vào HH Sale/F2"
                mv={<Dash />}
                cdt={feeDeductionToSale != null ? vnd(feeDeductionToSale) : <Dash />}
              />
            )}

            <LedgerBand label="Phí tăng thêm" />

            <LedgerRow
              label="Tổng phí tăng thêm (thỏa thuận)"
              sub="Tổng phí tăng thêm CĐT cam kết cho căn này (trọn gói). Nhập theo ₫ trọn gói hoặc % trên giá tính phí"
              mv={
                <LedgerValueCell
                  vatOn={mvVatOn('is_extra_bonus_include_vat')}
                  value={mvCellFromCheck(
                    reconCheck,
                    ['extra_bonus_amount', 'extra_bonus_pct'],
                    'currency'
                  )}
                />
              }
              cdt={
                <LedgerValueCell
                  vatOn={extraVatOn}
                  value={
                    extraBonusAmount != null
                      ? vnd(extraBonusAmount)
                      : extraBonusPct != null
                        ? formatPercent(extraBonusPct)
                        : '—'
                  }
                />
              }
              match={checkFor(
                'extra_bonus_amount',
                'extra_bonus_pct',
                'is_extra_bonus_include_vat'
              )}
            />

            <LedgerProgressRow
              label="Tiến độ ĐC phí tăng thêm đợt này"
              fromPct={extraProgressFrom}
              toPct={extraProgressTo}
            />

            {/* Nhóm "Phí tăng thêm" phải chốt bằng SỐ TIỀN, đối xứng với "Thưởng ghi nhận kỳ này" của
                nhóm thưởng. Thiếu dòng này thì căn nhập phí tăng thêm dạng TỶ LỆ chỉ đọc được "1%" +
                "40%" và KHÔNG có đồng nào trong cả nhóm để đối chiếu — căn nhập trọn gói ₫ thì vẫn
                thấy tổng, nên lỗi chỉ lộ ở nhánh % (ClickUp 86eyee86j). Số lấy THẲNG
                `extra_bonus_period_amount` của BE (= tổng phí tăng thêm × Δ tiến độ), FE không tự tính. */}
            <LedgerRow
              label="Phí tăng thêm ghi nhận đợt này"
              sub="Tổng phí tăng thêm × tiến độ ĐC đợt này — cộng vào tổng phụ."
              // Khác "Thưởng ghi nhận kỳ này" (BE mirror thẳng số submitted ⇒ không có gì để so, để
              // trống): phí tăng thêm kỳ này ĐƯỢC BE dự đoán từ HĐPP (probe = tỷ lệ MV × tiến độ đã
              // nhập) nên có số thật để đặt cạnh cột CĐT. Vẫn "—" khi HĐPP KHÔNG quy định phí tăng
              // thêm — probe ra 0 và `mvCellFromCheck` bỏ qua 0 — giống hệt dòng "Tổng phí tăng thêm"
              // ngay trên; lúc đó chip "Cảnh báo" mang nghĩa "CĐT đề xuất khoản HĐPP không có".
              mv={
                <LedgerValueCell
                  vatOn={mvVatOn('is_extra_bonus_include_vat')}
                  value={mvCellFromCheck(reconCheck, ['extra_bonus_period_amount'], 'currency')}
                />
              }
              cdt={
                <LedgerValueCell
                  vatOn={extraVatOn}
                  value={extraBonusPeriod != null ? vnd(extraBonusPeriod) : <Dash />}
                />
              }
              match={checkFor('extra_bonus_period_amount', 'is_extra_bonus_include_vat')}
            />

            <LedgerBand label="Tổng số tiền đối chiếu kỳ này" />

            {/* Sub-header 2 cột giá trị. Số BE hiển thị ở cột khớp cờ is_*_include_vat của mục; cột
                còn lại FE quy đổi × / ÷ (1 + VAT). Thay cho tag "(Gồm/Chưa gồm VAT)" per-cell bản cũ. */}
            <tr className="border-border-1 border-b">
              <td colSpan={2} className="px-3 py-2" />
              <td className="typo-body-sm-regular text-content-dark-3 px-3 py-2 text-right font-normal">
                Chưa VAT
              </td>
              <td className="typo-body-sm-regular text-content-dark-3 px-3 py-2 text-right font-normal">
                Gồm VAT
              </td>
            </tr>

            <LedgerTotalRow
              label={
                <span className="inline-flex items-center gap-1">
                  Hoa hồng đợt này (phí đại lý){' '}
                  <FormulaInfo formula={PERIOD_COMMISSION_FORMULA} size={14} />
                </span>
              }
              noVat={commissionCells.noVat}
              vat={commissionCells.vat}
            />
            {/* Điều chỉnh truy hồi là cấu phần RIÊNG của total_amount (BE:
                sub_total = period_commission + retroactive_adjustment_amount + …), KHÔNG gộp vào
                period_commission. Thiếu dòng này thì tổng kết không cộng khớp NET khi retro ≠ 0. */}
            {retroactive !== 0 && (
              <LedgerTotalRow
                label="Điều chỉnh truy hồi đợt này"
                noVat={retroCells.noVat}
                vat={retroCells.vat}
              />
            )}
            {/* Thứ tự các cấu phần → NET → phải thu, khớp v1 (ReconConfigTable §"Số tiền đối chiếu kỳ
                này"): mọi khoản cộng/trừ đứng TRƯỚC dòng kết chuyển NET. Dòng "VAT %" đã BỎ — chênh
                lệch Chưa VAT ↔ Gồm VAT thể hiện trực tiếp qua 2 cột. */}
            {/* extra_bonus_period_amount `null` ⇒ căn không áp dụng phí tăng thêm ⇒ "—" cả 2 cột, KHÔNG
                in "0 ₫" (bịa số BE chưa hề tính) — componentCells(null) trả Dash. */}
            <LedgerTotalRow
              label="Phí tăng thêm đợt này"
              noVat={extraCells.noVat}
              vat={extraCells.vat}
            />
            <LedgerTotalRow label="Thưởng kì này" noVat={bonusCells.noVat} vat={bonusCells.vat} />
            <LedgerTotalRow
              label="Khấu trừ kỳ này"
              noVat={deductionCells.noVat}
              vat={deductionCells.vat}
            />
            {/* NET là số THUẦN chưa VAT ⇒ chỉ hiện ở cột "Chưa VAT"; cột "Gồm VAT" để trống, giá trị
                gồm VAT dồn xuống dòng "TIỀN PHẢI THU CĐT". */}
            <LedgerTotalRow
              label="TIỀN NHẬN KỲ NÀY (NET)"
              strong
              noVat={<LedgerTotalCell value={vnd(netAmount)} strong />}
              vat={<Dash />}
            />
            {sharedBonusPrepaid != null && sharedBonusPrepaid > 0 && (
              <LedgerTotalRow
                label="Đã trích quỹ tạm ứng (đối trừ ở phiếu thu)"
                noVat={<Dash />}
                vat={<LedgerTotalCell value={vnd(sharedBonusPrepaid)} />}
              />
            )}
            {/* Phải thu CĐT: chỉ hiện ở cột "Gồm VAT" (= số phải thu gồm VAT); cột "Chưa VAT" để trống
                `—` (theo yêu cầu — không hiển thị giá trị nào bên trái). */}
            <LedgerTotalRow
              label="TIỀN PHẢI THU CĐT"
              highlighted
              noVat={<Dash />}
              vat={
                <LedgerTotalCell
                  value={vnd(receivable)}
                  strong
                  tone="text-action-primary-red-default"
                />
              }
            />
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="typo-body-base text-content-dark-2">Ghi chú</span>
        <span className="typo-body-base-medium text-content-dark-1">{item.note || '—'}</span>
      </div>
    </div>
  )
}

export default InvestorReconciliationUnitLedger
