import { type RefObject, useCallback, useMemo, useState } from 'react'
import { FormProvider, type Resolver, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import { Check } from 'lucide-react'

import { Button, Text, TextArea } from '@/components/ui'
import DetailRow from '@/components/commons/DetailRow'
import { cn } from '@/utils'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import FormController from '@/components/ui/form/FormController'
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/utils/date-utils'
import { useScrollToError } from '@/hooks/useScrollToError'
import { ReconModeProvider } from '@/features/sales/_shared/reconciliation/ReconModeContext'
import { ReconKindProvider } from '@/features/sales/_shared/reconciliation/ReconKindContext'
import ReconSheetTotalSummary from '@/features/sales/_shared/reconciliation/ReconSheetTotalSummary'
import { renderReconParentSheetLink } from '@/features/sales/_shared/reconciliation/recon-code-link'
import { useAbility } from '@/lib/ability'
import { useDialog } from '@/hooks/useDialog'
import { IconPencilsimple } from '@/assets/icons'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { ReconciliationStatus } from '@/constants/api-schema-aliases'
import F2RepresentativeEditForm from './F2RepresentativeEditForm'

import {
  createEmptyF2ReconciliationSheetItem,
  f2ReconciliationSheetSchema,
  type F2ReconciliationSheetValues,
} from '../schemas/f2-reconciliation-sheet-create-schema'
import {
  buildF2ServerComputedByProductId,
  mapF2SheetToFormValues,
} from '../adapters/f2-reconciliation-adapter'
import type { F2ReconciliationSheet } from '../types/f2-reconciliation'
import { f2ReconciliationConfig } from '../config/f2-reconciliation-config'
import { useF2ReconLineSources } from '../hooks/useF2ReconLineSources'
import F2ReconciliationLineCard from './F2ReconciliationLineCard'
import F2ReconciliationStatusBadge from './F2ReconciliationStatusBadge'

/**
 * F2 reconciliation sheet form — ONE component for both edit and view (mirrors
 * `InvestorReconciliationForm`'s mode prop). F2 has NO create (sheets are generated from the parent
 * CĐT commission shares), so the only modes are:
 * - `edit`: read-only sheet header (sàn + thông tin bán hàng are fixed) + editable date/note + the
 *   canonical card tree (commission/fee/bonus/deduction editable; period/progress/VAT inherited).
 * - `view`: sheet info block + the same card tree read-only + per-line F2 actions (confirm/void/resync).
 *
 * The cumulative-history surfaces (`disableHistory`) are gated off — F2's per-căn ledger lives on a
 * separate endpoint; see `project_f2_recon_ui_gaps`.
 */

const ReadOnlyField = ({
  label,
  value,
  required,
}: {
  label: string
  value: string
  required?: boolean
}) => (
  <div className="flex w-full flex-col gap-2">
    <div className="flex items-center gap-0.5">
      <label className="typo-body-base-semibold text-neutral-90">{label}</label>
      {required && (
        <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
      )}
    </div>
    <div
      className={cn(
        'bg-data-light-grey-disabled border-border-1 typo-body-sm-medium text-content-dark-4',
        'flex h-10 w-full items-center rounded border px-3'
      )}
      title={value}
    >
      <span className="truncate">{value}</span>
    </div>
  </div>
)

type F2ReconciliationFormProps = {
  /** `edit` → editable date/note; `view` → read-only detail (same card tree + per-line actions). */
  mode: 'edit' | 'view'
  initialData: F2ReconciliationSheet
  onSubmit?: (values: F2ReconciliationSheetValues) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

const F2ReconciliationForm = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  scrollContainerRef,
}: F2ReconciliationFormProps) => {
  const isView = mode === 'view'
  const ability = useAbility()
  // Thiếu quyền xem phiếu CĐT thì dòng "Sinh từ" vẫn hiện mã, chỉ bỏ link.
  const canViewInvestorSheet = ability.can('retrieve', 'investor_reconciliation_sheet')

  const { displayFormContent } = useDialog()
  const { keysMap: f2SourceKeysMap } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE],
  })
  const f2SourceLabels = f2SourceKeysMap.get(APP_CONSTANT_KEY.REALESTATE.F2_SOURCE_TYPE) as
    | Record<string, string>
    | undefined

  const canEditRepresentative =
    isView &&
    initialData.status === ReconciliationStatus.draft &&
    ability.can('update', 'f2_reconciliation_sheet')

  const handleEditRepresentative = useCallback(() => {
    if (!initialData.id) return
    displayFormContent({
      title: 'Sửa người đại diện MVL',
      hideFooter: true,
      content: (
        <F2RepresentativeEditForm
          sheetId={initialData.id}
          initialValues={{
            mvl_representative: initialData.mvl_representative ?? null,
          }}
        />
      ),
    })
  }, [displayFormContent, initialData.id, initialData.mvl_representative])

  const defaultValues = useMemo<F2ReconciliationSheetValues>(
    () => mapF2SheetToFormValues(initialData),
    [initialData]
  )

  const form = useForm<F2ReconciliationSheetValues>({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    // Same resolver shape as InvestorReconciliationForm: the canonical schema coerces + defaults, so
    // its z.input ≠ z.output and zodResolver's inferred type needs this cast (not a shape paper-over).
    resolver: zodResolver(
      f2ReconciliationSheetSchema
    ) as unknown as Resolver<F2ReconciliationSheetValues>,
    defaultValues,
  })

  const { register, control, handleSubmit, formState } = form
  const scrollToFirstError = useScrollToError(formState.errors)

  const { fields } = useFieldArray({ control, name: 'items' })
  const watchedItems = useWatch({ control, name: 'items' }) || []

  const { getSelectedDeal, loadInitialDealOptions, loadDealOptions } =
    useF2ReconLineSources(initialData)

  const excludeSheetId = initialData.id ?? null

  // BE-computed totals per căn (F2) — engine hiển thị NET/Phải-thu/sub_total theo số BE thay vì
  // công thức per-field FE (không khớp cách BE tính tổng cho F2). Xem project_f2_recon_ui_gaps.
  const serverComputedByProductId = useMemo(
    () => buildF2ServerComputedByProductId(initialData),
    [initialData]
  )

  // FE-only per-căn "Đã xác nhận" review markers (edit only) — mirrors InvestorReconciliationForm.
  const [verifiedKeys, setVerifiedKeys] = useState<Set<number>>(() => new Set())
  const handleToggleVerified = useCallback((productInventoryId: number) => {
    setVerifiedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(productInventoryId)) next.delete(productInventoryId)
      else next.add(productInventoryId)
      return next
    })
  }, [])

  const selectedCanCount = useMemo(
    () => watchedItems.filter((it) => Number(it?.product_inventory_id) > 0).length,
    [watchedItems]
  )

  const exchangeDisplay = useMemo(() => {
    const ex = initialData.exchange_detail
    if (!ex) return '-'
    return [ex.code, ex.name].filter(Boolean).join(' - ')
  }, [initialData.exchange_detail])

  const salesAllocationDisplay = useMemo(() => {
    const sa = initialData.sales_allocation_detail
    if (!sa) return '-'
    return [sa.code, sa.name].filter(Boolean).join(' - ')
  }, [initialData.sales_allocation_detail])

  const creatorDisplay = useMemo(() => {
    const c = initialData.created_by
    if (!c?.code && !c?.fullname) return '-'
    return [c?.code, c?.fullname].filter(Boolean).join(' - ')
  }, [initialData.created_by])

  const onValid = useCallback(
    async (values: F2ReconciliationSheetValues) => {
      if (onSubmit) await onSubmit(values)
    },
    [onSubmit]
  )

  const handleInvalid = useCallback(() => {
    scrollToFirstError()
  }, [scrollToFirstError])

  return (
    <ReconKindProvider config={f2ReconciliationConfig}>
      <ReconModeProvider mode={mode}>
        <FormProvider {...form}>
          <form
            onSubmit={handleSubmit(onValid, handleInvalid)}
            className="space-y-6 px-7 py-4 pb-16"
          >
            {isView ? (
              <div className="bg-background-1 rounded-md">
                <Text className="typo-body-xl-semibold text-content-dark-1">
                  Thông tin phiếu đối chiếu
                </Text>
                <div className="mt-4 grid grid-cols-1 gap-x-12 md:grid-cols-2">
                  <Flex direction="column" gap="2">
                    <DetailRow label="Mã đối chiếu" value={initialData.code ?? '-'} />
                    <DetailRow
                      label="Sinh từ"
                      value={renderReconParentSheetLink(initialData, canViewInvestorSheet)}
                    />
                    <DetailRow label="Dự án" value={initialData.project_detail?.name ?? '-'} />
                    <DetailRow label="Sàn giao dịch" value={exchangeDisplay} />
                    <DetailRow label="Thông tin bán hàng" value={salesAllocationDisplay} />
                    <DetailRow
                      label="Ghi chú"
                      value={initialData.note ?? '-'}
                      className="md:col-span-2"
                    />
                  </Flex>
                  <Flex direction="column" gap="2">
                    <DetailRow
                      label="Trạng thái"
                      value={
                        initialData.status ? (
                          <F2ReconciliationStatusBadge status={initialData.status} />
                        ) : (
                          '-'
                        )
                      }
                    />
                    <DetailRow
                      label="Ngày đối chiếu"
                      value={
                        initialData.reconciliation_date
                          ? formatDate(initialData.reconciliation_date)
                          : '-'
                      }
                    />
                    <DetailRow
                      label="Ngày tạo"
                      value={initialData.created_at ? formatDate(initialData.created_at) : '-'}
                    />
                    <DetailRow
                      label="Ngày cập nhật"
                      value={initialData.updated_at ? formatDate(initialData.updated_at) : '-'}
                    />
                    <DetailRow label="Người tạo" value={creatorDisplay} />
                  </Flex>
                </div>

                <Separator className="my-2" />

                <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
                  <Flex direction="column" gap="2">
                    <DetailRow
                      label="Nguồn F2"
                      value={
                        initialData.f2_source
                          ? (f2SourceLabels?.[initialData.f2_source] ?? initialData.f2_source)
                          : '-'
                      }
                    />
                    {initialData.f2_source_director_detail && (
                      <DetailRow
                        label="Giám đốc nguồn"
                        value={
                          [
                            initialData.f2_source_director_detail.code,
                            initialData.f2_source_director_detail.fullname,
                          ]
                            .filter(Boolean)
                            .join(' - ') || '-'
                        }
                      />
                    )}
                  </Flex>
                  <Flex direction="column" gap="2">
                    <DetailRow
                      label="Người đại diện MVL"
                      value={
                        <Flex align="center" gap="2">
                          <span>{initialData.mvl_representative_detail?.fullname || '-'}</span>
                          {canEditRepresentative && (
                            <button
                              type="button"
                              onClick={handleEditRepresentative}
                              title="Sửa người đại diện"
                              className="text-content-dark-4 hover:text-action-primary-red-default"
                            >
                              <IconPencilsimple size={16} />
                            </button>
                          )}
                        </Flex>
                      }
                    />
                    <DetailRow
                      label="Chức vụ đại diện"
                      value={initialData.mvl_representative_detail?.position?.name || '-'}
                    />
                  </Flex>
                </div>
              </div>
            ) : (
              <div className="bg-background-1 rounded-md">
                <h3 className="text-content-dark-1 mb-4 text-lg font-semibold">
                  Thông tin đối chiếu
                </h3>
                <div className="grid grid-cols-1 gap-x-4 gap-y-2 lg:grid-cols-12">
                  <div className="h-fit lg:col-span-4">
                    <ReadOnlyField label="Sàn giao dịch" value={exchangeDisplay} required />
                  </div>
                  <div className="h-fit lg:col-span-4">
                    <ReadOnlyField
                      label="Thông tin bán hàng"
                      value={salesAllocationDisplay}
                      required
                    />
                  </div>
                  <FormController
                    register={register}
                    control={control}
                    name="reconciliation_date"
                    Field={DatePicker}
                    wrapperClassName="lg:col-span-4 h-fit"
                    fieldProps={{
                      label: 'Ngày đối chiếu',
                      required: true,
                      allowManualInput: true,
                      disabled: isSubmitting,
                    }}
                  />
                  <FormController
                    register={register}
                    control={control}
                    name="note"
                    Field={TextArea}
                    wrapperClassName="lg:col-span-12"
                    fieldProps={{
                      label: 'Ghi chú',
                      placeholder: 'Nhập ghi chú',
                      disabled: isSubmitting,
                    }}
                  />
                </div>
              </div>
            )}

            <Separator />

            <div className="bg-background-1 rounded-md">
              <h3 className="text-content-dark-1 mb-4 text-lg font-semibold">
                Chi tiết các căn trong phiếu ({selectedCanCount} căn)
              </h3>

              <div ref={scrollContainerRef} className="space-y-4">
                {fields.map((field, index) => {
                  const item = watchedItems[index] ?? createEmptyF2ReconciliationSheetItem()
                  const pid = Number(item?.product_inventory_id)
                  return (
                    <F2ReconciliationLineCard
                      key={field.id}
                      index={index}
                      item={item}
                      selectedDeal={getSelectedDeal(pid)}
                      exchangeId={initialData.exchange_detail?.id ?? null}
                      isSubmitting={isSubmitting}
                      loadDealOptions={loadDealOptions}
                      loadInitialDealOptions={loadInitialDealOptions}
                      verified={pid > 0 && verifiedKeys.has(pid)}
                      onToggleVerified={() => handleToggleVerified(pid)}
                      excludeInvestorSheetId={excludeSheetId}
                      serverComputed={serverComputedByProductId.get(pid) ?? null}
                    />
                  )
                })}
              </div>
            </div>

            {/* Tổng kết phiếu (BE) — số lấy thẳng từ sheet detail (total_amount/total_vat_amount/
                total_amount_with_vat), KHÔNG tính FE. Hiển thị giống hệt CĐT (ReconSheetTotalSummary). */}
            {(initialData.reconciliations?.length ?? 0) > 0 && (
              <>
                <Separator orientation="horizontal" className="!w-full" />
                <ReconSheetTotalSummary
                  net={Number(initialData.total_amount ?? 0)}
                  vat={Number(initialData.total_vat_amount ?? 0)}
                  withVat={Number(initialData.total_amount_with_vat ?? 0)}
                />
              </>
            )}

            {!isView && (
              <>
                <Separator orientation="horizontal" className="!w-full" />
                <Flex gap="3" justify="end" className="pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" loading={isSubmitting} leftIcon={<Check size={16} />}>
                    Cập nhật
                  </Button>
                </Flex>
              </>
            )}
          </form>
        </FormProvider>
      </ReconModeProvider>
    </ReconKindProvider>
  )
}

export default F2ReconciliationForm
