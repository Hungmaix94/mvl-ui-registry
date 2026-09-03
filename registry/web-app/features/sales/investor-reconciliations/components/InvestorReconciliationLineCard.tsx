import { useEffect, useRef, useState, type ComponentType } from 'react'
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

import type {
  InvestorReconciliationSheetCreateItemValues,
  InvestorReconciliationSheetCreateValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import { RECON_PERIOD_TYPE_LABELS } from '@/features/sales/_shared/reconciliation/recon-period-type'
import { useReconMode } from '@/features/sales/_shared/reconciliation/ReconModeContext'
import { useReconMvReference } from '@/features/sales/_shared/reconciliation/useReconMvReference'
import {
  useReconLineDerived,
  type ReconServerComputed,
} from '@/features/sales/_shared/reconciliation/useReconLineDerived'
import {
  resolveReconComputedDisplayState,
  type ReconComputedDisplayState,
} from '@/features/sales/_shared/reconciliation/recon-computed-display'
import {
  formatReconCheckDelta,
  formatReconCheckValue,
  reconCheckMismatches,
  type ReconCheck,
} from '@/features/sales/_shared/reconciliation/recon-server-check'
import { useReconHistorySummary } from '@/features/sales/_shared/reconciliation/useReconHistorySummary'
import { useReconPriorDeduction } from '@/features/sales/_shared/reconciliation/useReconPriorDeduction'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import type { ReconSelectedDeal } from '@/features/sales/_shared/reconciliation/useReconDealSelect'
import { buildReconLineSummary } from '@/features/sales/_shared/reconciliation/recon-line-summary'
import { hasReconExtraBonusSection } from '@/features/sales/_shared/reconciliation/recon-extra-section'
import ReconConfigTable from '@/features/sales/_shared/reconciliation/ReconConfigTable'
import ReconLineIssues from '@/features/sales/_shared/reconciliation/ReconLineIssues'
import ReconLineCardHeader from '@/features/sales/_shared/reconciliation/ReconLineCardHeader'
import ReconHistoryTable from '@/features/sales/_shared/reconciliation/ReconHistoryTable'
import InvestorBonusPrepaidNote from '@/features/sales/investor-reconciliations/components/InvestorBonusPrepaidNote'
import { TextArea } from '@/components/ui'

/**
 * 3-4px left border color keyed by period_type (blue/purple/orange/green/red).
 *
 * The design tokens are exposed as full-side utility classes (`.border-data-blue-default`) only —
 * there is no `border-l-{token}` side-specific variant generated — so we drive `border-left-color`
 * via the underlying CSS custom property instead of a Tailwind class (no hardcoded hex).
 */
const PERIOD_BORDER_VAR: Record<CTVReconciliationPeriod_type, string> = {
  [CTVReconciliationPeriod_type.normal_payment]: 'var(--color-data-blue-default)',
  [CTVReconciliationPeriod_type.progress_with_adjustment]: 'var(--color-data-purple-default)',
  [CTVReconciliationPeriod_type.adjustment_only]: 'var(--color-data-orange-default)',
  [CTVReconciliationPeriod_type.bonus_deduction]: 'var(--color-data-green-default)',
  [CTVReconciliationPeriod_type.cancellation]: 'var(--color-data-red-default)',
}

/**
 * Loại-kỳ strip color: light tint background (`-disabled` token) + tonal text (`-hover` token),
 * mirroring the mockup `.rf5-strip strip-{color}` (recon_UI.html V5/V6). Used for both the
 * expanded display strip and the collapsed mini chip.
 */
const PERIOD_STRIP_CLS: Record<CTVReconciliationPeriod_type, string> = {
  [CTVReconciliationPeriod_type.normal_payment]: 'bg-data-blue-disabled text-data-blue-hover',
  [CTVReconciliationPeriod_type.progress_with_adjustment]:
    'bg-data-purple-disabled text-data-purple-hover',
  [CTVReconciliationPeriod_type.adjustment_only]: 'bg-data-orange-disabled text-data-orange-hover',
  [CTVReconciliationPeriod_type.bonus_deduction]: 'bg-data-green-disabled text-data-green-hover',
  [CTVReconciliationPeriod_type.cancellation]: 'bg-data-red-disabled text-data-red-default',
}

/** Leading icon per loại kỳ (coins / layers / edit / target / warn — mirrors the mockup). */
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

/**
 * "Tùy chọn" pill toggle inside the loại-kỳ strip (mockup `.rf6-opt-tog`). On = red ring + tint;
 * off = neutral outline. Toggles the two optional V6 parts (Phí tăng thêm / Giá riêng Sale/F2).
 */
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

function money(value: number): string {
  return formatCurrencyVND(value, { maximumFractionDigits: 0 })
}

function signedMoney(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${money(Math.abs(value))}`
}

/** One stat cell in the "KỲ NÀY" KPI band (mockup `.rf5-head-bottom` flow item). */
function KpiCell({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'positive' | 'negative'
}) {
  return (
    <Flex direction="column" gap="0" className="min-w-0 shrink-0">
      <span
        className={cn(
          'typo-body-sm-semibold whitespace-nowrap',
          tone === 'positive'
            ? 'text-data-green-default'
            : tone === 'negative'
              ? 'text-semantic-danger-default'
              : 'text-content-dark-1'
        )}
      >
        {value}
      </span>
      <span className="typo-body-xs-regular text-content-dark-3 whitespace-nowrap uppercase">
        {label}
      </span>
    </Flex>
  )
}

export interface InvestorReconciliationLineCardProps {
  index: number
  item: InvestorReconciliationSheetCreateItemValues
  /** Selected deal subset (căn code, prices, rates) resolved from the deal cache by the parent. */
  selectedDeal: ReconSelectedDeal | undefined
  isSubmitting?: boolean
  isMetaEnabled: boolean
  loadDealOptions: (params: LoadOptionsParams) => Promise<LoadOptionsResult<SelectOption>>
  loadInitialDealOptions: (values: (string | number)[]) => Promise<SelectOption[]>
  onSelectDeal: (index: number, productInventoryId: number | undefined) => void
  onRemove: () => void
  canRemove: boolean
  /** Per-căn draft autosave (sheet-first). Absent → no "Lưu căn" action. */
  onSave?: () => void
  saveState?: 'new' | 'dirty' | 'saved' | 'saving'
  /** BE-computed totals — shown (via derived) once the căn is saved. */
  serverComputed?: ReconServerComputed
  /** BE recon_check — surfaces Khớp/Lệch issues on a saved căn. */
  reconCheck?: ReconCheck
  /** Phiếu đang xem/sửa — loại khỏi lũy kế lịch sử để không tự tham chiếu chính kỳ hiện tại. */
  excludeInvestorSheetId?: number | null
}

function InvestorReconciliationLineCard({
  index,
  item,
  selectedDeal,
  isSubmitting,
  isMetaEnabled,
  loadDealOptions,
  loadInitialDealOptions,
  onSelectDeal,
  onRemove,
  canRemove,
  onSave,
  saveState,
  serverComputed,
  reconCheck,
  excludeInvestorSheetId,
}: InvestorReconciliationLineCardProps) {
  const { setValue } = useFormContext<InvestorReconciliationSheetCreateValues>()
  const { mode, isReadOnly } = useReconMode()

  // FE chỉ HIỂN THỊ số do BE tính: có số BE = serverComputed.total_amount != null.
  const hasServerTotals = serverComputed?.total_amount != null
  const computedDisplayState: ReconComputedDisplayState = resolveReconComputedDisplayState(
    saveState,
    hasServerTotals,
    isReadOnly
  )

  const disabled = isSubmitting || !isMetaEnabled || isReadOnly
  const inventoryId = item?.product_inventory_id
  const hasInventory = Number(inventoryId) > 0
  const periodType = item?.period_type ?? CTVReconciliationPeriod_type.normal_payment
  const isCancel = periodType === CTVReconciliationPeriod_type.cancellation
  const PeriodIcon = PERIOD_ICON[periodType]

  // Default expanded for a brand-new empty card; collapse once a căn is chosen. The chevron toggles.
  const [expanded, setExpanded] = useState(() => !hasInventory)
  const [historyOpen, setHistoryOpen] = useState(false)
  // Khối cảnh báo (recon_check box / footer issues) — badge "Cảnh báo" ở header cuộn tới đây khi bấm.
  const warningSectionRef = useRef<HTMLDivElement | null>(null)

  const [showExtra, setShowExtra] = useState(() => hasReconExtraBonusSection(item))

  useEffect(() => {
    setShowExtra(hasReconExtraBonusSection(item))
  }, [
    item?.extra_bonus_pct,
    item?.extra_bonus_amount,
    item?.extra_bonus_progress_from_pct,
    item?.extra_bonus_progress_to_pct,
  ])
  const [showAprime, setShowAprime] = useState(() => item?.commission_fee_calculation_price != null)

  // MV ghi nhận lấy từ deal commission config (theo dealId của căn đã chọn). Giá lấy từ deal vì
  // commission-config không trả giá. dealId chưa resolve ⇒ EMPTY_REFERENCE (degrade như header chip).
  const mv = useReconMvReference(selectedDeal?.dealId, selectedDeal)

  // Load lịch sử NGAY khi resolve deal (eager) để header "Lịch sử đối chiếu" hiện tóm tắt kể cả lúc
  // thu gọn. Scope theo deal (không theo mã căn) để không lẫn đối chiếu của deal cũ đã hủy cọc.
  const historySummary = useReconHistorySummary(selectedDeal?.dealId ?? 0, {
    excludeInvestorSheetId,
  })

  // Lũy kế giảm trừ các kỳ đã duyệt (server-first, fallback lịch sử) — hint dưới ô "Giảm trừ khác".
  // Cả 2 query nguồn đã được fetch bởi mv/historySummary ở trên nên KHÔNG thêm request.
  const priorDeduction = useReconPriorDeduction(selectedDeal?.dealId, { excludeInvestorSheetId })

  const priorProgress = {
    // "Tiến độ đã đối chiếu các kỳ trước" + baseline tính HH = MAX tiến độ các kỳ ĐÃ DUYỆT (confirmed) — chốt
    // 2026-06-08. Khi edit, field đã lưu thắng (đọc từ progress_from_pct); baseline này chỉ dùng khi tạo mới.
    paymentProgressToPct: historySummary.maxConfirmedProgressToPct,
    extraProgressToPct: historySummary.latestExtraProgressToPct,
    maxConfirmedProgressToPct: historySummary.maxConfirmedProgressToPct,
    latestConfirmedAgreedTerms: historySummary.latestConfirmedAgreedTerms,
  }

  // Seed `extra_bonus_progress_from` từ lịch sử — tiến độ thanh toán chính do BE tính (progress_* readonly).
  useEffect(() => {
    if (isReadOnly || !hasInventory || historySummary.isLoading) return

    if (hasReconExtraBonusSection(item)) {
      const priorExtraTo = historySummary.latestExtraProgressToPct
      if (priorExtraTo != null && item.extra_bonus_progress_from_pct == null) {
        setValue(`items.${index}.extra_bonus_progress_from_pct`, priorExtraTo, {
          shouldDirty: false,
        })
      }
      const seededExtraFrom = item.extra_bonus_progress_from_pct ?? priorExtraTo
      if (seededExtraFrom != null && item.extra_bonus_progress_to_pct == null) {
        setValue(`items.${index}.extra_bonus_progress_to_pct`, seededExtraFrom, {
          shouldDirty: false,
        })
      }
    }
  }, [
    isReadOnly,
    hasInventory,
    historySummary.isLoading,
    historySummary.latestExtraProgressToPct,
    item.extra_bonus_progress_from_pct,
    item.extra_bonus_progress_to_pct,
    item.extra_bonus_pct,
    item.extra_bonus_amount,
    index,
    setValue,
  ])

  // Seed "Tổng phí tăng thêm (thỏa thuận)" từ kỳ trước — phí tăng thêm thỏa thuận là cam kết TRỌN GÓI
  // của căn nên mang sang đợt sau, vẫn cho sửa. Chỉ chạy khi TẠO MỚI & chưa nhập gì; one-shot theo căn
  // (ref) để không đè lại sau khi user tự xóa/tắt. EDIT/XEM giữ nguyên giá trị đã lưu (kỳ đã lưu không
  // có phí ⇒ không tự thêm). Theo yêu cầu 2026-06-15.
  const seededExtraFeeForInventory = useRef<number | null>(null)
  useEffect(() => {
    if (mode !== 'create' || !hasInventory || historySummary.isLoading) return
    const invId = Number(inventoryId)
    if (seededExtraFeeForInventory.current === invId) return

    const priorFee = historySummary.latestExtraAgreedFee
    const untouched = item.extra_bonus_amount == null && item.extra_bonus_pct == null
    if (priorFee != null && untouched) {
      // ₫ trọn gói và % loại trừ nhau (schema XOR) — ưu tiên ₫ khi kỳ trước nhập ₫.
      if (priorFee.extraBonusAmount != null) {
        setValue(`items.${index}.extra_bonus_amount`, priorFee.extraBonusAmount, {
          shouldDirty: false,
        })
      } else if (priorFee.extraBonusPct != null) {
        setValue(`items.${index}.extra_bonus_pct`, priorFee.extraBonusPct, { shouldDirty: false })
      }
      setValue(`items.${index}.is_extra_bonus_include_vat`, priorFee.isExtraBonusIncludeVat, {
        shouldDirty: false,
      })
      setShowExtra(true)
    }
    seededExtraFeeForInventory.current = invId
  }, [
    mode,
    hasInventory,
    inventoryId,
    historySummary.isLoading,
    historySummary.latestExtraAgreedFee,
    item.extra_bonus_amount,
    item.extra_bonus_pct,
    index,
    setValue,
  ])

  // D1: chỉ "biết chắc chưa có lịch sử" khi đã chọn căn & tải xong & rỗng → false; còn lại undefined
  // (chưa chọn căn / đang tải) để không báo "không thể điều chỉnh" nhầm.
  const hasPriorHistory =
    hasInventory && !historySummary.isLoading ? historySummary.hasHistory : undefined
  // Hiện số BE bất cứ khi nào căn ĐÃ TỪNG có số BE (saved → hiện; dirty/saving → số cũ dưới backdrop).
  // Căn chưa từng xác nhận (không có serverComputed) → nhóm số bị ẩn.
  const effectiveServerComputed = hasServerTotals ? serverComputed : undefined
  const derived = useReconLineDerived(
    item,
    mv,
    effectiveServerComputed,
    hasPriorHistory,
    priorProgress
  )
  // Khi chưa bật tùy chọn "Phí tăng thêm" (showExtra=false), bỏ cảnh báo recon_check của field phí
  // tăng thêm (extra_bonus_*) — user không dùng phần này nên lệch của nó là nhiễu, không liên quan.
  // Khối "Lệch so với MV đang ghi nhận" (recon_check BE) hiện ở căn ĐÃ LƯU (edit) HOẶC màn chi tiết (view).
  // Ở view hiện đủ mọi mismatch primary (tin BE); ở edit vẫn lọc bớt extra_bonus khi user tắt phần đó.
  const reconMismatches = (
    saveState === 'saved' || isReadOnly ? reconCheckMismatches(reconCheck) : []
  ).filter(
    (m) =>
      isReadOnly || showExtra || (m.field !== 'extra_bonus_pct' && m.field !== 'extra_bonus_amount')
  )
  // Tránh cảnh báo 2 lần: khi đã có khối "Lệch so với MV đang ghi nhận" (BE recon_check, kèm số lệch cụ
  // thể) thì bỏ các advisory FE TRÙNG nội dung (lệch giá / %HH so cấu hình) khỏi footer. Các lưu ý
  // khác (chênh lệch thanh toán, kỳ điều chỉnh thiếu lịch sử…) không nằm trong recon_check nên giữ.
  // Màn chi tiết (view/approval): KHÔNG hiện advisory FE (so sánh giá / %HH / TT do FE tự tính) —
  // đối chiếu Khớp/Lệch CHỈ lấy từ recon_check của BE (cột "Đối chiếu" trong bảng cấu hình).
  const displayIssues = isReadOnly
    ? []
    : reconMismatches.length > 0
      ? derived.issues.filter(
          (issue) => issue.code !== 'price_drift' && issue.code !== 'agency_fee_mismatch'
        )
      : derived.issues

  // (Đã gỡ) FE không còn tự tính & ghi retroactive_adjustment_amount. BE tính & trả readonly khi "Xác
  // nhận đối chiếu"; FE không gửi field này ở create lẫn patch. Xem plan 2026-06-22.

  const summarySegments = buildReconLineSummary(item, derived)

  // Badge cảnh báo ở header: mở căn rồi cuộn tới khối cảnh báo (chờ animation expand ~350ms).
  const handleWarningBadgeClick = () => {
    setExpanded(true)
    window.setTimeout(() => {
      warningSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 350)
  }

  // Bấm tiêu đề trong khối "Lệch so với MV đang ghi nhận" → cuộn mượt tới dòng tương ứng (canh giữa màn
  // hình). Một số field recon_check dùng chung dòng cấu hình ⇒ quy về anchor canonical.
  const handleMismatchClick = (field: string) => {
    const canonical =
      field === 'amt_agency_fee' || field === 'is_agency_fee_include_vat'
        ? 'pct_agency_fee'
        : field === 'extra_bonus_pct'
          ? 'extra_bonus_amount'
          : field === 'is_shared_bonus_include_vat'
            ? 'shared_bonus_amount'
            : field
    const scrollToRow = () =>
      document
        .getElementById(`recon-row-${index}-${canonical}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (expanded) {
      scrollToRow()
    } else {
      setExpanded(true)
      window.setTimeout(scrollToRow, 350)
    }
  }

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

  const handleToggleAprime = (checked: boolean) => {
    setShowAprime(checked)
    if (!checked) {
      setValue(`items.${index}.commission_fee_calculation_price`, null, { shouldDirty: true })
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
        reconciledProgressPct={historySummary.latestConfirmedProgressToPct}
        baseAgencyFeeRate={mv.baseAgencyFeeRate}
        baseReconciledProgressPct={historySummary.latestConfirmedBaseProgressToPct}
        aggregateAgencyFeeRate={mv.pctAgencyFee}
        disabled={disabled}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((prev) => !prev)}
        onSave={onSave}
        saveState={saveState}
        computedDisplayState={computedDisplayState}
        onBadgeClick={handleWarningBadgeClick}
        warningCountOverride={isReadOnly ? reconMismatches.length : null}
        loadDealOptions={loadDealOptions}
        loadInitialDealOptions={loadInitialDealOptions}
        onSelectDeal={onSelectDeal}
        onRemove={onRemove}
        canRemove={canRemove}
      />

      {!hasInventory ? (
        <span className="typo-body-sm-regular text-content-dark-3">
          Chọn mã HĐ / căn để nhập thông tin đối chiếu.
        </span>
      ) : (
        // Thu gọn ↔ mở rộng: cross-fade chiều cao bằng grid-rows (0fr↔1fr) cho mượt, không giật cục.
        <div>
          {/* COLLAPSED body: period chip + one-line summary + warning line (hiện khi thu gọn). */}
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
                  {computedDisplayState === 'shown' && summarySegments.length > 0 && (
                    <span className="typo-body-sm-regular text-content-dark-2">
                      {summarySegments.join(' · ')}
                    </span>
                  )}
                </Flex>
                <ReconLineIssues issues={displayIssues} />
              </Flex>
            </div>
          </div>

          {/* EXPANDED body: strip + lịch sử + ConfigTable + settlement + neg + ghi chú (hiện khi mở rộng). */}
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
                {/* KỲ NÀY — KPI band: CHỈ số do BE tính. Ẩn khi chưa xác nhận; backdrop khi input đổi. */}
                {computedDisplayState !== 'hidden' && (
                  <div className="relative">
                    <Flex
                      align="center"
                      gap="5"
                      wrap="wrap"
                      className={cn(
                        'bg-background-2 border-border-1 rounded-md border px-4 py-3',
                        computedDisplayState === 'stale' && 'opacity-40'
                      )}
                    >
                      <KpiCell
                        label="Tỷ lệ phí đại lý"
                        value={
                          item.amt_agency_fee != null
                            ? `${money(item.amt_agency_fee)} đ`
                            : formatPercent(item.pct_agency_fee ?? 0)
                        }
                      />
                      <KpiCell
                        label="Tiến độ ĐC kỳ này"
                        value={`${formatPercent(item.progress_from_pct ?? 0)} → ${formatPercent(
                          item.progress_to_pct ?? 0
                        )}`}
                      />
                      <KpiCell label="Phí đại lý" value={signedMoney(derived.periodCommission)} />
                      {derived.retroactiveAdjustment !== 0 && (
                        <KpiCell
                          label="Truy hồi"
                          value={signedMoney(derived.retroactiveAdjustment)}
                          tone={derived.retroactiveAdjustment < 0 ? 'negative' : 'default'}
                        />
                      )}
                      {Number(item.shared_bonus_period_amount) > 0 && (
                        <KpiCell
                          label="Thưởng"
                          value={signedMoney(Number(item.shared_bonus_period_amount))}
                        />
                      )}
                      {Number(item.fee_deduction) > 0 && (
                        <KpiCell
                          label="Khấu trừ"
                          value={signedMoney(-Number(item.fee_deduction))}
                          tone="negative"
                        />
                      )}
                      {derived.extraBonusPeriodAmount !== 0 && (
                        <KpiCell
                          label="Phí tăng thêm"
                          value={signedMoney(derived.extraBonusPeriodAmount)}
                        />
                      )}
                      <Flex direction="column" align="end" gap="0" className="ml-auto min-w-0">
                        <span
                          className={cn(
                            'typo-h6 whitespace-nowrap',
                            derived.receivableInclusive >= 0
                              ? 'text-data-green-default'
                              : 'text-semantic-danger-default'
                          )}
                        >
                          {signedMoney(derived.receivableInclusive)}
                        </span>
                        <span className="typo-body-xs-regular text-content-dark-3 whitespace-nowrap uppercase">
                          Tiền nhận kỳ này (đã gồm VAT)
                        </span>
                      </Flex>
                    </Flex>
                    {computedDisplayState === 'stale' && (
                      <div className="bg-background-1/70 absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md">
                        <span className="typo-body-sm-semibold text-data-orange-hover flex items-center gap-1">
                          <IconWarning size={14} />
                          Số liệu chưa cập nhật — cần lưu căn lại
                        </span>
                        {onSave && (
                          <button
                            type="button"
                            onClick={onSave}
                            disabled={disabled}
                            className="typo-body-sm-medium border-content-dark-2 text-content-dark-1 hover:bg-background-2 inline-flex cursor-pointer items-center gap-1 rounded-md border px-3 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Lưu căn
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Loại kỳ — display-only colored strip (kind is chosen at add time via "+ Thêm căn ▾").
              The two "Tùy chọn" pills toggle the optional V6 parts (Phí tăng thêm / Giá riêng Sale/F2).
              Mirrors mockup `.rf5-strip` + `.rf6-opts`. */}
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
                  {!isCancel && (
                    <Flex align="center" gap="2" wrap="wrap" className="ml-auto">
                      <span className="typo-body-xs-semibold text-content-dark-3 uppercase">
                        Tùy chọn:
                      </span>
                      <OptToggle
                        on={showExtra}
                        disabled={disabled}
                        onClick={() => handleToggleExtra(!showExtra)}
                        label="Phí tăng thêm"
                        title="Bật để nhập & theo dõi phí tăng thêm với tiến độ riêng"
                      />
                      <OptToggle
                        on={showAprime}
                        disabled={disabled}
                        onClick={() => handleToggleAprime(!showAprime)}
                        label="Giá riêng Sale/F2"
                        title="Chỉ tính HH Sale nội bộ & F2; không ảnh hưởng đối chiếu CĐT"
                      />
                    </Flex>
                  )}
                </Flex>

                {/* Inline lịch sử đối chiếu — collapsible (mockup: lịch sử ở đầu body, trước bảng cấu hình). */}
                <div className="border-border-1 rounded-md border">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen((prev) => !prev)}
                    className="hover:bg-background-2 typo-body-sm-medium text-content-dark-2 flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 transition-colors"
                    aria-expanded={historyOpen}
                  >
                    <IconStacksimple size={15} />
                    <span className="shrink-0">Lịch sử đối chiếu</span>
                    {/* Tóm tắt từ lịch sử đã load eager — hiện cả khi mục đang thu gọn. */}
                    {!historySummary.isLoading &&
                      (historySummary.hasHistory ? (
                        <span className="typo-body-sm-regular text-content-dark-3 truncate">
                          {/* "Lũy kế {tổng} đ" cũ do FE TỰ CỘNG (Σ total_amount_with_vat) ⇒ ĐÃ BỎ.
                              BE chưa có field tổng lũy kế trên history — cần BE bổ sung nếu muốn hiện lại. */}
                          {historySummary.count} lần · Đã ĐC{' '}
                          {formatPercent(historySummary.latestConfirmedProgressToPct ?? 0)}
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
                  {/* Mở/đóng mượt bằng grid-rows 0fr↔1fr (cùng pattern thu gọn body của card) —
                      animate chiều cao mà không cần biết trước content height. ReconHistoryTable luôn
                      mounted (query lịch sử đã fetch eager + dedupe với summary) nên không thêm call. */}
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
                          // Màn xem chi tiết (read-only): KHÔNG loại phiếu đang xem khỏi lịch sử và KHÔNG
                          // tổng hợp dòng "Đang lập" giả — phiếu đã LƯU nên hiện như 1 dòng lịch sử thật
                          // với trạng thái thật (Đã xác nhận / Chờ duyệt…). "Đang lập" chỉ hợp lý khi
                          // tạo/sửa (preview input chưa lưu). Header tóm tắt vẫn dùng exclude riêng nên
                          // "Đã ĐC %" không đổi.
                          excludeInvestorSheetId={isReadOnly ? null : excludeInvestorSheetId}
                          currentRow={
                            isReadOnly || isCancel || computedDisplayState !== 'shown'
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
                                  sharedBonusPrepaidAmount: derived.sharedBonusPrepaidAmount,
                                  amountToCollect: derived.amountToCollect,
                                }
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tạm ứng thưởng bổ sung CĐT của deal (fe-guide §4.6) — hiện NGAY khi resolve deal,
                    trước cả khi tạo dòng; tự ẩn khi unrecognised = 0. Chỉ ở form tạo/sửa: detail đã
                    có số cấn chốt per-line trong bảng tổng. */}
                {!isReadOnly && <InvestorBonusPrepaidNote dealId={selectedDeal?.dealId} />}

                {/* Phần 0–4 + Tổng kết — bảng 4 cột (nhãn | CĐT đề nghị | MV ghi nhận | Đối chiếu).
                    "Số tiền đối chiếu kỳ này" chỉ hiện khi căn đã xác nhận & khớp (số BE). */}
                <ReconConfigTable
                  index={index}
                  item={item}
                  mv={mv}
                  derived={derived}
                  disabled={disabled}
                  showExtra={showExtra}
                  showAprime={showAprime}
                  priorPaymentProgressPct={historySummary.maxConfirmedProgressToPct}
                  priorExtraProgressPct={historySummary.latestExtraProgressToPct}
                  showComputedTotals={computedDisplayState === 'shown'}
                  reconCheck={computedDisplayState === 'shown' ? reconCheck : undefined}
                  priorDeduction={
                    !priorDeduction.isLoading && (selectedDeal?.dealId ?? 0) > 0
                      ? { total: priorDeduction.total, toSale: priorDeduction.toSale }
                      : undefined
                  }
                />

                {/* TODO(recon BE-driven): "Kiểm tra điều kiện tất toán" ẩn tạm — response /lines/ chưa có
                    field settlement; FE không tự tính. Bật lại khi BE bổ sung khối settlement. Plan 2026-06-22. */}

                {/* Net âm — quy tắc chốt 2026-06-20 (OQ-4): KHÔNG còn chọn hoàn tiền / bù trừ kỳ sau
                    per-căn. Căn âm tự cấn trừ với các căn khác trong cùng phiếu; chỉ khi TỔNG phiếu âm
                    mới xuất hóa đơn điều chỉnh giảm (xử lý ở footer/confirm phiếu). Ở đây chỉ hiện note
                    nhắc. Ẩn ở kỳ hủy cọc. */}
                {computedDisplayState === 'shown' && derived.totalAmount < 0 && !isCancel && (
                  <Flex
                    align="start"
                    gap="2"
                    className="bg-data-orange-disabled text-data-orange-hover rounded-md px-3 py-2"
                  >
                    <IconWarning size={15} className="mt-0.5 shrink-0" />
                    <span className="typo-body-sm-regular">
                      Căn này âm (
                      {formatCurrencyVND(derived.totalAmount, { maximumFractionDigits: 0 })} đ). Sẽ
                      tự cấn trừ với các căn khác trong phiếu; nếu tổng cả phiếu âm, phiếu sẽ xuất
                      hóa đơn điều chỉnh giảm.
                    </span>
                  </Flex>
                )}

                {/* Ghi chú căn */}
                <Flex direction="column" gap="1">
                  <label className="typo-body-sm-medium text-content-dark-2 flex items-center gap-1">
                    <IconPencilsimple size={12} />
                    Ghi chú căn
                  </label>
                  {isReadOnly ? (
                    // Màn chi tiết: hiện ghi chú dạng text thường; trống thì hiện "—", KHÔNG render ô disabled.
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
                      placeholder="Breakdown thưởng / lý do khấu trừ / lý do đổi giá / ghi chú chung cho căn này…"
                    />
                  )}
                </Flex>

                {/* Đối chiếu vs cấu hình MV (BE recon_check) — chỉ hiện trên căn ĐÃ LƯU, ĐẶT DƯỚI Ghi
                    chú căn. Mỗi field lệch: nhãn đậm + "CDT ghi nhận / MV ghi nhận / Lệch" format theo đơn vị. */}
                {reconMismatches.length > 0 && (
                  <Flex
                    ref={warningSectionRef}
                    direction="column"
                    gap="2"
                    className="bg-data-orange-disabled scroll-mt-4 rounded-md px-3 py-2.5"
                  >
                    <span className="typo-body-sm-semibold text-data-orange-hover flex items-center gap-1">
                      <IconWarning size={14} />
                      Lệch so với MV đang ghi nhận ({reconMismatches.length})
                    </span>
                    <div className="flex flex-col gap-2">
                      {reconMismatches.map((m) => {
                        const deltaLabel = formatReconCheckDelta(m.field, m.delta)
                        return (
                          <div
                            key={m.field}
                            className="border-data-orange-default flex flex-col gap-1 border-l-2 pl-2"
                          >
                            <button
                              type="button"
                              onClick={() => handleMismatchClick(m.field)}
                              title={`Cuộn tới "${m.label}" trong bảng đối chiếu`}
                              className="typo-body-sm-medium text-content-dark-1 hover:text-data-orange-hover w-fit cursor-pointer text-left underline-offset-2 hover:underline"
                            >
                              {m.label}
                            </button>
                            <Flex
                              align="center"
                              gap="2"
                              wrap="wrap"
                              className="typo-body-xs-regular"
                            >
                              <span className="text-content-dark-3">
                                Nhập{' '}
                                <b className="text-content-dark-1">
                                  {formatReconCheckValue(m.field, m.submitted)}
                                </b>
                              </span>
                              <span className="text-content-dark-4">·</span>
                              <span className="text-content-dark-3">
                                Cấu hình MV{' '}
                                <b className="text-content-dark-1">
                                  {formatReconCheckValue(m.field, m.mv_config)}
                                </b>
                              </span>
                              {deltaLabel && (
                                <span className="border-data-orange-default text-data-orange-hover bg-background-1 typo-body-xs-semibold rounded-full border px-2 py-0.5">
                                  Lệch {deltaLabel}
                                </span>
                              )}
                            </Flex>
                          </div>
                        )
                      })}
                    </div>
                  </Flex>
                )}

                {/* Cảnh báo / lưu ý (advisory issues) — footer tô màu theo severity. Khi KHÔNG có box
                    recon_check, footer này là khối cảnh báo → nhận ref để badge header cuộn tới.
                    TODO(recon BE-driven): advisory trên input — giữ; có thể thay bằng recon_check BE sau. Plan 2026-06-22. */}
                <div
                  ref={reconMismatches.length > 0 ? undefined : warningSectionRef}
                  className="scroll-mt-4"
                >
                  <ReconLineIssues issues={displayIssues} />
                </div>

                {/* Nút thu gọn ở cuối card — tiện cho card dài, khỏi cuộn ngược lên chevron ở header. */}
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

export default InvestorReconciliationLineCard
