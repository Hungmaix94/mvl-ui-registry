import { useEffect, useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { Link, generatePath } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { TriangleAlert } from 'lucide-react'

import { Select } from '@/components/ui'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import { IconCaretdown, IconCaretup } from '@/assets/icons/arrows'
import { IconCheck } from '@/assets/icons/system-devices'
import { IconTrashsimple } from '@/assets/icons/office-editing'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { cn } from '@/utils'

import type {
  InvestorReconciliationSheetCreateItemValues,
  InvestorReconciliationSheetCreateValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import type { ReconLineDerived } from '@/features/sales/_shared/reconciliation/useReconLineDerived'
import type { ReconComputedDisplayState } from '@/features/sales/_shared/reconciliation/recon-computed-display'
import type { ReconSelectedDeal } from '@/features/sales/_shared/reconciliation/useReconDealSelect'
import { useReconMode } from '@/features/sales/_shared/reconciliation/ReconModeContext'
import { useReconKind } from '@/features/sales/_shared/reconciliation/ReconKindContext'
import { IconWarning, IconPencilsimple } from '@/assets/icons'

function money(value: number): string {
  return formatCurrencyVND(value, { maximumFractionDigits: 0 })
}

function signedMoney(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${money(Math.abs(value))}`
}

function formatHdmbSuffix(
  flatFee: number | null | undefined,
  pct: number | null | undefined
): string {
  if (flatFee != null) return ` × ${money(flatFee)}`
  if (pct == null) return ''
  // Giá trị lớn hơn 100 thường là phí cố định (VND), không phải %
  if (pct > 100) return ` × ${money(pct)}`
  return ` × ${formatPercent(pct)}`
}

export interface ReconLineCardHeaderProps {
  index: number
  item: InvestorReconciliationSheetCreateItemValues
  derived: ReconLineDerived
  selectedDeal: ReconSelectedDeal | undefined
  /**
   * Tiến độ đã đối chiếu lũy kế (%) — LẤY TỪ LỊCH SỬ (latestProgressToPct), cùng nguồn với thanh
   * "Lịch sử đối chiếu" để hai chỗ luôn khớp. Deal.reconciliationRate chỉ là fallback khi chưa có
   * lịch sử (field deal có thể chưa sync với các kỳ đối chiếu đã lưu → trước đây hiện sai 0%).
   */
  reconciledProgressPct?: number | null
  /** BASE rate (config creation, neo outflow) — dải BASE/TỔNG HỢP trên header. null ⇒ ẩn dải. */
  baseAgencyFeeRate?: number | null
  /**
   * Tiến độ lũy kế quy theo phí BASE (%) — BE tính `base_progress_to_pct` (map qua history summary).
   * Hiện "ĐC base <%>" cạnh dải "Base <%>". null ⇒ chỉ hiện tỷ lệ base, không hiện tiến độ.
   */
  baseReconciledProgressPct?: number | null
  /** %HH hiện hành (config current / TỔNG HỢP). Fallback item/deal khi null. */
  aggregateAgencyFeeRate?: number | null
  disabled?: boolean
  expanded: boolean
  onToggleExpanded: () => void
  /** Per-căn draft autosave. Absent → no save badge/button in the action group. */
  onSave?: () => void
  saveState?: 'new' | 'dirty' | 'saved' | 'saving'
  /** Nhãn nút lưu căn. Default 'Lưu căn' (dùng chung F2 + investor). */
  saveActionLabel?: string
  /**
   * Trạng thái hiển thị số BE của căn (investor). `shown` (default) giữ nguyên hành vi cũ (F2):
   * `hidden` ẩn "Tiền nhận kỳ này"; `stale` hiện "Chưa xác nhận lại".
   */
  computedDisplayState?: ReconComputedDisplayState
  /** FE-only review marker (F2). Absent (investor) → không hiện nút "Xác nhận đối chiếu" thủ công. */
  verified?: boolean
  onToggleVerified?: () => void
  /** Bấm badge Cảnh báo/Lỗi → mở căn + cuộn tới khối cảnh báo. Absent (F2) → badge tĩnh, không bấm. */
  onBadgeClick?: () => void
  /**
   * Số cảnh báo TỪ recon_check của BE (màn chi tiết). Khi truyền (≠ null), badge "Cảnh báo" dựa vào
   * số này thay vì advisory FE (derived.issues) — đồng bộ với khối "Lệch so với MV đang ghi nhận". null ⇒
   * dùng advisory FE (edit/create).
   */
  warningCountOverride?: number | null
  loadDealOptions: (params: LoadOptionsParams) => Promise<LoadOptionsResult<SelectOption>>
  loadInitialDealOptions: (values: (string | number)[]) => Promise<SelectOption[]>
  onSelectDeal: (index: number, productInventoryId: number | undefined) => void
  onRemove: () => void
  canRemove: boolean
  /**
   * Lock the mã-căn Select while keeping the rest of the line editable (F2/CTV: căn is fixed by the
   * generated row, but commission/fee fields stay editable). Default false ⇒ investor unchanged.
   */
  productLocked?: boolean
  /**
   * Chuỗi hiển thị đè cho hậu tố "× tỷ lệ" trên dải giá header. F2 truyền công thức phân số
   * ("num/den của base") hoặc số MV đã resolve khi dòng đối chiếu chưa mang số phẳng (BE để 0/null với
   * cấu hình phân số/số tiền cố định). Bỏ trống ⇒ tự suy từ item.pct_agency_fee/amt_agency_fee như cũ.
   */
  agencyFeeChipText?: string | null
}

/**
 * Always-visible collapsed header row for a reconciliation line card (Đợt 1 #5).
 *
 * Desktop (md+): một hàng trái/phải như layout gốc.
 * Mobile: xếp 3 hàng để tránh tràn ngang.
 */
function ReconLineCardHeader({
  index,
  item,
  derived,
  selectedDeal,
  reconciledProgressPct,
  baseAgencyFeeRate,
  baseReconciledProgressPct,
  disabled,
  expanded,
  onToggleExpanded,
  onSave,
  saveState,
  saveActionLabel = 'Lưu căn',
  computedDisplayState = 'shown',
  verified,
  onToggleVerified,
  onBadgeClick,
  warningCountOverride,
  loadDealOptions,
  loadInitialDealOptions,
  onSelectDeal,
  onRemove,
  canRemove,
  productLocked,
  agencyFeeChipText,
}: ReconLineCardHeaderProps) {
  const { control } = useFormContext<InvestorReconciliationSheetCreateValues>()
  const { isReadOnly } = useReconMode()
  // CTV (taxMode 'pit'): header summary hiện "Thực nhận sau thuế" (sau TNCN) thay vì "Tiền nhận (gồm VAT)".
  const { taxMode } = useReconKind()
  const isPit = taxMode === 'pit'
  const ability = useAbility()

  const hasInventory = Number(item?.product_inventory_id) > 0
  const productCode = selectedDeal?.productUnitNumber || selectedDeal?.productCode
  // Giá hiển thị ở header = GIÁ TÍNH PHÍ (fee_calculation_price) của căn — số thực dùng tính HH, đồng bộ
  // dòng "Giá tính phí (HĐMB)" trong bảng cấu hình; KHÔNG dùng listed_price của deal (giá HĐMB) nữa
  // (yêu cầu 2026-06-24). Edit/view: item luôn có fee_calculation_price; 0/thiếu ⇒ ẩn dải giá.
  const feeCalcPrice = Number(item?.fee_calculation_price) || null
  const pctForChip = item?.pct_agency_fee ?? selectedDeal?.agencyFeeRate ?? null
  const flatFeeForChip = item?.amt_agency_fee ?? null
  // Ưu tiên chuỗi đè (F2: công thức phân số / số MV đã resolve) để không hiện nhầm "× 0%" khi dòng
  // đối chiếu chưa mang số phẳng; ngược lại suy từ item như cũ (CĐT không truyền ⇒ giữ nguyên).
  const hdmbSuffix = agencyFeeChipText
    ? ` × ${agencyFeeChipText}`
    : formatHdmbSuffix(flatFeeForChip, pctForChip)
  // Ưu tiên tiến độ đã đối chiếu từ lịch sử (khớp thanh "Lịch sử đối chiếu"); deal rate chỉ fallback.
  const reconciledPct = reconciledProgressPct ?? selectedDeal?.reconciliationRate ?? null

  // BASE / TỔNG HỢP (dải header). BASE = phí gốc (config creation, neo outflow); TỔNG HỢP = phí CĐT
  // hiện hành (inflow). base cumulative = min(100, target_prog × current_rate / base_rate) (OQ-G4).
  const baseRate = baseAgencyFeeRate ?? null
  const showBaseChips = hasInventory && baseRate != null
  // "Base <%>" = %HH gốc theo cấu hình (BE). "ĐC base <%>" = tiến độ lũy kế quy theo phí base — LẤY THẲNG
  // từ BE (`base_progress_to_pct` qua history summary), KHÔNG còn FE tự tính (reconciledPct×aggregate/base).
  const baseReconciledPct = baseReconciledProgressPct ?? null
  const baseChips = showBaseChips ? (
    <>
      <span className="text-content-dark-4 shrink-0">·</span>
      <span className="typo-body-xs-regular text-content-dark-3 shrink-0 whitespace-nowrap">
        Base <span className="text-content-dark-2">{formatPercent(baseRate ?? 0)}</span>
        {baseReconciledPct != null && (
          <>
            {' · '}ĐC base{' '}
            <span className="text-content-dark-2">{formatPercent(baseReconciledPct)}</span>
          </>
        )}
      </span>
    </>
  ) : null
  // Header summary "Tiền nhận kỳ này":
  // - VAT (CĐT/F2): số ĐÃ GỒM VAT (derived.receivableInclusive) + dòng phụ "NET: …" khi bật VAT.
  // - PIT (CTV): "Thực nhận sau thuế" (derived.totalAmountAfterPit, số BE) + dòng phụ "Trước thuế: …".
  const receivedAmount = isPit ? derived.totalAmountAfterPit : derived.receivableInclusive
  const netLabel = signedMoney(receivedAmount)
  const hasVat = !isPit && item.vat_rate != null
  // NET/Tổng trước thuế per-field — dùng chung nguồn với config table & footer.
  const netExtractedLabel = signedMoney(derived.netAmount)
  const summaryTopLabel = isPit
    ? 'Thực nhận sau thuế'
    : `Tiền nhận kỳ này ${hasVat ? '(đã gồm VAT)' : '(NET)'}`
  // Dòng phụ dưới số tổng: PIT ⇒ "Trước thuế: …"; VAT bật cờ ⇒ "NET: …"; còn lại ⇒ ẩn.
  const summarySubLine = isPit
    ? `Trước thuế: ${netExtractedLabel}`
    : hasVat
      ? `NET: ${netExtractedLabel}`
      : null

  // Màn chi tiết (view): cảnh báo dựa trên recon_check của BE (warningCountOverride) — KHÔNG dùng
  // advisory FE (derived.issues). Edit/create (override = null): giữ advisory FE như cũ.
  const hasError =
    warningCountOverride != null ? false : derived.issues.some((issue) => issue.severity === 'err')
  const hasWarning =
    warningCountOverride != null ? warningCountOverride > 0 : !hasError && derived.issues.length > 0
  const netTone = receivedAmount >= 0 ? 'text-data-green-default' : 'text-semantic-danger-default'

  // Màn chi tiết (view): KHÔNG render Select disabled — hiện mã HĐ/GD dạng text; cho ấn mở chi tiết
  // GIAO DỊCH (deal detail) ở tab mới nếu có quyền `deal.retrieve`. Edit/create giữ Select như cũ.
  //
  // View bỏ Select ⇒ mất cơ chế Select tự gọi loadInitialDealOptions (vốn resolve mã HĐ + nạp cache
  // selectedDeal). Tự kích hoạt ở đây: lấy nhãn dự phòng (mã HĐ / mã căn) + để resolveInitial nạp
  // cache (header re-render qua resolvedTick) ⇒ khi có dealId thì hiện link. Memo hoá ⇒ 1 request/căn.
  const [resolvedDealLabel, setResolvedDealLabel] = useState<string | null>(null)
  useEffect(() => {
    if (!isReadOnly || !hasInventory || !item?.product_inventory_id) return
    let alive = true
    void loadInitialDealOptions([item.product_inventory_id]).then((opts) => {
      const label = opts?.[0]?.label
      if (alive && label) setResolvedDealLabel(String(label))
    })
    return () => {
      alive = false
    }
  }, [isReadOnly, hasInventory, item?.product_inventory_id, loadInitialDealOptions])

  const dealLabel =
    selectedDeal?.dealCode ||
    selectedDeal?.productUnitNumber ||
    selectedDeal?.productCode ||
    resolvedDealLabel
  const dealDetailPath =
    selectedDeal?.dealId && selectedDeal.dealId > 0 && ability.can('retrieve', 'deal')
      ? generatePath(APP_PATH.DEAL_DETAIL, { id: String(selectedDeal.dealId) })
      : null

  const dealSelect = isReadOnly ? (
    dealLabel ? (
      dealDetailPath ? (
        <Link
          to={dealDetailPath}
          target="_blank"
          rel="noopener noreferrer"
          title={`Xem chi tiết giao dịch ${dealLabel}`}
          className="typo-body-base-semibold text-action-primary-red-default hover:text-action-primary-red-hover inline-flex w-fit items-center gap-1 underline-offset-2 hover:underline"
        >
          {dealLabel} ↗
        </Link>
      ) : (
        <span className="typo-body-base-semibold text-content-dark-1">{dealLabel}</span>
      )
    ) : (
      <span className="typo-body-base text-content-dark-3">—</span>
    )
  ) : (
    <Controller
      name={`items.${index}.product_inventory_id`}
      control={control}
      render={({ field, fieldState }) => (
        <Select
          value={field.value ?? null}
          onChange={(value) => {
            const nextValue = value ? Number(value) : undefined
            field.onChange(nextValue)
            onSelectDeal(index, nextValue)
          }}
          placeholder="Chọn mã HĐ / căn"
          loadOptions={loadDealOptions}
          loadInitialOptions={loadInitialDealOptions}
          enableSearch
          dropdownAutoWidth
          disabled={disabled || productLocked}
          error={fieldState.error?.message}
          className="typo-body-base-medium w-full md:w-auto"
        />
      )}
    />
  )

  // Mã căn (chip xanh) → mở chi tiết căn (product-inventory) ở tab mới khi có quyền `project.retrieve`.
  // Route product-inventory phẳng theo id, không cần saId. Áp ở mọi mode (link điều hướng, mở tab mới).
  const productInventoryId = Number(item?.product_inventory_id) || 0
  const productDetailPath =
    productInventoryId > 0 && ability.can('retrieve', 'project')
      ? generatePath(APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL, {
          id: String(productInventoryId),
        })
      : null
  const productCodeChip = productCode ? (
    productDetailPath ? (
      <Link
        to={productDetailPath}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title={`Xem chi tiết căn ${productCode}`}
        className="typo-body-xs-regular shrink-0 rounded-full bg-[#f2f2f2] px-2 py-0.5 text-blue-700 hover:underline"
      >
        <b className="whitespace-nowrap">{productCode} ↗</b>
      </Link>
    ) : (
      <span
        className="typo-body-xs-regular shrink-0 rounded-full bg-[#f2f2f2] px-2 py-0.5 text-blue-700"
        title={productCode}
      >
        <b className="whitespace-nowrap">{productCode}</b>
      </span>
    )
  ) : null

  const warningTone = hasError
    ? {
        className: 'bg-semantic-danger-subtle text-semantic-danger-default',
        icon: <TriangleAlert size={12} />,
        label: 'Lỗi',
      }
    : hasWarning
      ? {
          className: 'bg-orange-20 text-orange-60',
          icon: <IconWarning color="#d28a35" size={12} />,
          label: 'Cảnh báo',
        }
      : null
  // Badge bấm được (investor truyền onBadgeClick) → mở căn + cuộn tới khối cảnh báo; F2 (absent) → tĩnh.
  const warningBadge = warningTone ? (
    onBadgeClick ? (
      <button
        type="button"
        onClick={onBadgeClick}
        title="Bấm để mở căn và xem chi tiết cảnh báo"
        className={cn(
          'typo-body-xs-regular inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 py-1 transition-opacity hover:opacity-80',
          warningTone.className
        )}
      >
        {warningTone.icon}
        <b>{warningTone.label}</b>
      </button>
    ) : (
      <Flex
        gap="1"
        justify="center"
        align="center"
        className={cn(
          'typo-body-xs-regular shrink-0 rounded-full px-2 py-1',
          warningTone.className
        )}
      >
        {warningTone.icon}
        <b>{warningTone.label}</b>
      </Flex>
    )
  ) : null

  // F2 giữ marker "Đã xác nhận" thủ công (FE-only). Investor không truyền onToggleVerified ⇒ ẩn nút.
  const verifyButton =
    onToggleVerified && hasInventory && !isReadOnly ? (
      <button
        type="button"
        disabled={disabled || hasError}
        onClick={onToggleVerified}
        title={
          hasError
            ? 'Còn lỗi cần xử lý — không thể xác nhận đối chiếu'
            : 'Đánh dấu đã xác nhận đối chiếu (chỉ trên giao diện, không lưu)'
        }
        className={cn(
          'typo-body-sm-medium inline-flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          'w-full justify-center md:w-auto',
          verified
            ? 'bg-data-green-default border-data-green-default text-content-light-1'
            : 'border-data-green-default text-data-green-default hover:bg-background-2'
        )}
      >
        {verified ? (
          <>
            <IconCheck size={16} />
            Đã xác nhận
          </>
        ) : (
          '+ Xác nhận đối chiếu'
        )}
      </button>
    ) : null

  const showSave = !!onSave && hasInventory && !isReadOnly
  const saveStateBadge =
    showSave && saveState ? (
      <span
        className={cn(
          'typo-body-sm-medium inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1',
          saveState === 'saved'
            ? 'bg-data-green-disabled text-data-green-hover'
            : saveState === 'saving'
              ? 'bg-data-blue-disabled text-data-blue-hover'
              : saveState === 'dirty'
                ? 'bg-data-orange-disabled text-data-orange-hover'
                : 'bg-background-3 text-content-dark-3'
        )}
      >
        {saveState === 'saved' ? (
          <>
            <IconCheck size={14} />
            Đã lưu
          </>
        ) : saveState === 'saving' ? (
          'Đang lưu…'
        ) : saveState === 'dirty' ? (
          'Chưa lưu'
        ) : (
          'Căn mới'
        )}
      </span>
    ) : null
  const saveAction = showSave ? (
    saveState === 'saved' ? (
      // Card đang mở → KHÔNG cần nút "Sửa" (đang ở chế độ chỉnh sửa rồi); chỉ hiện khi thu gọn để mở lại.
      expanded ? null : (
        <button
          type="button"
          onClick={onToggleExpanded}
          title="Sửa căn này"
          className="typo-body-sm-medium border-border-2 text-content-dark-2 hover:bg-background-2 inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 transition-colors"
        >
          <IconPencilsimple size={15} />
          Sửa
        </button>
      )
    ) : (
      <button
        type="button"
        disabled={disabled || saveState === 'saving'}
        onClick={onSave}
        title={`${saveActionLabel} — lưu căn này xuống hệ thống`}
        className="typo-body-sm-medium border-content-dark-2 text-content-dark-1 hover:bg-background-2 inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <IconCheck size={15} />
        {saveActionLabel}
      </button>
    )
  ) : null

  const expandTrashButtons = (
    <>
      <button
        type="button"
        onClick={onToggleExpanded}
        className="text-content-dark-3 hover:text-content-dark-1 inline-flex shrink-0 cursor-pointer items-center justify-center"
        title={expanded ? 'Thu gọn' : 'Mở rộng'}
        aria-label={expanded ? 'Thu gọn' : 'Mở rộng'}
      >
        {expanded ? <IconCaretup size={18} /> : <IconCaretdown size={18} />}
      </button>
      {canRemove && !isReadOnly && (
        <button
          type="button"
          className="text-action-primary-red-default hover:text-action-primary-red-hover disabled:text-content-dark-4 inline-flex shrink-0 cursor-pointer items-center justify-center disabled:cursor-not-allowed"
          onClick={onRemove}
          disabled={disabled}
          title="Xóa căn"
          aria-label="Xóa căn"
        >
          <IconTrashsimple size={18} />
        </button>
      )}
    </>
  )

  return (
    <>
      {/* Desktop: layout gốc — ẩn trên mobile */}
      <Flex
        align="start"
        justify="between"
        gap="3"
        wrap="wrap"
        className="hidden md:flex xl:flex-nowrap xl:items-center"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2 xl:flex-row xl:items-center xl:gap-2">
          <Flex align="center" gap="2" className="w-full shrink-0 xl:w-auto">
            <span className="bg-background-2 text-content-dark-2 typo-body-sm-semibold flex size-6 shrink-0 items-center justify-center rounded-full">
              {index + 1}
            </span>

            <div
              className={cn(
                'align-center flex min-w-0 flex-1 justify-start',
                'md:w-48 md:flex-none'
              )}
            >
              {dealSelect}
            </div>
          </Flex>

          {hasInventory && (productCode || feeCalcPrice != null || reconciledPct != null) && (
            <Flex
              align="center"
              gap="2"
              wrap="wrap"
              className="w-full min-w-0 pl-8 xl:w-auto xl:pl-0"
            >
              {productCodeChip}

              {productCode && (feeCalcPrice != null || reconciledPct != null) && (
                <span className="text-content-dark-3 hidden shrink-0 xl:inline">·</span>
              )}

              {feeCalcPrice != null && (
                <Flex align="center" gap="1" className="typo-body-base-medium shrink-0">
                  <span className="text-content-dark-3 shrink-0 whitespace-nowrap">
                    Giá tính phí
                  </span>
                  <b
                    className="text-content-dark-1 whitespace-nowrap"
                    title={`${money(feeCalcPrice)}${hdmbSuffix}`}
                  >
                    {money(feeCalcPrice)}
                    {hdmbSuffix}
                  </b>
                </Flex>
              )}

              {feeCalcPrice != null && reconciledPct != null && (
                <span className="text-content-dark-3 shrink-0">·</span>
              )}

              {reconciledPct != null && (
                <span className="typo-body-base-medium text-content-dark-1 shrink-0 whitespace-nowrap">
                  <span className="text-content-dark-3">Đã ĐC </span>
                  <b>{formatPercent(reconciledPct)}</b>
                </span>
              )}

              {baseChips}
            </Flex>
          )}
        </div>

        <Flex align="center" gap="3" className="ml-auto shrink-0 xl:ml-2">
          {/* NET summary shows only when collapsed; the expanded body has the KỲ NÀY KPI band. */}
          {hasInventory && !expanded && computedDisplayState !== 'hidden' && (
            <Flex direction="column" align="end" gap="0" className="shrink-0">
              <span className="typo-body-xs-regular text-content-dark-3 whitespace-nowrap uppercase">
                {summaryTopLabel}
              </span>
              {computedDisplayState === 'stale' ? (
                <span className="typo-body-base-semibold text-data-orange-hover whitespace-nowrap">
                  ⚠ Chưa xác nhận lại
                </span>
              ) : (
                <>
                  <span
                    className={cn('typo-body-base-semibold whitespace-nowrap', netTone)}
                    title={netLabel}
                  >
                    {netLabel}
                  </span>
                  {summarySubLine && (
                    <span className="typo-body-xs-regular text-content-dark-3 whitespace-nowrap">
                      {summarySubLine}
                    </span>
                  )}
                </>
              )}
            </Flex>
          )}

          {warningBadge}
          {saveStateBadge}
          {saveAction}
          {verifyButton}
          {expandTrashButtons}
        </Flex>
      </Flex>

      {/* Mobile: layout xếp hàng — ẩn từ md trở lên */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-start gap-2">
          <span className="bg-background-2 text-content-dark-2 typo-body-sm-semibold mt-2 flex size-6 shrink-0 items-center justify-center rounded-full">
            {index + 1}
          </span>

          <div className="min-w-0 flex-1">{dealSelect}</div>

          <div className="mt-1.5 flex shrink-0 items-center gap-1">{expandTrashButtons}</div>
        </div>

        {hasInventory && (productCode || feeCalcPrice != null || reconciledPct != null) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-8">
            {productCodeChip}

            {feeCalcPrice != null && (
              <span
                className="typo-body-base-medium text-content-dark-1 inline-flex max-w-full flex-wrap items-baseline gap-x-1"
                title={`Giá tính phí ${money(feeCalcPrice)}${hdmbSuffix}`}
              >
                <span className="text-content-dark-3 shrink-0">Giá tính phí</span>
                <b className="truncate">{money(feeCalcPrice)}</b>
                {hdmbSuffix ? <b className="truncate">{hdmbSuffix.trim()}</b> : null}
              </span>
            )}

            {reconciledPct != null && (
              <span className="typo-body-base-medium inline-flex items-baseline gap-1">
                <span className="text-content-dark-3 shrink-0">Đã ĐC</span>
                <b className="text-content-dark-1">{formatPercent(reconciledPct)}</b>
              </span>
            )}

            {baseChips}
          </div>
        )}

        {hasInventory && (
          <div className="border-border-1 flex flex-col gap-3 border-t pt-3">
            {!expanded && computedDisplayState !== 'hidden' && (
              <div className="min-w-0">
                <span className="typo-body-xs-regular text-content-dark-3 uppercase">
                  {summaryTopLabel}
                </span>
                {computedDisplayState === 'stale' ? (
                  <p className="typo-body-base-semibold text-data-orange-hover">
                    ⚠ Chưa xác nhận lại
                  </p>
                ) : (
                  <>
                    <p className={cn('typo-body-base-semibold truncate', netTone)} title={netLabel}>
                      {netLabel}
                    </p>
                    {summarySubLine && (
                      <span className="typo-body-xs-regular text-content-dark-3">
                        {summarySubLine}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}

            <Flex align="center" gap="2" wrap="wrap" className="w-full">
              {warningBadge}
              {saveStateBadge}
              {saveAction}
              {verifyButton}
            </Flex>
          </div>
        )}
      </div>
    </>
  )
}

export default ReconLineCardHeader
