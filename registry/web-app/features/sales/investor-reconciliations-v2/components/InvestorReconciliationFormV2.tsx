import { useCallback } from 'react'
import { Controller, FormProvider, type Resolver, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import { Check } from 'lucide-react'

import { Button, Select, TextArea } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import FormController from '@/components/ui/form/FormController'
import { Separator } from '@/components/ui/separator'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import {
  investorReconciliationSheetCreateSchema,
  type InvestorReconciliationSheetCreateValues,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import useAppConstant from '@/hooks/useAppConstant'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { useSourceExchangeSelect } from '@/hooks/useSourceExchangeSelect'
import { useScrollToError } from '@/hooks/useScrollToError'
import { useProject } from '@/services/realestate-service'
import { handleApiError } from '@/utils/error-utils'
import { ReconciliationSourceType } from '@/constants/api-schema-aliases'

const SourceType = ReconciliationSourceType

type InvestorReconciliationFormV2Props = {
  onSubmit: (values: InvestorReconciliationSheetCreateValues) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

/**
 * Ô "label : info" read-only cho field dẫn xuất (Chủ đầu tư suy ra từ Dự án) — không phải dropdown thật.
 */
function MetaInfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <span className="typo-body-base-semibold text-neutral-90">{label}</span>
      <span className="typo-body-base-regular text-content-dark-1 flex min-h-[38px] items-center break-words">
        {value || '—'}
      </span>
    </div>
  )
}

/**
 * V2 create-only form — layout mới theo yêu cầu 2.0: hàng 1 (Dự án · Chủ đầu tư), hàng 2 (Ngày đối
 * chiếu · Loại nguồn · Nguồn hàng), hàng 3 (Ghi chú phiếu). Toàn bộ business rule (khoá field cho tới
 * khi đủ thông tin, Nguồn hàng chỉ bắt buộc khi F0...) giữ nguyên như v1
 * (`investor-reconciliations/components/InvestorReconciliationForm.tsx`) — chỉ đổi cách sắp xếp field.
 * Tái sử dụng nguyên schema/hook/service của v1, không nhân bản logic dữ liệu.
 */
const InvestorReconciliationFormV2 = ({
  onSubmit,
  onCancel,
  isSubmitting,
}: InvestorReconciliationFormV2Props) => {
  const form = useForm<InvestorReconciliationSheetCreateValues>({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    resolver: zodResolver(
      investorReconciliationSheetCreateSchema
    ) as unknown as Resolver<InvestorReconciliationSheetCreateValues>,
    defaultValues: {
      source_type: SourceType.direct,
      reconciliation_date: '',
      note: '',
      items: [],
    },
  })

  const { register, control, handleSubmit, setValue, setError, formState } = form
  const scrollToFirstError = useScrollToError(formState.errors)

  const projectId = Number(useWatch({ control, name: 'project_id' }) || 0)
  const sourceType = useWatch({ control, name: 'source_type' }) as
    | ReconciliationSourceType
    | undefined
  const sourceExchangeId = Number(useWatch({ control, name: 'source_exchange_id' }) || 0)
  const isF0Source = sourceType === SourceType.F0

  // "Chủ đầu tư" là read-only, suy ra từ Dự án đã chọn (request không có investor_id) — giống hệt v1.
  const { data: projectDetail } = useProject(projectId)
  const investorName = projectDetail?.investor?.name ?? ''

  const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()
  const { loadSourceExchangeOptions, loadInitialSourceExchangeOptions } = useSourceExchangeSelect({
    project: projectId > 0 ? projectId : undefined,
  })

  const { keysMapOptions } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.SOURCE_TYPE_CHOICES],
  })
  const sourceTypeOptions =
    keysMapOptions.get(APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION_SHEET.SOURCE_TYPE_CHOICES) ??
    []

  const isSourceTypeEnabled = Boolean(projectId)
  const isMetaEnabled = Boolean(projectId && sourceType && (!isF0Source || sourceExchangeId > 0))

  const handleProjectChange = useCallback(
    (rawValue: string | number | null) => {
      const nextValue =
        rawValue === null || rawValue === undefined || rawValue === ''
          ? undefined
          : Number(rawValue)
      setValue('project_id', nextValue as never, { shouldValidate: false, shouldDirty: true })
      setValue('source_exchange_id', undefined as never, {
        shouldValidate: false,
        shouldDirty: true,
      })
    },
    [setValue]
  )

  const handleSourceTypeChange = useCallback(
    (rawValue: string | number | null) => {
      const nextValue =
        rawValue === null || rawValue === undefined || rawValue === ''
          ? undefined
          : String(rawValue)
      setValue('source_type', nextValue as never, { shouldValidate: false, shouldDirty: true })
      setValue('source_exchange_id', undefined as never, {
        shouldValidate: false,
        shouldDirty: true,
      })
    },
    [setValue]
  )

  const onValid = useCallback(
    async (values: InvestorReconciliationSheetCreateValues) => {
      try {
        await onSubmit(values)
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [onSubmit, setError]
  )

  const handleInvalid = useCallback(() => {
    scrollToFirstError()
  }, [scrollToFirstError])

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onValid, handleInvalid)} className="space-y-6 px-7 py-4 pb-16">
        <div className="bg-background-1 rounded-md">
          <h3 className="text-content-dark-1 mb-4 text-lg font-semibold">
            Thông tin chung của phiếu
          </h3>

          {/* Hàng 1: Dự án · Chủ đầu tư */}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Controller
              control={control}
              name="project_id"
              render={({ field, fieldState }) => (
                <Select
                  label="Dự án"
                  placeholder="Chọn dự án"
                  loadOptions={loadProjectOptions}
                  loadInitialOptions={loadInitialProjectOptions}
                  enableSearch
                  required
                  disabled={isSubmitting}
                  value={field.value ?? null}
                  onChange={(value) => handleProjectChange(value as string | number | null)}
                  error={fieldState.error?.message}
                />
              )}
            />

            <MetaInfoField label="Chủ đầu tư" value={investorName} />
          </div>

          {/* Hàng 2: Ngày đối chiếu · Loại nguồn · Nguồn hàng (chỉ hiện khi F0) */}
          <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormController
              register={register}
              control={control}
              name="reconciliation_date"
              Field={DatePicker}
              wrapperClassName="h-fit"
              fieldProps={{
                label: 'Ngày đối chiếu',
                required: true,
                allowManualInput: true,
                disabled: isSubmitting || !isMetaEnabled,
              }}
            />

            <Controller
              control={control}
              name="source_type"
              render={({ field, fieldState }) => (
                <Select
                  label="Loại nguồn"
                  placeholder="Chọn loại nguồn"
                  options={sourceTypeOptions}
                  disabled={!isSourceTypeEnabled || !!isSubmitting}
                  value={field.value ?? null}
                  onChange={(value) => handleSourceTypeChange(value as string | number | null)}
                  error={fieldState.error?.message}
                />
              )}
            />

            {isF0Source && (
              <Controller
                control={control}
                name="source_exchange_id"
                render={({ field, fieldState }) => (
                  <Select
                    label="Nguồn hàng"
                    placeholder="Chọn nguồn hàng"
                    loadOptions={loadSourceExchangeOptions}
                    loadInitialOptions={loadInitialSourceExchangeOptions}
                    enableSearch
                    required
                    disabled={!isSourceTypeEnabled || !!isSubmitting}
                    value={field.value ?? null}
                    onChange={(value) =>
                      field.onChange(
                        value === null || value === undefined || value === ''
                          ? undefined
                          : Number(value)
                      )
                    }
                    error={fieldState.error?.message}
                  />
                )}
              />
            )}
          </div>

          {/* Hàng 3: Ghi chú phiếu */}
          <div className="mt-3 grid grid-cols-1">
            <FormController
              register={register}
              control={control}
              name="note"
              Field={TextArea}
              fieldProps={{
                label: 'Ghi chú phiếu',
                placeholder: 'Ghi chú chung cho cả phiếu...',
                disabled: isSubmitting || !isMetaEnabled,
              }}
            />
          </div>
        </div>

        <Separator orientation="horizontal" className="!w-full" />

        <Flex gap="3" justify="end" className="pt-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" loading={isSubmitting} leftIcon={<Check size={16} />}>
            Tạo phiếu nháp & Thêm căn đối chiếu
          </Button>
        </Flex>
      </form>
    </FormProvider>
  )
}

export default InvestorReconciliationFormV2
