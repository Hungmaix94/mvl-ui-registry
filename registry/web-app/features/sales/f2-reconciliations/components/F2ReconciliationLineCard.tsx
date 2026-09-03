import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { useFormContext } from 'react-hook-form'
import { Flex } from '@radix-ui/themes'

import { IconCaretdown, IconCaretup } from '@/assets/icons/arrows'
import {
  IconCoin,
  IconPencilsimple,
  IconStacksimple,
  IconTarget,
  IconWarning,
} from '@/assets/icons'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select'
import { CTVReconciliationPeriod_type } from '@/api/schema'
import { cn } from '@/utils'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { formatRateSpecWithEquivalent } from '@/utils/rate-spec'
import { TextArea } from '@/components/ui'

import type {
  InvestorReconciliationSheetCreateItemValues,
  InvestorReconciliationSheetCreateValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import { RECON_PERIOD_TYPE_LABELS } from '@/features/sales/_shared/reconciliation/recon-period-type'
import { useReconMode } from '@/features/sales/_shared/reconciliation/ReconModeContext'
import { useReconKind } from '@/features/sales/_shared/reconciliation/ReconKindContext'
import {
  useReconLineDerived,
  type ReconServerComputed,
} from '@/features/sales/_shared/reconciliation/useReconLineDerived'
import { useReconHistorySummary } from '@/features/sales/_shared/reconciliation/useReconHistorySummary'
import { useF2ReconMvReference } from '../hooks/useF2ReconMvReference'
import type { ReconSelectedDeal } from '@/features/sales/_shared/reconciliation/useReconDealSelect'
import { buildReconLineSummary } from '@/features/sales/_shared/reconciliation/recon-line-summary'
import { hasReconExtraBonusSection } from '@/features/sales/_shared/reconciliation/recon-extra-section'
import ReconConfigTable from '@/features/sales/_shared/reconciliation/ReconConfigTable'
import ReconHistoryTable from '@/features/sales/_shared/reconciliation/ReconHistoryTable'
import ReconLineCardHeader from '@/features/sales/_shared/reconciliation/ReconLineCardHeader'

/**
 * F2 reconciliation line card — the SAME card tree as `InvestorReconciliationLineCard` (header +
 * period strip + 4-column `ReconConfigTable` + issues + note), driven by the canonical line model and
 * the F2 MV reference (`useReconMvReference(deal)`).
 *
 * Intentional differences from the investor card (see `project_f2_recon_ui_gaps`):
 * - Inline "Lịch sử đối chiếu" table IS shown, but reads F2's own per-căn ledger
 *   (`f2-reconciliation-history` endpoint, adapted to the canonical row shape — see
 *   `recon-history-source` / `recon-f2-history-adapter`). NO settlement panel. Prior-progress
 *   seeding stays a no-op (F2 carries explicit progress inherited from the parent CĐT — the history
 *   is informational only, never seeds the form).
 * - NO "Giá riêng Sale/F2" (A') toggle — F2 has no `commission_fee_calculation_price`.
 * - NO per-line actions — F2 sheets are confirmed as a whole via the detail page "Phê duyệt" button,
 *   exactly like the investor (CĐT) flow.
 */

const PERIOD_BORDER_VAR: Record<CTVReconciliationPeriod_type, string> = {
  [CTVReconciliationPeriod_type.normal_payment]: 'var(--color-data-blue-default)',
  [CTVReconciliationPeriod_type.progress_with_adjustment]: 'var(--color-data-purple-default)',
  [CTVReconciliationPeriod_type.adjustment_only]: 'var(--color-data-orange-default)',
  [CTVReconciliationPeriod_type.bonus_deduction]: 'var(--color-data-green-default)',
  [CTVReconciliationPeriod_type.cancellation]: 'var(--color-data-red-default)',
}

const PERIOD_STRIP_CLS: Record<CTVReconciliationPeriod_type, string> = {
  [CTVReconciliationPeriod_type.normal_payment]: 'bg-data-blue-disabled text-data-blue-hover',
  [CTVReconciliationPeriod_type.progress_with_adjustment]:
    'bg-data-purple-disabled text-data-purple-hover',
  [CTVReconciliationPeriod_type.adjustment_only]: 'bg-data-orange-disabled text-data-orange-hover',
  [CTVReconciliationPeriod_type.bonus_deduction]: 'bg-data-green-disabled text-data-green-hover',
  [CTVReconciliationPeriod_type.cancellation]: 'bg-data-red-disabled text-data-red-default',
}

const PERIOD_ICON: Record<
  CTVReconciliationPeriod_type,
  ComponentType<{ size?: number; color?: string }>
> = {
  [CTVReconciliationPeriod_type.normal_payment]: IconCoin,
  [CTVReconciliationPeriod_type.progress_with_adjustment]: IconStacksimple,
  [CTVReconciliationPeriod_type.adjustment_only]: IconPencilsimple,
  [CTVReconciliationPeriod_type.bonus_deduction]: IconTarget,
  [CTVReconciliationPeriod_type.cancellation]: IconWarning,
}

/** "Tùy chọn" pill toggle (mockup `.rf6-opt-tog`) — mirrors the investor card. */
function OptToggle({
  on,
  label,
  title,
  disabled,
  onClick,
}: {
  on: boolean
  label: string
  title?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={cn(
        'typo-body-xs-semibold inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        on
          ? 'border-action-primary-red-default bg-data-red-disabled text-action-primary-red-default'
          : 'border-border-2 bg-background-1 text-content-dark-2 hover:bg-background-2'
      )}
    >
      <span
        className={cn(
          'size-[7px] rounded-full ring-2',
          on
            ? 'bg-action-primary-red-default ring-data-red-disabled'
            : 'bg-content-dark-3 ring-background-3'
        )}
        aria-hidden
      />
      {label}
    </button>
  )
}

export interface F2ReconciliationLineCardProps {
  index: number
  item: InvestorReconciliationSheetCreateItemValues
  /** Selected deal subset (căn code, prices, dealId) resolved from the sheet rows. */
  selectedDeal: ReconSelectedDeal | undefined
  /** Exchange (Sàn F2) id of the sheet — keys the MV-to-F2 rate in the deal commission-config. */
  exchangeId: number | null | undefined
  isSubmitting?: boolean
  loadDealOptions: (params: LoadOptionsParams) => Promise<LoadOptionsResult<SelectOption>>
  loadInitialDealOptions: (values: (string | number)[]) => Promise<SelectOption[]>
  /** FE-only "Đã xác nhận" review marker (lifted to the form). */
  verified: boolean
  onToggleVerified: () => void
  /** Phiếu F2 đang xem/sửa — loại khỏi các dòng lịch sử đã lưu (current sheet → dòng "Đang lập"). */
  excludeInvestorSheetId?: number | null
  /** BE-computed totals của dòng (commission_before_vat/sub_total/total/total_with_vat) — hiển thị số BE. */
  serverComputed?: ReconServerComputed | null
}

function F2ReconciliationLineCard({
  index,
  item,
  selectedDeal,
  exchangeId,
  isSubmitting,
  loadDealOptions,
  loadInitialDealOptions,
  verified,
  onToggleVerified,
  excludeInvestorSheetId,
  serverComputed,
}: F2ReconciliationLineCardProps) {
  const { setValue } = useFormContext<InvestorReconciliationSheetCreateValues>()
  const { isReadOnly } = useReconMode()
  // F2 preset (simple) tắt phí tăng thêm; cờ này khoá toàn bộ UI "Phí tăng thêm" của card.
  const { features } = useReconKind()

  const disabled = isSubmitting || isReadOnly
  const inventoryId = item?.product_inventory_id
  const hasInventory = Number(inventoryId) > 0
  const periodType = item?.period_type ?? CTVReconciliationPeriod_type.normal_payment
  const isCancel = periodType === CTVReconciliationPeriod_type.cancellation
  const PeriodIcon = PERIOD_ICON[periodType]

  // Mặc định thu gọn khi căn đã có (giống CĐT — detail/edit hiện card thu gọn, bung khi cần).
  const [expanded, setExpanded] = useState(() => !hasInventory)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [showExtra, setShowExtra] = useState(
    () => features.extraBonus && hasReconExtraBonusSection(item)
  )

  // Lịch sử đối chiếu của deal — endpoint F2 (preset 'f2' ⇒ useReconHistorySummary tự chọn). Scope
  // theo deal (không theo mã căn) để không lẫn đối chiếu của deal cũ đã hủy cọc. Chỉ HIỂN THỊ (tóm
  // tắt + bảng inline); F2 KHÔNG seed tiến độ từ lịch sử (tiến độ kế thừa từ CĐT cha).
  const historySummary = useReconHistorySummary(selectedDeal?.dealId ?? 0, {
    excludeInvestorSheetId,
  })

  useEffect(() => {
    setShowExtra(features.extraBonus && hasReconExtraBonusSection(item))
  }, [
    features.extraBonus,
    item?.extra_bonus_pct,
    item?.extra_bonus_amount,
    item?.extra_bonus_progress_from_pct,
    item?.extra_bonus_progress_to_pct,
  ])

  // MV ghi nhận = tỷ lệ MV trả cho F2 (f2_rates_by_exchange[exchange].pct_f2_commission(_spec)), KHÔNG
  // phải pct_agency_fee (CĐT→MV) như shared useReconMvReference.
  const mv = useF2ReconMvReference(selectedDeal?.dealId, exchangeId, selectedDeal)

  // Chip "× tỷ lệ" trên dải giá header đọc item.pct_agency_fee/amt_agency_fee. BE để 2 field này 0/null
  // khi MV cấu hình HH F2 dạng PHÂN SỐ / SỐ TIỀN CỐ ĐỊNH (giá trị thật ở pct_f2_commission_spec — đã vào
  // `mv`). Khi dòng chưa có số phẳng, truyền chuỗi đúng công thức cho header: GIỮ phân số "num/den của
  // base" nếu là fraction, ngược lại dùng số MV đã resolve. Bảng cấu hình đọc trực tiếp `mv` (spec + số
  // dẫn xuất) nên không cần ghi đè `item` — giữ `item` gốc cho tính tiền (derived/summary lấy số BE).
  const agencyFeeChipText = useMemo<string | null>(() => {
    const hasFlatRate =
      item.amt_agency_fee != null || (item.pct_agency_fee != null && item.pct_agency_fee !== 0)
    if (hasFlatRate) return null
    const fraction = formatRateSpecWithEquivalent(mv.agencyFeeSpec)
    if (fraction) return fraction
    if (mv.amtAgencyFee != null)
      return `${formatCurrencyVND(mv.amtAgencyFee, { maximumFractionDigits: 0 })} đ`
    if (mv.pctAgencyFee != null) return formatPercent(mv.pctAgencyFee)
    return null
  }, [item.amt_agency_fee, item.pct_agency_fee, mv.agencyFeeSpec, mv.amtAgencyFee, mv.pctAgencyFee])

  // F2 hiển thị số BE đã tính (serverComputed) cho NET/Phải-thu/sub_total — công thức per-field FE
  // KHÔNG khớp cách BE tính tổng cho F2. progress kế thừa từ CĐT cha — KHÔNG seed từ lịch sử (ledger
  // riêng), truyền prior-progress rỗng để derived tính từ chính dòng.
  const derived = useReconLineDerived(item, mv, serverComputed, undefined, {
    paymentProgressToPct: null,
    extraProgressToPct: null,
    maxConfirmedProgressToPct: null,
    latestConfirmedAgreedTerms: null,
  })

  const summarySegments = buildReconLineSummary(item, derived, {
    includeExtraBonus: features.extraBonus,
  })

  const handleToggleExtra = (checked: boolean) => {
    setShowExtra(checked)
    if (!checked) {
      setValue(`items.${index}.extra_bonus_pct`, null, { shouldDirty: true })
      setValue(`items.${index}.extra_bonus_amount`, null, { shouldDirty: true })
      setValue(`items.${index}.extra_bonus_progress_from_pct`, null, { shouldDirty: true })
      setValue(`items.${index}.extra_bonus_progress_to_pct`, null, { shouldDirty: true })
      setValue(`items.${index}.amt_extra_bonus_payment_this_period`, null, { shouldDirty: true })
    }
  }

  return (
    <div
      className="bg-background-1 border-border-1 space-y-3 rounded-md border border-l-4 p-4"
      style={{ borderLeftColor: PERIOD_BORDER_VAR[periodType] }}
    >
      <ReconLineCardHeader
        index={index}
        item={item}
        derived={derived}
        selectedDeal={selectedDeal}
        agencyFeeChipText={agencyFeeChipText}
        reconciledProgressPct={item.progress_to_pct}
        disabled={disabled}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((prev) => !prev)}
        verified={verified}
        onToggleVerified={onToggleVerified}
        // F2 KHÔNG hiển thị cảnh báo (đối chiếu F2 không có phần cảnh báo lệch) → ép 0 để ẩn badge.
        warningCountOverride={0}
        loadDealOptions={loadDealOptions}
        loadInitialDealOptions={loadInitialDealOptions}
        onSelectDeal={() => undefined}
        onRemove={() => undefined}
        canRemove={false}
        productLocked
      />

      {!hasInventory ? (
        <span className="typo-body-sm-regular text-content-dark-3">
          Chưa có mã căn cho dòng đối chiếu này.
        </span>
      ) : (
        <div>
          {/* COLLAPSED body: period chip + one-line summary + warning line. */}
          <div
            className={cn(
              'grid transition-[grid-template-rows] duration-300 ease-out',
              expanded ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
            )}
          >
            <div
              className={cn(
                'min-h-0 overflow-hidden transition-opacity duration-200',
                expanded ? 'opacity-0' : 'opacity-100'
              )}
            >
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2" wrap="wrap">
                  <span
                    className={cn(
                      'typo-body-xs-semibold inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5',
                      PERIOD_STRIP_CLS[periodType]
                    )}
                  >
                    <PeriodIcon size={11} />
                    {RECON_PERIOD_TYPE_LABELS[periodType]}
                  </span>
                  {summarySegments.length > 0 && (
                    <span className="typo-body-sm-regular text-content-dark-2">
                      {summarySegments.join(' · ')}
                    </span>
                  )}
                </Flex>
              </Flex>
            </div>
          </div>

          {/* EXPANDED body: strip + ConfigTable + ghi chú. */}
          <div
            className={cn(
              'grid transition-[grid-template-rows] duration-300 ease-out',
              expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            )}
          >
            <div
              className={cn(
                'min-h-0 overflow-hidden transition-opacity duration-200',
                expanded ? 'opacity-100' : 'opacity-0'
              )}
            >
              <div className="space-y-3">
                <Flex
                  align="center"
                  gap="2"
                  wrap="wrap"
                  className={cn('rounded-md px-3 py-2', PERIOD_STRIP_CLS[periodType])}
                >
                  <PeriodIcon size={14} />
                  <span className="typo-body-sm-semibold">
                    {RECON_PERIOD_TYPE_LABELS[periodType]}
                  </span>
                  {!isCancel && features.extraBonus && (
                    <Flex align="center" gap="2" wrap="wrap" className="ml-auto">
                      <span className="typo-body-xs-semibold text-content-dark-3 uppercase">
                        Tùy chọn:
                      </span>
                      <OptToggle
                        on={showExtra}
                        disabled={disabled}
                        onClick={() => handleToggleExtra(!showExtra)}
                        label="Phí tăng thêm"
                        title="Bật để nhập & theo dõi phí tăng thêm"
                      />
                    </Flex>
                  )}
                </Flex>

                {/* Inline lịch sử đối chiếu F2 — collapsible (mirror CĐT card, đọc endpoint F2). */}
                <div className="border-border-1 rounded-md border">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen((prev) => !prev)}
                    className="hover:bg-background-2 typo-body-sm-medium text-content-dark-2 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 transition-colors"
                    aria-expanded={historyOpen}
                  >
                    <IconStacksimple size={15} />
                    <span className="shrink-0">Lịch sử đối chiếu</span>
                    {!historySummary.isLoading &&
                      (historySummary.hasHistory ? (
                        <span className="typo-body-sm-regular text-content-dark-3 truncate">
                          {historySummary.count} lần · Đã ĐC{' '}
                          {formatPercent(historySummary.latestProgressToPct ?? 0)} ·{' '}
                          {formatCurrencyVND(historySummary.cumulativeAmount, {
                            maximumFractionDigits: 0,
                          })}{' '}
                          đ
                        </span>
                      ) : (
                        <span className="typo-body-xs-regular text-content-dark-3 truncate">
                          Lần đối chiếu đầu tiên cho căn này
                        </span>
                      ))}
                    <span
                      className={cn(
                        'ml-auto shrink-0 transition-transform duration-300 ease-out',
                        historyOpen && 'rotate-180'
                      )}
                    >
                      <IconCaretdown size={16} />
                    </span>
                  </button>
                  <div
                    className={cn(
                      'grid transition-[grid-template-rows] duration-300 ease-out',
                      historyOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="border-border-1 border-t">
                        <ReconHistoryTable
                          dealId={selectedDeal?.dealId ?? 0}
                          // Read-only (xem chi tiết): không loại phiếu đang xem + không tổng hợp dòng
                          // "Đang lập" giả — phiếu đã lưu hiện như dòng lịch sử thật theo trạng thái thật.
                          excludeInvestorSheetId={isReadOnly ? null : excludeInvestorSheetId}
                          currentRow={
                            isReadOnly || isCancel
                              ? null
                              : {
                                  item,
                                  periodType,
                                  periodCommission: derived.periodCommission,
                                  retroactiveAdjustment: derived.retroactiveAdjustment,
                                  extraBonusPeriod: derived.extraBonusPeriodAmount,
                                  subTotal: derived.subTotalCommission,
                                  totalAmount: derived.totalAmount,
                                  vatAmount: derived.vatAmount,
                                  totalWithVat: derived.totalAmountWithVat,
                                }
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phần 0–4 + Tổng kết — bảng 4 cột (nhãn | CĐT đề nghị | MV ghi nhận | Đối chiếu). */}
                <ReconConfigTable
                  index={index}
                  item={item}
                  mv={mv}
                  derived={derived}
                  disabled={disabled}
                  showExtra={showExtra}
                  showAprime={false}
                  priorPaymentProgressPct={null}
                  priorExtraProgressPct={null}
                  // Tiến độ F2 kế thừa từ CĐT cha (readonly, không có trong payload) ⇒ khóa, không cho sửa.
                  inheritedReadOnly
                  // Lũy kế giảm trừ các kỳ F2 đã duyệt (từ lịch sử F2, pre-VAT). saleSplit=false nên
                  // chỉ hint tổng "Giảm trừ khác" render (dòng trừ lương Sale bị ẩn).
                  priorDeduction={
                    !historySummary.isLoading && (selectedDeal?.dealId ?? 0) > 0
                      ? {
                          total: historySummary.confirmedFeeDeductionTotal,
                          toSale: historySummary.confirmedFeeDeductionToSaleTotal,
                        }
                      : undefined
                  }
                />

                {/* Ghi chú căn — mirror CĐT: view = text thường ("—" khi trống), edit = TextArea. */}
                <Flex direction="column" gap="1">
                  <label className="typo-body-sm-medium text-content-dark-2 flex items-center gap-1">
                    <IconPencilsimple size={12} />
                    Ghi chú căn
                  </label>
                  {isReadOnly ? (
                    <span className="typo-body-sm-regular text-content-dark-1 whitespace-pre-wrap">
                      {item.note?.trim() ? item.note : '—'}
                    </span>
                  ) : (
                    <TextArea
                      rows={2}
                      value={item.note ?? ''}
                      disabled={disabled}
                      onChange={(value) =>
                        setValue(`items.${index}.note`, value, { shouldDirty: true })
                      }
                      placeholder="Ghi chú cho căn này…"
                    />
                  )}
                </Flex>

                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="border-border-1 text-content-dark-2 hover:bg-background-2 typo-body-sm-medium flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed py-2 transition-colors"
                >
                  <IconCaretup size={14} />
                  Thu gọn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default F2ReconciliationLineCard
