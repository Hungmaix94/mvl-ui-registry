import { useState, forwardRef, useImperativeHandle, useEffect, useMemo } from 'react'
import { type DateRange } from 'react-day-picker'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import Form from '@/components/ui/form/Form.tsx'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import FormController from '@/components/ui/form/FormController.tsx'
import { Flex, Grid, Text } from '@radix-ui/themes'
import { Checkbox, Select, TextField } from '@/components/ui'
import { useRecruitmentSourceSelect } from '@/hooks/useRecruitmentSourceSelect.ts'
import { useRecruitmentChannelSelect } from '@/hooks/useRecruitmentChannelSelect.ts'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect.ts'
import { useBranchSelect } from '@/hooks/useBranchSelect.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import {
  DEFAULT_INVALID_REFEREE_MIN_WORKING_DAYS,
  INVALID_REASON_FULL_LABELS,
  RECRUITMENT_EXPENSE_YES_NO_OPTIONS,
  type TRecruitmentExpenseYesNo,
} from '@/constants/recruitment-expense-filter.ts'

export type RecruitmentExpenseFilterFormRef = {
  clearForm: () => void
  getValues?: () => RecruitmentExpenseFilterForm
  submitForm: () => void
}

type RecruitmentExpenseFilterFormProps = {
  initialValues?: Record<string, any>
  onApply: (data: RecruitmentExpenseFilterForm) => void
  onClear: () => void
}

export type RecruitmentExpenseFilterForm = {
  dateRange?: DateRange
  recruitmentSource?: string
  recruitmentChannel?: string
  referee?: string
  referrer?: string
  branch?: number
  paymentStatuses?: string[]
  is_valid?: TRecruitmentExpenseYesNo
  invalid_referee_in_backoffice?: TRecruitmentExpenseYesNo
  invalid_referrer_left_by_expense_date?: TRecruitmentExpenseYesNo
  invalid_referrer_was_leadership?: TRecruitmentExpenseYesNo
  invalid_referee_min_working_days?: number
}

const Schema = z.object({
  dateRange: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .nullable()
    .optional(),
  recruitmentSource: z.coerce.number().optional(),
  recruitmentChannel: z.coerce.number().optional(),
  referee: z.coerce.number().optional(),
  referrer: z.coerce.number().optional(),
  branch: z.coerce.number().optional(),
  paymentStatuses: z.array(z.string()).optional(),
  is_valid: z.string().optional(),
  invalid_referee_in_backoffice: z.string().optional(),
  invalid_referrer_left_by_expense_date: z.string().optional(),
  invalid_referrer_was_leadership: z.string().optional(),
  invalid_referee_min_working_days: z
    .union([z.coerce.number().int().nonnegative(), z.literal(''), z.undefined()])
    .optional()
    .transform((v) => (typeof v === 'number' ? v : undefined)),
})

const RecruitmentExpenseFilterForm = forwardRef<
  RecruitmentExpenseFilterFormRef,
  RecruitmentExpenseFilterFormProps
