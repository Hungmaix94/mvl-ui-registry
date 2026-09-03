import { useCallback, useMemo, useState } from 'react'
import {
  Controller,
  type FieldErrors,
  FormProvider,
  useForm,
  useWatch,
  type Resolver,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { generatePath } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { Button, Select, TextArea } from '@/components/ui'
import type { SelectOption } from '@/components/ui/select/Select'
import { CTVReconciliationPeriod_type } from '@/api/schema'
import { RECON_PERIOD_TYPE_PICKER_OPTIONS } from '@/features/sales/_shared/reconciliation/recon-period-type'
import { IconCaretdown } from '@/assets/icons/arrows'
import { IconEye, IconStacksimple } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { useDialog } from '@/hooks/useDialog'
import { useScrollToError } from '@/hooks/useScrollToError'
import {
  createEmptyInvestorReconciliationSheetItem,
  INVESTOR_RECONCILIATION_SHEET_DEFAULT_AGENCY_FEE_PCT,
  type InvestorReconciliationSheetCreateValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import { investorReconUnitSchemaV2 } from '@/features/sales/investor-reconciliations-v2/schema/recon-unit-schema-v2'
import { ReconModeProvider } from '@/features/sales/_shared/reconciliation/ReconModeContext'
import { useReconDealSelect } from '@/features/sales/_shared/reconciliation/useReconDealSelect'
import { useReconMvReference } from '@/features/sales/_shared/reconciliation/useReconMvReference'
import { useReconHistorySummary } from '@/features/sales/_shared/reconciliation/useReconHistorySummary'
import { useReconPriorDeduction } from '@/features/sales/_shared/reconciliation/useReconPriorDeduction'
import { useReconDeductionConfirm } from '@/features/sales/_shared/reconciliation/useReconDeductionConfirm'
import AddInvestorReconciliationUnitConfigTable from './AddInvestorReconciliationUnitConfigTable'
import AddInvestorReconciliationUnitHistoryCards from './AddInvestorReconciliationUnitHistoryCards'
import InvestorReconciliationBonusAdvanceSection from './InvestorReconciliationBonusAdvanceSection'
import {
  useCreateInvestorReconciliationLine,
  usePatchInvestorReconciliationLine,
  type InvestorReconciliationLine,
} from '@/features/sales/investor-reconciliations/services/investor-reconciliation-line-service'
import {
  lineRowToFormItem,
  toLineCreatePayload,
  toLinePatchPayload,
} from '@/features/sales/investor-reconciliations/adapters/investor-reconciliation-line-adapter'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { cn } from '@/utils'
import { ReconciliationSourceType } from '@/constants/api-schema-aliases'

/** Lấy message lỗi đầu tiên (đệ quy qua items.0.xxx) để toast — RHF errors lồng theo path. */
function firstFormErrorMessage(errors: unknown): string | undefined {
  if (!errors || typeof errors !== 'object') return undefined
  const record = errors as Record<string, unknown>
  const maybeMessage = record.message
  if (typeof maybeMessage === 'string' && maybeMessage) return maybeMessage
  for (const key of Object.keys(record)) {
    if (key === 'message' || key === 'type' || key === 'ref') continue
    const nested = firstFormErrorMessage(record[key])
    if (nested) return nested
  }
  return undefined
}

const SourceType = ReconciliationSourceType

/** Loại kỳ người dùng chọn được: kỳ thường và kỳ hủy cọc. Nhãn lấy từ nguồn dùng chung. */
const PERIOD_TYPE_SELECT_OPTIONS: SelectOption[] = RECON_PERIOD_TYPE_PICKER_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
  // Mô tả có thể để rỗng ⇒ không ghép dấu gạch, tránh nhãn cụt kiểu "Kỳ thanh toán thường — ".
  optionLabel: option.description ? `${option.label} — ${option.description}` : option.label,
}))

