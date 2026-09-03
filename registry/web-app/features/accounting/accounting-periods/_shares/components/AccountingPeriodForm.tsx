import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'

import { Button, FullScreenLoading, Select, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import {
  type AccountingPeriodRequest,
  useAccountingPeriod,
  useCreateAccountingPeriod,
  useUpdateAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import {
  accountingPeriodFormSchema,
  type AccountingPeriodFormValues,
  DEFAULT_ACCOUNTING_PERIOD_FORM_VALUES,
} from '@/features/accounting/accounting-periods/types/accounting-period-types'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { APP_PATH } from '@/routes'
import toastService from '@/services/toast-service.tsx'
import { formatDateTimeToApi, parseDateFromApi } from '@/utils/date-utils'
import { handleApiError } from '@/utils/error-utils.ts'
import { withRememberedSearch } from '@/utils/list-url-memory'

interface AccountingPeriodFormProps {
  periodId?: number
  onSuccess?: () => void
  onCancel?: () => void
}

export default function AccountingPeriodForm({
  periodId,
  onSuccess,
  onCancel,
}: AccountingPeriodFormProps) {
  const navigate = useNavigate()
  const isEditMode = !!periodId
  const isInitialized = useRef(false)

  const { data: period, isLoading: isLoadingPeriod } = useAccountingPeriod(periodId ?? 0, {
    enabled: isEditMode,
  })
  const createMutation = useCreateAccountingPeriod()
  const updateMutation = useUpdateAccountingPeriod()
  const invalidateQueries = useInvalidateQueries()

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1),
        label: `Tháng ${i + 1}`,
      })),
    []
  )

  const form = useForm<AccountingPeriodFormValues>({
    resolver: zodResolver(accountingPeriodFormSchema) as never,
    mode: 'onTouched',
    defaultValues: DEFAULT_ACCOUNTING_PERIOD_FORM_VALUES,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { isSubmitting },
  } = form

  // Pre-fill form when editing
  useEffect(() => {
    if (isEditMode && period && !isInitialized.current) {
      reset({
        year: period.year,
        month: period.month,
        locks_apply_at: period.locks_apply_at ? parseDateFromApi(period.locks_apply_at) : null,
        status: period.status,
      })
      isInitialized.current = true
    }
  }, [isEditMode, period, reset])

  const onSubmit = useCallback(
    async (values: AccountingPeriodFormValues) => {
      try {
        const payload: AccountingPeriodRequest = {
          year: Number(values.year),
          month: Number(values.month),
          locks_apply_at: values.locks_apply_at
            ? formatDateTimeToApi(values.locks_apply_at) || null
            : null,
          status: values.status as AccountingPeriodRequest['status'],
        }

        if (isEditMode && periodId) {
          await updateMutation.mutateAsync({ id: periodId, data: payload })
          toastService.success('Cập nhật kỳ kế toán thành công')
        } else {
          await createMutation.mutateAsync(payload)
          toastService.success('Tạo kỳ kế toán thành công')
        }

        await invalidateQueries.invalidateByPrefix('accounting/accounting-periods')

        if (onSuccess) {
          onSuccess()
        } else {
          navigate(APP_PATH.ACCOUNTING_PERIOD_MANAGEMENT)
        }
      } catch (error: unknown) {
        handleApiError(error, setError as never)
      }
    },
    [
      isEditMode,
      periodId,
      updateMutation,
      createMutation,
      invalidateQueries,
      onSuccess,
      navigate,
      setError,
    ]
  )

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    } else {
      navigate(withRememberedSearch(APP_PATH.ACCOUNTING_PERIOD_MANAGEMENT))
    }
  }, [onCancel, navigate])

  if (isEditMode && isLoadingPeriod) {
    return <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
  }

  if (isEditMode && !period) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <p className="typo-body-base-regular text-content-dark-3">Không tìm thấy kỳ kế toán</p>
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Quay lại
        </Button>
      </div>
    )
  }

  return (
    <Form handleSubmit={handleSubmit} onSubmit={onSubmit} loading={isSubmitting}>
      <Flex direction="column" gap="7" className="w-full">
        {/* Section 1: Thông tin kỳ kế toán */}
        <div className="flex flex-col gap-5">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Thông tin kỳ kế toán</h2>

          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="year"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Năm',
                required: true,
                type: 'number',
                placeholder: 'VD: 2026',
                disabled: isEditMode, // Năm không đổi khi cập nhật
              }}
            />
            <FormController
              register={register}
              name="month"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Tháng',
                required: true,
                placeholder: 'Chọn tháng',
                options: monthOptions,
                disabled: isEditMode, // Tháng không đổi khi cập nhật
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Controller
              name="locks_apply_at"
              control={control}
              render={({ field, fieldState: { error } }) => (
                <DatePicker
                  label="Khóa áp dụng lúc"
                  placeholder="Chọn thời gian khóa"
                  value={field.value ? new Date(field.value) : undefined}
                  onChange={(date) => field.onChange(date || null)}
                  error={error?.message}
                  clearable
                />
              )}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-border-1 flex justify-end gap-4 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
            className={'w-[150px]'}
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            className={'w-[150px]'}
          >
            {isEditMode ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </div>
      </Flex>
    </Form>
  )
}
