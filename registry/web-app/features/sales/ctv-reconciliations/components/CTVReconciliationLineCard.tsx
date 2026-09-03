import { useState, type ComponentType } from 'react'
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
import { TextArea } from '@/components/ui'

import type {
  InvestorReconciliationSheetCreateItemValues,
  InvestorReconciliationSheetCreateValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import { RECON_PERIOD_TYPE_LABELS } from '@/features/sales/_shared/reconciliation/recon-period-type'
import { useReconMode } from '@/features/sales/_shared/reconciliation/ReconModeContext'
import {
  useReconLineDerived,
  type ReconServerComputed,
} from '@/features/sales/_shared/reconciliation/useReconLineDerived'
import { EMPTY_MV_REFERENCE } from '@/features/sales/_shared/reconciliation/recon-empty-reference'
import type { ReconSelectedDeal } from '@/features/sales/_shared/reconciliation/useReconDealSelect'
import { buildReconLineSummary } from '@/features/sales/_shared/reconciliation/recon-line-summary'
import ReconConfigTable from '@/features/sales/_shared/reconciliation/ReconConfigTable'
import ReconLineCardHeader from '@/features/sales/_shared/reconciliation/ReconLineCardHeader'
import { useReconHistorySummary } from '@/features/sales/_shared/reconciliation/useReconHistorySummary'
import ReconHistoryTable from '@/features/sales/_shared/reconciliation/ReconHistoryTable'

/**
 * CTV (Cộng tác viên) reconciliation line card — NGHIỆP VỤ Y HỆT F2: the canonical card tree
 * (header + period strip + single-value "MV ghi nhận" ConfigTable + ghi chú), driven by the canonical
 * line model. CHỈ XEM — số map thẳng từ BE (serverComputed), KHÔNG tính FE.
 *
 * Khác F2 (data-driven):
 * - MV reference = EMPTY_MV_REFERENCE: cột giá trị hiển thị số của chính dòng (item.*), CTV không có
 *   tỷ lệ MV→CTV riêng trong commission-config để đối chứng.
 * - "Lịch sử đối chiếu" inline đọc endpoint ctv-reconciliation-history theo DEAL (scope theo giao
 *   dịch, không theo mã căn → không lẫn đối chiếu của deal cũ đã hủy cọc).
 * - KHÔNG cảnh báo lệch (warningCountOverride=0), KHÔNG "Kiểm tra điều kiện tất toán" (config simple).
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

export interface CTVReconciliationLineCardProps {
  index: number
  item: InvestorReconciliationSheetCreateItemValues
  /** Selected deal subset (căn code, prices, dealId) resolved from the sheet rows. */
  selectedDeal: ReconSelectedDeal | undefined
  isSubmitting?: boolean
  loadDealOptions: (params: LoadOptionsParams) => Promise<LoadOptionsResult<SelectOption>>
  loadInitialDealOptions: (values: (string | number)[]) => Promise<SelectOption[]>
  /** FE-only "Đã xác nhận" review marker (lifted to the form). */
  verified: boolean
  onToggleVerified: () => void
  /** BE-computed totals của dòng (commission_before_vat/sub_total/total/total_with_vat) — hiển thị số BE. */
  serverComputed?: ReconServerComputed | null
}

function CTVReconciliationLineCard({
  index,
  item,
  selectedDeal,
  isSubmitting,
  loadDealOptions,
  loadInitialDealOptions,
  verified,
  onToggleVerified,
  serverComputed,
}: CTVReconciliationLineCardProps) {
  const { setValue } = useFormContext<InvestorReconciliationSheetCreateValues>()
  const { isReadOnly } = useReconMode()

  const disabled = isSubmitting || isReadOnly
  const inventoryId = item?.product_inventory_id
  const hasInventory = Number(inventoryId) > 0
  const periodType = item?.period_type ?? CTVReconciliationPeriod_type.normal_payment
  const PeriodIcon = PERIOD_ICON[periodType]

  // Mặc định thu gọn khi căn đã có (giống F2/CĐT — detail hiện card thu gọn, bung khi cần).
  const [expanded, setExpanded] = useState(() => !hasInventory)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Lịch sử đối chiếu CTV — endpoint ctv-reconciliation-history theo DEAL (preset 'ctv' ⇒
  // useReconHistorySummary tự chọn + adapt sang canonical). Scope theo deal để không lẫn deal cũ.
  const historySummary = useReconHistorySummary(selectedDeal?.dealId ?? 0)

  // CTV không có tỷ lệ MV→CTV đối chứng trong commission-config ⇒ EMPTY reference. Cột giá trị
  // "MV ghi nhận" hiển thị số của chính dòng (item.*). Số tổng (NET/Phải-thu) lấy thẳng từ serverComputed BE.
  const derived = useReconLineDerived(item, EMPTY_MV_REFERENCE, serverComputed, undefined, {
    paymentProgressToPct: null,
    extraProgressToPct: null,
    maxConfirmedProgressToPct: null,
    latestConfirmedAgreedTerms: null,
  })

  const summarySegments = buildReconLineSummary(item, derived, { includeExtraBonus: false })

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
        reconciledProgressPct={item.progress_to_pct}
        disabled={disabled}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((prev) => !prev)}
        verified={verified}
        onToggleVerified={onToggleVerified}
        // CTV KHÔNG hiển thị cảnh báo (đối chiếu CTV không có phần cảnh báo lệch) → ép 0 để ẩn badge.
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
          {/* COLLAPSED body: period chip + one-line summary. */}
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
                </Flex>

                {/* Inline lịch sử đối chiếu CTV — collapsible (mirror F2/CĐT, đọc endpoint CTV theo deal). */}
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
                        {/* View-only detail: phiếu đã lưu hiện như dòng lịch sử thật, không dòng "Đang lập" giả. */}
                        <ReconHistoryTable dealId={selectedDeal?.dealId ?? 0} currentRow={null} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phần 0–3 + Tổng kết — bảng 1 cột "MV ghi nhận" (simple profile valueOnly). */}
                <ReconConfigTable
                  index={index}
                  item={item}
                  mv={EMPTY_MV_REFERENCE}
                  derived={derived}
                  disabled={disabled}
                  showExtra={false}
                  showAprime={false}
                  priorPaymentProgressPct={null}
                  priorExtraProgressPct={null}
                  // Tiến độ CTV kế thừa từ CĐT cha (readonly, không có trong payload) ⇒ khóa.
                  inheritedReadOnly
                  // Lũy kế giảm trừ các kỳ CTV đã duyệt (từ lịch sử CTV, pre-VAT). saleSplit=false nên
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

                {/* Ghi chú căn — mirror F2/CĐT: view = text thường ("—" khi trống), edit = TextArea. */}
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

export default CTVReconciliationLineCard