type AddInvestorReconciliationUnitDialogV2Props = {
  sheetId: number
  projectId: number
  investorId?: number
  excludedProductInventoryIds?: number[]
  onSuccess: () => void
  /** Khi có: dialog mở ở chế độ SỬA căn đã lưu — form hydrate từ dòng này, submit gọi PATCH thay POST. */
  editingLine?: InvestorReconciliationLine
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <Flex direction="column" gap="0" className="min-w-[110px]">
      <span className="typo-body-xs-regular text-content-dark-3 whitespace-nowrap">{label}</span>
      <span className="typo-body-base-medium text-content-dark-2 whitespace-nowrap">{value}</span>
    </Flex>
  )
}

/**
 * "Thêm căn" / "Sửa căn" dialog cho Đối chiếu chủ đầu tư 2.0 — mở từ InvestorReconciliationDetailPageV2,
 * tái sử dụng nguyên các hook/component đã có của v1 (useReconDealSelect, useReconMvReference,
 * useReconHistorySummary, useReconLineDerived, ReconConfigTable, ReconHistoryTable) và service
 * tạo/sửa căn (useCreateInvestorReconciliationLine / usePatchInvestorReconciliationLine +
 * toLineCreatePayload / toLinePatchPayload) — chỉ viết mới phần header gọn (chọn HĐ/mã căn + box tóm
 * tắt) thay cho ReconLineCardHeader đầy đủ tính năng (không cần collapse/expand, badge cảnh báo, KPI
 * band... ở dialog này).
 *
 * `editingLine` có giá trị ⇒ chế độ SỬA: form hydrate từ dòng đã lưu qua `lineRowToFormItem`, submit
 * gọi PATCH `/lines/{id}/` thay vì POST. Không có ⇒ chế độ THÊM như cũ (item rỗng, POST). Cùng một
 * form/ConfigTable/History cho cả 2 chế độ — người dùng vẫn đổi được HĐ/mã căn khi sửa (giống
 * hành vi sửa dòng trong form v1: handleSelectDeal reset lại tiến độ khi đổi căn).
 *
 * Form dùng `investorReconUnitSchemaV2` — GIỐNG schema v1 (tái dùng cùng type/logic ReconConfigTable),
 * chỉ nới `progress_from/to_pct` (readonly BE, tiến độ lũy kế có thể >100%) để không chặn submit âm thầm.
 * `project_id`/`source_type`/`reconciliation_date` chỉ là giá trị hợp lệ giữ chỗ (không hiển thị, không
 * gửi lên) vì request thật chỉ gửi `items[0]` qua toLineCreatePayload / toLinePatchPayload.
 */