>(({ initialValues, onApply }, ref) => {
  const [isLoading, setIsLoading] = useState(false)
  const [shouldResetToInitial, setShouldResetToInitial] = useState<boolean>(true)
  const [formKey, setFormKey] = useState(0)

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.RECRUITMENT.EXPENSE.RecruitmentExpensePaymentStatus],
  })

  const paymentStatusOptions = useMemo(() => {
    return (
      keysMapOptions.get(APP_CONSTANT_KEY.RECRUITMENT.EXPENSE.RecruitmentExpensePaymentStatus) || []
    )
  }, [keysMapOptions])

  const { control, handleSubmit, register, reset, getValues, setValue, watch } =
    useForm<RecruitmentExpenseFilterForm>({
      resolver: zodResolver(Schema) as any,
      defaultValues: {
        dateRange: initialValues?.dateRange || undefined,
        recruitmentSource: initialValues?.recruitmentSource || undefined,
        recruitmentChannel: initialValues?.recruitmentChannel || undefined,
        referee: initialValues?.referee || undefined,
        referrer: initialValues?.referrer || undefined,
        branch: initialValues?.branch || undefined,
        paymentStatuses: Array.isArray(initialValues?.paymentStatuses)
          ? initialValues.paymentStatuses
          : [],
        is_valid: initialValues?.is_valid || undefined,
        invalid_referee_in_backoffice: initialValues?.invalid_referee_in_backoffice || undefined,
        invalid_referrer_left_by_expense_date:
          initialValues?.invalid_referrer_left_by_expense_date || undefined,
        invalid_referrer_was_leadership:
          initialValues?.invalid_referrer_was_leadership || undefined,
        invalid_referee_min_working_days:
          initialValues?.invalid_referee_min_working_days ??
          DEFAULT_INVALID_REFEREE_MIN_WORKING_DAYS,
      },
    })

  const watchedPaymentStatuses = watch('paymentStatuses') || []

  const { loadRecruitmentSourceOptions, loadInitialRecruitmentSourceOptions } =
    useRecruitmentSourceSelect()
  const { loadRecruitmentChannelOptions, loadInitialRecruitmentChannelOptions } =
    useRecruitmentChannelSelect()
  const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect()
  const { loadBranchOptions, loadInitialBranchOptions } = useBranchSelect()

  // Update form values when initialValues change
  useEffect(() => {
    if (shouldResetToInitial && initialValues && Object.keys(initialValues).length > 0) {
      reset({
        dateRange: initialValues?.dateRange || null,
        recruitmentSource: initialValues?.recruitmentSource || undefined,
        recruitmentChannel: initialValues?.recruitmentChannel || undefined,
        referee: initialValues?.referee || undefined,
        referrer: initialValues?.referrer || undefined,
        branch: initialValues?.branch || undefined,
        paymentStatuses: Array.isArray(initialValues?.paymentStatuses)
          ? initialValues.paymentStatuses
          : [],
        is_valid: initialValues?.is_valid || undefined,
        invalid_referee_in_backoffice: initialValues?.invalid_referee_in_backoffice || undefined,
        invalid_referrer_left_by_expense_date:
          initialValues?.invalid_referrer_left_by_expense_date || undefined,
        invalid_referrer_was_leadership:
          initialValues?.invalid_referrer_was_leadership || undefined,
        invalid_referee_min_working_days:
          initialValues?.invalid_referee_min_working_days ??
          DEFAULT_INVALID_REFEREE_MIN_WORKING_DAYS,
      })
    }
  }, [initialValues, reset, shouldResetToInitial])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        setShouldResetToInitial(false)
        // First increment formKey to force re-render
        setFormKey((prev) => prev + 1)
        // Reset form with undefined values
        reset(
          {
            dateRange: undefined,
            recruitmentSource: undefined,
            recruitmentChannel: undefined,
            referee: undefined,
            referrer: undefined,
            branch: undefined,
            paymentStatuses: [],
            is_valid: undefined,
            invalid_referee_in_backoffice: undefined,
            invalid_referrer_left_by_expense_date: undefined,
            invalid_referrer_was_leadership: undefined,
            invalid_referee_min_working_days: DEFAULT_INVALID_REFEREE_MIN_WORKING_DAYS,
          },
          {
            keepDefaultValues: false,
            keepErrors: false,
            keepDirty: false,
            keepIsSubmitted: false,
            keepTouched: false,
            keepIsValid: false,
            keepSubmitCount: false,
          }
        )
        // Explicitly set values to undefined to ensure Controller updates
        setValue('dateRange', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('recruitmentSource', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('recruitmentChannel', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('referee', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('referrer', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('branch', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('paymentStatuses', [], { shouldDirty: false, shouldValidate: false })
        setValue('is_valid', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('invalid_referee_in_backoffice', undefined, {
          shouldDirty: false,
          shouldValidate: false,
        })
        setValue('invalid_referrer_left_by_expense_date', undefined, {
          shouldDirty: false,
          shouldValidate: false,
        })
        setValue('invalid_referrer_was_leadership', undefined, {
          shouldDirty: false,
          shouldValidate: false,
        })
        setValue('invalid_referee_min_working_days', DEFAULT_INVALID_REFEREE_MIN_WORKING_DAYS, {
          shouldDirty: false,
          shouldValidate: false,
        })
      },
      getValues: () => getValues(),
      submitForm: () => handleSubmit(onSubmit)(),
    }),
    [reset, setValue, getValues, handleSubmit]
  )

  const handleCheckboxChange = (value: string, checked: boolean) => {
    const currentValues = getValues('paymentStatuses') || []
    const newValues = checked ? [...currentValues, value] : currentValues.filter((v) => v !== value)
    setValue('paymentStatuses', newValues, { shouldDirty: true })
  }

  const onSubmit = async (data: RecruitmentExpenseFilterForm) => {
    setIsLoading(true)
    try {
      onApply(data)
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Form
        loading={isLoading}
        onSubmit={onSubmit}
        handleSubmit={handleSubmit as any}
        key={formKey}
      >
        <Flex direction={'column'} gap={'4'}>
          <div className="flex flex-col gap-2 space-y-2">
            <label className="typo-body-base-semibold text-content-dark-2 mb-0">
              Chọn khoảng thời gian
            </label>
            <FormController
              register={register}
              name="dateRange"
              control={control}
              Field={DateRangePicker}
              fieldProps={{
                className: 'w-full',
                showQuickSelect: true,
                onApply: (_range: DateRange | undefined) => {
                  // DateRangePicker will call onChange automatically via FormController
                  // This onApply is just for any additional logic if needed
                },
                onCancel: () => {
                  // Handle cancel if needed
                },
              }}
            />
          </div>
          <div className="space-y-2">
            <FormController
              register={register}
              name="branch"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Chi nhánh',
                placeholder: 'Chọn chi nhánh',
                loadOptions: loadBranchOptions,
                loadInitialOptions: loadInitialBranchOptions,
                searchPlaceholder: 'Tìm kiếm chi nhánh...',
                enableSearch: true,
                async: true,
              }}
            />
          </div>
          <Grid columns={'2'} gap={'2'}>
            <div className="space-y-2">
              <FormController
                register={register}
                name="recruitmentSource"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Nguồn tuyển dụng',
                  placeholder: 'Chọn nguồn tuyển dụng',
                  loadOptions: loadRecruitmentSourceOptions,
                  loadInitialOptions: loadInitialRecruitmentSourceOptions,
                  searchPlaceholder: 'Tìm kiếm nguồn tuyển dụng...',
                  enableSearch: true,
                  async: true,
                }}
              />
            </div>
            <div className="space-y-2">
              <FormController
                register={register}
                name="recruitmentChannel"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Kênh tuyển dụng',
                  placeholder: 'Chọn kênh tuyển dụng',
                  loadOptions: loadRecruitmentChannelOptions,
                  loadInitialOptions: loadInitialRecruitmentChannelOptions,
                  searchPlaceholder: 'Tìm kiếm kênh tuyển dụng...',
                  enableSearch: true,
                  async: true,
                }}
              />
            </div>
          </Grid>
          <Grid columns={'2'} gap={'2'}>
            <div className="space-y-2">
              <FormController
                register={register}
                name="referee"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Người được giới thiệu',
                  placeholder: 'Chọn người được giới thiệu',
                  loadOptions: loadEmployeeOptions,
                  loadInitialOptions: loadInitialEmployeeOptions,
                  searchPlaceholder: 'Tìm kiếm nhân viên...',
                  enableSearch: true,
                  async: true,
                }}
              />
            </div>
            <div className="space-y-2">
              <FormController
                register={register}
                name="referrer"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Người giới thiệu',
                  placeholder: 'Chọn người giới thiệu',
                  loadOptions: loadEmployeeOptions,
                  loadInitialOptions: loadInitialEmployeeOptions,
                  searchPlaceholder: 'Tìm kiếm nhân viên...',
                  enableSearch: true,
                  async: true,
                }}
              />
            </div>
          </Grid>
          <div className="space-y-2">
            <Text className="text-content-dark-2 typo-body-base-semibold">Trạng thái</Text>
            <Flex direction="row" gap="2" className="pt-1">
              {paymentStatusOptions.map((option) => {
                const optionValue = String(option.value)
                const isChecked = watchedPaymentStatuses.includes(optionValue)
                return (
                  <Flex key={optionValue} align="center" gap="2">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(optionValue, checked === true)
                      }
                      id={`payment-status-${optionValue}`}
                    />
                    <label
                      htmlFor={`payment-status-${optionValue}`}
                      className="text-content-dark-1 typo-body-base-regular cursor-pointer"
                    >
                      {option.label}
                    </label>
                  </Flex>
                )
              })}
            </Flex>
          </div>

          <div className="space-y-2">
            <Text className="text-content-dark-2 typo-body-base-semibold"></Text>
            <Grid columns={'2'} gap={'2'} className="pt-1">
              <FormController
                register={register}
                name="is_valid"
                control={control}
                Field={Select}
                fieldProps={{
                  label: INVALID_REASON_FULL_LABELS.is_valid,
                  placeholder: 'Chọn',
                  options: RECRUITMENT_EXPENSE_YES_NO_OPTIONS,
                  onChange: (value?: TRecruitmentExpenseYesNo) =>
                    setValue('is_valid', value, { shouldDirty: true }),
                  clearable: true,
                }}
              />
              <FormController
                register={register}
                name="invalid_referee_min_working_days"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Số ngày làm việc ít hơn',
                  placeholder: '0',
                  type: 'number',
                  onChange: (value: string) => {
                    const trimmed = value?.trim?.() ?? ''
                    if (!trimmed) {
                      // Khi user xoá hết input → set về 0 thay vì undefined (tránh auto-fill 30)
                      setValue('invalid_referee_min_working_days', 0, { shouldDirty: true })
                      return
                    }
                    const parsed = parseInt(trimmed, 10)
                    setValue(
                      'invalid_referee_min_working_days',
                      Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
                      { shouldDirty: true }
                    )
                  },
                }}
              />
              <FormController
                register={register}
                name="invalid_referee_in_backoffice"
                control={control}
                Field={Select}
                fieldProps={{
                  label: INVALID_REASON_FULL_LABELS.invalid_referee_in_backoffice,
                  placeholder: 'Chọn',
                  options: RECRUITMENT_EXPENSE_YES_NO_OPTIONS,
                  onChange: (value?: TRecruitmentExpenseYesNo) =>
                    setValue('invalid_referee_in_backoffice', value, { shouldDirty: true }),
                  clearable: true,
                }}
              />
              <FormController
                register={register}
                name="invalid_referrer_left_by_expense_date"
                control={control}
                Field={Select}
                fieldProps={{
                  label: INVALID_REASON_FULL_LABELS.invalid_referrer_left_by_expense_date,
                  placeholder: 'Chọn',
                  options: RECRUITMENT_EXPENSE_YES_NO_OPTIONS,
                  onChange: (value?: TRecruitmentExpenseYesNo) =>
                    setValue('invalid_referrer_left_by_expense_date', value, {
                      shouldDirty: true,
                    }),
                  clearable: true,
                }}
              />
              <FormController
                register={register}
                name="invalid_referrer_was_leadership"
                control={control}
                Field={Select}
                fieldProps={{
                  label: INVALID_REASON_FULL_LABELS.invalid_referrer_was_leadership,
                  placeholder: 'Chọn',
                  options: RECRUITMENT_EXPENSE_YES_NO_OPTIONS,
                  onChange: (value?: TRecruitmentExpenseYesNo) =>
                    setValue('invalid_referrer_was_leadership', value, { shouldDirty: true }),
                  clearable: true,
                }}
              />
            </Grid>
          </div>
        </Flex>
      </Form>
    </>
  )
})

RecruitmentExpenseFilterForm.displayName = 'RecruitmentExpenseFilterForm'

export default RecruitmentExpenseFilterForm
