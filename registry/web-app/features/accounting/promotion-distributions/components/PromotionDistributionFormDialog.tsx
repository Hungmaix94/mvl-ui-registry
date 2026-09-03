import { useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'

import { Button, Select, CurrencyInput, TextArea } from '@/components/ui'
import { FileUpload } from '@/components/ui/file-upload/FileUpload'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { useAbility } from '@/lib/ability'
import { useAccountingPeriodSelect } from '@/hooks/useAccountingPeriodSelect'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { formatDate } from '@/utils/date-utils'
import { handleApiError } from '@/utils/error-utils'
import {
  promotionDistributionFormSchema,
  type PromotionDistributionFormValues,
  DEFAULT_PROMOTION_DISTRIBUTION_FORM,
} from '@/features/accounting/promotion-distributions/types/promotion-distribution-types'
import { PROMOTION_DISTRIBUTION_DEP } from '@/features/accounting/promotion-distributions/constants/promotion-distribution-constants'

type PromotionDistributionFormDialogProps = {
  mode: 'create' | 'edit'
  defaultValues?: Partial<PromotionDistributionFormValues>
  onSubmit: (values: PromotionDistributionFormValues) => void | Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export default function PromotionDistributionFormDialog({
  mode,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: PromotionDistributionFormDialogProps) {
  const ability = useAbility()
  const canSelectPeriod = ability.can(
    PROMOTION_DISTRIBUTION_DEP.ACCOUNTING_PERIOD.action,
    PROMOTION_DISTRIBUTION_DEP.ACCOUNTING_PERIOD.subject
  )
  const canSelectProject = ability.can(
    PROMOTION_DISTRIBUTION_DEP.PROJECT.action,
    PROMOTION_DISTRIBUTION_DEP.PROJECT.subject
  )

  const { loadAccountingPeriodOptions, loadInitialAccountingPeriodOptions } =
    useAccountingPeriodSelect()
  const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()

  // On create, default the marketing-cost cutoff date to today (DatePicker format DD/MM/YYYY).
  const createDefaults = mode === 'create' ? { mkt_cutoff_date: formatDate(new Date()) } : {}

  const { register, control, handleSubmit, setError, setValue } =
    useForm<PromotionDistributionFormValues>({
      resolver: zodResolver(promotionDistributionFormSchema) as never,
      mode: 'onTouched',
      defaultValues: {
        ...DEFAULT_PROMOTION_DISTRIBUTION_FORM,
        ...createDefaults,
        ...defaultValues,
      },
    })

  const handleFormSubmit = useCallback(
    async (values: PromotionDistributionFormValues) => {
      try {
        await onSubmit(values)
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [onSubmit, setError]
  )

  return (
    <Form handleSubmit={handleSubmit as never} onSubmit={handleFormSubmit} loading={isSubmitting}>
      <Flex direction="column" gap="5" className="w-full px-1 py-2">
        <p className="typo-body-sm-regular text-content-dark-3">
          Khai báo dự án và chi phí bán hàng. Sau khi lưu sẽ tạo bản nháp và mở màn chi tiết để phân
          chia hoa hồng.
        </p>

        <FormController
          register={register}
          name="project"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Dự án',
            placeholder: 'Chọn dự án',
            required: true,
            loadOptions: loadProjectOptions,
            loadInitialOptions: loadInitialProjectOptions,
            enableSearch: true,
            searchPlaceholder: 'Tìm kiếm dự án...',
            isClearable: true,
            disabled: !canSelectProject,
          }}
        />

        <FormController
          register={register}
          name="accounting_period"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Kỳ kế toán',
            placeholder: 'Chọn kỳ kế toán',
            required: true,
            loadOptions: loadAccountingPeriodOptions,
            loadInitialOptions: loadInitialAccountingPeriodOptions,
            isClearable: true,
            disabled: !canSelectPeriod,
          }}
        />

        <FormController
          register={register}
          name="mkt_cutoff_date"
          control={control}
          Field={DatePicker}
          fieldProps={{
            label: 'Ngày chốt chi phí bán hàng',
            required: true,
            placeholder: 'DD/MM/YYYY',
            allowManualInput: true,
            clearable: true,
          }}
        />

        <FormController
          register={register}
          name="marketing_cost"
          control={control}
          Field={CurrencyInput}
          fieldProps={{
            label: 'Chi phí bán hàng (VND)',
            placeholder: 'Nhập chi phí bán hàng',
          }}
        />

        <Controller
          control={control}
          name="attachments"
          render={({ field, fieldState }) => (
            <FileUpload
              label="Tài liệu đính kèm"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              multiple
              required={false}
              purpose="accounting_promotion_distribution"
              existingFiles={defaultValues?.attachments_detail || []}
              onKeptExistingIdsChange={(ids: number[]) => setValue('kept_attachment_ids', ids)}
              disabled={isSubmitting}
            />
          )}
        />

        {mode === 'edit' && (
          <FormController
            register={register}
            name="note"
            control={control}
            Field={TextArea}
            fieldProps={{
              label: 'Ghi chú',
              placeholder: 'Nhập ghi chú',
            }}
          />
        )}

        <Flex justify="end" gap="3" className="pt-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Lưu (Nháp)
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}