const AddInvestorReconciliationUnitDialogV2 = ({
  sheetId,
  projectId,
  investorId,
  excludedProductInventoryIds,
  onSuccess,
  editingLine,
}: AddInvestorReconciliationUnitDialogV2Props) => {
  const ability = useAbility()
  const { displayClose } = useDialog()
  const { mutateAsync: createLine, isPending: isCreating } = useCreateInvestorReconciliationLine()
  const { mutateAsync: patchLine, isPending: isPatching } = usePatchInvestorReconciliationLine()
  const isSubmitting = isCreating || isPatching
  const [historyOpen, setHistoryOpen] = useState(false)

  const form = useForm<InvestorReconciliationSheetCreateValues>({
    mode: 'onSubmit',
    resolver: zodResolver(
      investorReconUnitSchemaV2
    ) as unknown as Resolver<InvestorReconciliationSheetCreateValues>,
    defaultValues: {
      project_id: projectId,
      source_type: SourceType.direct,
      reconciliation_date: '1970-01-01',
      note: '',
      items: [
        editingLine ? lineRowToFormItem(editingLine) : createEmptyInvestorReconciliationSheetItem(),
      ],
    },
  })
  const { control, handleSubmit, setValue, setError, formState } = form
  const scrollToFirstError = useScrollToError(formState.errors)

  const item = useWatch({ control, name: 'items.0' })
  const productInventoryId = Number(item?.product_inventory_id) || 0
  const isCancellationPeriod = item?.period_type === CTVReconciliationPeriod_type.cancellation
  const noteError = formState.errors.items?.[0]?.note?.message

  const excludedSet = useMemo(
    () => new Set(excludedProductInventoryIds ?? []),
    [excludedProductInventoryIds]
  )
  const { getLoadDealOptionsByRow, loadInitialDealOptions, getSelectedDeal } = useReconDealSelect({
    projectId,
    investorId,
  })
  const loadDealOptions = useMemo(
    () => getLoadDealOptionsByRow(() => excludedSet),
    [getLoadDealOptionsByRow, excludedSet]
  )
  const selectedDeal = getSelectedDeal(productInventoryId)

  const mv = useReconMvReference(selectedDeal?.dealId, selectedDeal)
  const historySummary = useReconHistorySummary(selectedDeal?.dealId ?? 0)

  // Lũy kế giảm trừ các kỳ đã duyệt (server-first, fallback lịch sử — loại phiếu đang sửa) — hint
  // dưới "Giảm trừ khác" + dữ liệu cho dialog xác nhận trước khi lưu căn có giảm trừ.
  const priorDeduction = useReconPriorDeduction(selectedDeal?.dealId, {
    excludeInvestorSheetId: sheetId,
  })
  // Confirm CỤC BỘ (AppDialog alert) — TUYỆT ĐỐI không dùng displayConfirm của global dialog store:
  // store 1-config sẽ thay thế (phá) chính dialog "Thêm căn" đang host form này.
  const { confirmDeduction, deductionConfirmDialog } = useReconDeductionConfirm()

  const handleSelectDeal = useCallback(
    (nextProductInventoryId: number | undefined) => {
      setValue('items.0.product_inventory_id', nextProductInventoryId as never, {
        shouldValidate: false,
        shouldDirty: true,
      })

      // Đổi căn → tiến độ/% ĐC đợt này của căn cũ không còn đúng — xoá, giống handleSelectDeal của v1
      // (InvestorReconciliationFormTable.tsx dòng ~86-92).
      setValue('items.0.progress_from_pct', null, { shouldDirty: true })
      setValue('items.0.progress_to_pct', null, { shouldDirty: true })
      setValue('items.0.pct_period_commission', null, { shouldDirty: true })
      setValue('items.0.amt_period_commission', null, { shouldDirty: true })
      setValue('items.0.extra_bonus_progress_from_pct', null, { shouldDirty: true })
      setValue('items.0.extra_bonus_progress_to_pct', null, { shouldDirty: true })

      // Giá tính phí (HĐMB) + % Hoa hồng (theo HĐPP): auto-fill từ deal thật — giống hệt v1. Thiếu bước
      // này, "Giá tính phí" luôn trống (chỉ bị null-hoá, không bao giờ được ghi lại) và "% Hoa hồng" giữ
      // mặc định placeholder 1% (INVESTOR_RECONCILIATION_SHEET_DEFAULT_AGENCY_FEE_PCT) bất kể chọn căn nào.
      if (!nextProductInventoryId) {
        setValue('items.0.fee_calculation_price', null, { shouldDirty: true })
        setValue('items.0.pct_agency_fee', INVESTOR_RECONCILIATION_SHEET_DEFAULT_AGENCY_FEE_PCT, {
          shouldDirty: true,
        })
        setValue('items.0.amt_agency_fee', null, { shouldDirty: true })
        // Tổng thưởng đại lý: reset về default schema khi bỏ chọn căn.
        setValue('items.0.shared_bonus_amount', 0, { shouldDirty: true })
        setValue('items.0.shared_bonus_pct', null, { shouldDirty: true })
        return
      }
      const deal = getSelectedDeal(nextProductInventoryId)
      if (!deal) return
      if (deal.feeCalculationPrice != null) {
        setValue('items.0.fee_calculation_price', deal.feeCalculationPrice, { shouldDirty: true })
      }
      if (deal.agencyFeeRate != null) {
        setValue('items.0.pct_agency_fee', deal.agencyFeeRate, { shouldDirty: true })
        setValue('items.0.amt_agency_fee', null, { shouldDirty: true })
      }
      // Tổng thưởng đại lý (whole-deal): auto-fill từ deal thật, giống Giá tính phí / % Hoa hồng.
      // XOR — chỉ set MỘT trong hai (pct ưu tiên khi có), khớp ràng buộc schema.
      if (deal.sharedBonusPct != null) {
        setValue('items.0.shared_bonus_pct', deal.sharedBonusPct, { shouldDirty: true })
        setValue('items.0.shared_bonus_amount', 0, { shouldDirty: true })
      } else if (deal.sharedBonusAmount != null) {
        setValue('items.0.shared_bonus_amount', deal.sharedBonusAmount, { shouldDirty: true })
        setValue('items.0.shared_bonus_pct', null, { shouldDirty: true })
      }
    },
    [setValue, getSelectedDeal]
  )

  const onValid = useCallback(
    async (values: InvestorReconciliationSheetCreateValues) => {
      const line = values.items[0]
      // Căn có "Giảm trừ khác" > 0 ⇒ hỏi xác nhận (kỳ này + lũy kế đã duyệt) trước khi lưu;
      // không có giảm trừ ⇒ confirmDeduction resolve true ngay, lưu thẳng.
      const confirmed = await confirmDeduction({
        unitLabel:
          selectedDeal?.productUnitNumber ||
          selectedDeal?.productCode ||
          selectedDeal?.dealCode ||
          `#${line.product_inventory_id}`,
        feeDeduction: Number(line.fee_deduction) || 0,
        feeDeductionToSale: line.fee_deduction_to_sale_amount ?? null,
        prior: { total: priorDeduction.total, toSale: priorDeduction.toSale },
      })
      if (!confirmed) return
      try {
        if (editingLine) {
          await patchLine({
            sheetPk: sheetId,
            id: editingLine.id,
            body: toLinePatchPayload(values.items[0]),
          })
          toastService.success('Đã cập nhật căn')
        } else {
          await createLine({ sheetPk: sheetId, body: toLineCreatePayload(values.items[0]) })
          toastService.success('Đã lưu căn')
        }
        onSuccess()
        displayClose()
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [
      createLine,
      patchLine,
      sheetId,
      editingLine,
      onSuccess,
      displayClose,
      setError,
      confirmDeduction,
      priorDeduction.total,
      priorDeduction.toSale,
      selectedDeal,
    ]
  )

  const handleInvalid = useCallback(
    (errors: FieldErrors<InvestorReconciliationSheetCreateValues>) => {
      scrollToFirstError()
      // Không nuốt lỗi âm thầm: hiện lỗi validation đầu tiên (nhiều ô recon chỉ có viền đỏ, không text).
      toastService.error(firstFormErrorMessage(errors) ?? 'Vui lòng kiểm tra lại thông tin đã nhập')
    },
    [scrollToFirstError]
  )

  const productCode = selectedDeal?.productUnitNumber || selectedDeal?.productCode
  const productDetailPath =
    productInventoryId > 0 && ability.can('retrieve', 'project')
      ? generatePath(APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL, {
          id: String(productInventoryId),
        })
      : null

  return (
    <ReconModeProvider mode={editingLine ? 'edit' : 'create'}>
      <FormProvider {...form}>
        <form
          onSubmit={handleSubmit(onValid, handleInvalid)}
          className="flex flex-col gap-4 px-6 py-4"
        >
          <Flex direction="column" gap="1">
            <Controller
              control={control}
              name="items.0.product_inventory_id"
              render={({ field, fieldState }) => (
                <Select
                  label="Hợp đồng/Mã căn"
                  required
                  placeholder="Chọn hợp đồng/mã căn"
                  loadOptions={loadDealOptions}
                  loadInitialOptions={loadInitialDealOptions}
                  enableSearch
                  disabled={isSubmitting || !!editingLine}
                  value={field.value ?? null}
                  onChange={(value) => {
                    const next = value ? Number(value) : undefined
                    field.onChange(next)
                    handleSelectDeal(next)
                  }}
                  error={fieldState.error?.message}
                />
              )}
            />
            {editingLine && (
              // PATCH /lines/{id}/ không nhận product_inventory_id (chỉ POST tạo mới mới gửi) — đổi HĐ/mã
              // căn ở đây sẽ bị BE lặng lẽ bỏ qua trong khi giá/%HH auto-fill theo căn mới vẫn được lưu,
              // gây lệch dữ liệu. Khoá Select để không tạo cảm giác đổi được. Đổi căn = xoá + thêm lại.
              <span className="typo-body-xs-regular text-content-dark-3">
                Không thể đổi hợp đồng/mã căn khi sửa — xoá căn này và thêm lại nếu cần đổi căn.
              </span>
            )}
          </Flex>

          {/* Loại kỳ — trước đây chỉ chọn được qua menu "+ Thêm căn ▾" của form v1, mà v2 không còn
              định tuyến tới form đó, nên mọi dòng đều rơi về loại kỳ BE tự suy và KHÔNG cách nào lập
              được kỳ hủy cọc. Đặt ngay cạnh ô chọn căn vì loại kỳ quyết định ô nào có ý nghĩa bên dưới. */}
          <Flex direction="column" gap="1">
            <Controller
              control={control}
              name="items.0.period_type"
              render={({ field, fieldState }) => (
                <Select
                  label="Loại kỳ"
                  required
                  placeholder="Chọn loại kỳ"
                  options={PERIOD_TYPE_SELECT_OPTIONS}
                  disabled={isSubmitting}
                  value={field.value ?? CTVReconciliationPeriod_type.normal_payment}
                  onChange={(value) =>
                    field.onChange((value as CTVReconciliationPeriod_type) ?? undefined)
                  }
                  error={fieldState.error?.message}
                />
              )}
            />
            {isCancellationPeriod && (
              <span className="typo-body-xs-regular text-content-dark-3">
                Kỳ hủy cọc: nhập số CĐT thu lại ở &ldquo;Giảm trừ khác&rdquo; và lý do ở &ldquo;Ghi chú
                căn&rdquo;. Kỳ này không ghi nhận phí đại lý. Xác nhận phiếu sẽ đóng giao dịch.
              </span>
            )}
          </Flex>

          {productInventoryId === 0 ? (
            <span className="typo-body-sm-regular text-content-dark-3">
              Chọn hợp đồng / mã căn để nhập thông tin đối chiếu.
            </span>
          ) : (
            <>
              <div className="border-border-1 overflow-hidden rounded-md border">
                <div className="p-4">
                  <Flex align="center" gap="2" className="mb-3">
                    <span className="typo-body-base-semibold text-content-dark-1">
                      {productCode || '-'}
                    </span>
                    {productDetailPath && (
                      // Dialog content renders inside <GlobalDialog>, which sits OUTSIDE <RouterProvider>
                      // in App.tsx — react-router's <Link> crashes here (no router context), so a plain
                      // anchor is used instead of <Link>.
                      <a
                        href={productDetailPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Xem chi tiết căn ${productCode}`}
                        className="text-content-dark-3 hover:text-action-primary-red-default"
                      >
                        <IconEye size={16} />
                      </a>
                    )}
                  </Flex>
                  <Flex gap="6" wrap="wrap">
                    <SummaryStat
                      label="Đã đối chiếu"
                      value={formatPercent(historySummary.latestConfirmedProgressToPct ?? 0)}
                    />
                    <SummaryStat label="Số lần đối chiếu" value={`${historySummary.count} lần`} />
                    <SummaryStat
                      label="Giá tính phí"
                      value={
                        mv.feeCalculationPrice != null
                          ? `${formatCurrencyVND(mv.feeCalculationPrice, { maximumFractionDigits: 0 })} VNĐ`
                          : '-'
                      }
                    />
                    <SummaryStat
                      label="Hoà hồng theo HĐPP"
                      value={mv.pctAgencyFee != null ? formatPercent(mv.pctAgencyFee) : '-'}
                    />
                    <SummaryStat
                      label="Phí base"
                      value={
                        mv.baseAgencyFeeRate != null ? formatPercent(mv.baseAgencyFeeRate) : '-'
                      }
                    />
                    <SummaryStat
                      label="Đối chiếu phí base"
                      value={
                        historySummary.latestConfirmedBaseProgressToPct != null
                          ? formatPercent(historySummary.latestConfirmedBaseProgressToPct)
                          : '-'
                      }
                    />
                  </Flex>
                </div>

                <div className="border-border-1 border-t">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen((prev) => !prev)}
                    className="hover:bg-background-2 typo-body-sm-medium text-content-dark-2 flex w-full cursor-pointer items-center gap-2 px-3 py-2 transition-colors"
                    aria-expanded={historyOpen}
                  >
                    <IconStacksimple size={15} />
                    <span>Lịch sử đối chiếu</span>
                    <span
                      className={cn(
                        'ml-auto shrink-0 transition-transform duration-300 ease-out',
                        historyOpen && 'rotate-180'
                      )}
                    >
                      <IconCaretdown size={16} />
                    </span>
                  </button>
                </div>

                {historyOpen && (
                  <div className="border-border-1 border-t">
                    <AddInvestorReconciliationUnitHistoryCards
                      dealId={selectedDeal?.dealId ?? 0}
                      excludeInvestorSheetId={sheetId}
                    />
                  </div>
                )}
              </div>

              <InvestorReconciliationBonusAdvanceSection dealId={selectedDeal?.dealId} />

              <AddInvestorReconciliationUnitConfigTable
                item={item}
                mv={mv}
                disabled={isSubmitting}
                reconciledPct={historySummary.latestConfirmedProgressToPct}
                extraWithdrawnPct={historySummary.latestExtraProgressToPct}
                priorDeduction={
                  !priorDeduction.isLoading && (selectedDeal?.dealId ?? 0) > 0
                    ? { total: priorDeduction.total, toSale: priorDeduction.toSale }
                    : undefined
                }
                establishedAgencyFeeMode={historySummary.establishedAgencyFeeMode}
                sharedBonusToSaleAmount={editingLine?.shared_bonus_to_sale_amount}
              />

              <Flex direction="column" gap="1">
                <label className="typo-body-sm-medium text-content-dark-2">
                  Ghi chú
                  {isCancellationPeriod && <span className="text-action-primary-red-default"> *</span>}
                </label>
                <TextArea
                  rows={3}
                  value={item?.note ?? ''}
                  disabled={isSubmitting}
                  maxCharacters={100}
                  onChange={(value) => setValue('items.0.note', value, { shouldDirty: true })}
                  placeholder={
                    isCancellationPeriod ? 'Nhập lý do hủy cọc' : 'Nhập ghi chú'
                  }
                />
                {/* Kỳ hủy cọc bắt buộc ghi chú (BE trả cancellation_note_required). TextArea này gắn
                    bằng setValue nên không có fieldState — đọc lỗi thẳng từ formState để người dùng
                    thấy tại chỗ, thay vì chỉ có toast rồi tự tắt. */}
                {noteError && (
                  <span className="typo-body-xs-regular text-action-primary-red-default">
                    {noteError}
                  </span>
                )}
              </Flex>
            </>
          )}

          <Flex gap="3" justify="end" className="border-border-1 mt-2 border-t pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={displayClose}
              disabled={isSubmitting}
            >
              Huỷ
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingLine ? 'Lưu thay đổi' : 'Lưu căn'}
            </Button>
          </Flex>
        </form>
        {deductionConfirmDialog}
      </FormProvider>
    </ReconModeProvider>
  )
}

export default AddInvestorReconciliationUnitDialogV2
