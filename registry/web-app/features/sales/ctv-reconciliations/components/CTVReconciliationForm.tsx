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

import {
  createEmptyCTVReconciliationSheetItem,
  ctvReconciliationSheetSchema,
  type CTVReconciliationSheetValues,
} from '../schemas/ctv-reconciliation-sheet-schema'
import {
  buildCTVServerComputedByProductId,
  mapCTVSheetToFormValues,
} from '../adapters/ctv-reconciliation-adapter'
import type { CTVReconciliationSheet } from '../services/ctv-reconciliation-sheet-service'
import { ctvReconciliationConfig } from '../config/ctv-reconciliation-config'
import { useCTVReconLineSources } from '../hooks/useCTVReconLineSources'
import CTVReconciliationLineCard from './CTVReconciliationLineCard'
import CTVReconciliationStatusBadge from './CTVReconciliationStatusBadge'

/**
 * CTV reconciliation sheet form — ONE component for both edit and view (mirrors
 * `F2ReconciliationForm`). CTV has NO create (sheets are generated from the parent CĐT commission
 * shares), so the only modes are:
 * - `edit`: read-only sheet header (project/SA/collaborator fixed) + editable date/note + the
 *   canonical card tree. (Dormant — màn CTV chỉ xem; không còn link tới đây.)
 * - `view`: sheet info block + the same card tree read-only (single "MV ghi nhận" column, số BE).
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

type CTVReconciliationFormProps = {
  /** `edit` → editable date/note; `view` → read-only detail (same card tree). */
  mode?: 'edit' | 'view'
  initialData: CTVReconciliationSheet
  onSubmit?: (values: CTVReconciliationSheetValues) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

const CTVReconciliationForm = ({
  mode = 'view',
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  scrollContainerRef,
}: CTVReconciliationFormProps) => {
  const isView = mode === 'view'
  // Thiếu quyền xem phiếu CĐT thì dòng "Sinh từ" vẫn hiện mã, chỉ bỏ link.
  const canViewInvestorSheet = useAbility().can('retrieve', 'investor_reconciliation_sheet')

  const defaultValues = useMemo<CTVReconciliationSheetValues>(
    () => mapCTVSheetToFormValues(initialData),
    [initialData]
  )

  const form = useForm<CTVReconciliationSheetValues>({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    // Same resolver shape as F2/CĐT: the canonical item schema coerces + defaults, so z.input ≠ z.output
    // and zodResolver's inferred type needs this cast (not a shape paper-over).
    resolver: zodResolver(
      ctvReconciliationSheetSchema
    ) as unknown as Resolver<CTVReconciliationSheetValues>,
    defaultValues,
  })

  const { register, control, handleSubmit, formState } = form
  const scrollToFirstError = useScrollToError(formState.errors)

  const { fields } = useFieldArray({ control, name: 'items' })
  const watchedItems = useWatch({ control, name: 'items' }) || []

  const { getSelectedDeal, loadInitialDealOptions, loadDealOptions } =
    useCTVReconLineSources(initialData)

  // BE-computed totals per căn (CTV) — engine hiển thị NET/Phải-thu/sub_total theo số BE.
  const serverComputedByProductId = useMemo(
    () => buildCTVServerComputedByProductId(initialData),
    [initialData]
  )

  // FE-only per-căn "Đã xác nhận" review markers (edit only) — mirrors F2.
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

  const collaboratorDisplay = useMemo(() => {
    const c = initialData.collaborator_detail
    if (!c?.code && !c?.name) return '-'
    return [c?.code, c?.name].filter(Boolean).join(' - ')
  }, [initialData.collaborator_detail])

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
    async (values: CTVReconciliationSheetValues) => {
      if (onSubmit) await onSubmit(values)
    },
    [onSubmit]
  )

  const handleInvalid = useCallback(() => {
    scrollToFirstError()
  }, [scrollToFirstError])

  return (
    <ReconKindProvider config={ctvReconciliationConfig}>
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
                    <DetailRow label="Thông tin bán hàng" value={salesAllocationDisplay} />
                    <DetailRow label="Cộng tác viên" value={collaboratorDisplay} />
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
                          <CTVReconciliationStatusBadge status={initialData.status} />
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
              </div>
            ) : (
              <div className="bg-background-1 rounded-md">
                <h3 className="text-content-dark-1 mb-4 text-lg font-semibold">
                  Thông tin đối chiếu CTV
                </h3>
                <div className="grid grid-cols-1 gap-x-4 gap-y-2 lg:grid-cols-12">
                  <div className="h-fit lg:col-span-3">
                    <ReadOnlyField
                      label="Dự án"
                      value={initialData.project_detail?.name ?? '-'}
                      required
                    />
                  </div>
                  <div className="h-fit lg:col-span-3">
                    <ReadOnlyField
                      label="Thông tin bán hàng"
                      value={salesAllocationDisplay}
                      required
                    />
                  </div>
                  <div className="h-fit lg:col-span-3">
                    <ReadOnlyField label="Cộng tác viên" value={collaboratorDisplay} required />
                  </div>
                  <FormController
                    register={register}
                    control={control}
                    name="reconciliation_date"
                    Field={DatePicker}
                    wrapperClassName="lg:col-span-3 h-fit"
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
                  const item = watchedItems[index] ?? createEmptyCTVReconciliationSheetItem()
                  const pid = Number(item?.product_inventory_id)
                  return (
                    <CTVReconciliationLineCard
                      key={field.id}
                      index={index}
                      item={item}
                      selectedDeal={getSelectedDeal(pid)}
                      isSubmitting={isSubmitting}
                      loadDealOptions={loadDealOptions}
                      loadInitialDealOptions={loadInitialDealOptions}
                      verified={pid > 0 && verifiedKeys.has(pid)}
                      onToggleVerified={() => handleToggleVerified(pid)}
                      serverComputed={serverComputedByProductId.get(pid) ?? null}
                    />
                  )
                })}
              </div>
            </div>

            {/* Tổng kết phiếu (BE) — CTV theo thuế TNCN (PIT): total_amount (trước thuế) /
                total_pit_amount (thuế TNCN) / total_amount_after_pit (sau thuế). Số lấy thẳng từ sheet
                detail, KHÔNG tính FE. */}
            {(initialData.reconciliations?.length ?? 0) > 0 && (
              <>
                <Separator orientation="horizontal" className="!w-full" />
                <ReconSheetTotalSummary
                  taxMode="pit"
                  net={Number(initialData.total_amount ?? 0)}
                  vat={Number(initialData.total_pit_amount ?? 0)}
                  withVat={Number(initialData.total_amount_after_pit ?? 0)}
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

export default CTVReconciliationForm
