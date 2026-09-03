import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useMemo, useEffect, forwardRef } from 'react'
import { Flex, Grid } from '@radix-ui/themes'
import { type ContractTypeFormData, contractTypeSchema } from '../schemas/contract-type-schema.ts'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import {
  Button,
  CurrencyInput,
  FileUpload,
  RadioGroup,
  RichText,
  Select,
  TextArea,
  TextField,
} from '@/components/ui'
import {
  type ContractType,
  useCreateContractType,
  useUpdateContractType,
} from '@/features/contract/services/contract-type-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { useScrollToError } from '@/hooks/useScrollToError.ts'
import type { RadioGroupProps } from '@/components/ui/radio-group.tsx'
import type { TextFieldProps } from '@/components/ui/text-field/TextField.tsx'
import { ContractTax_calculation_method, ContractNet_percentage } from '@/api/schema.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import { ContractDurationType, ContractWorkingTimeType } from '@/constants/api-schema-aliases'

interface ContractTypeFormProps {
  initialData?: ContractType
  onSuccess?: () => void
  onCancel?: () => void
}

// Wrapper components with forwardRef for inline Field components
type DurationTypeRadioGroupProps = RadioGroupProps & {
  value?: string
  onChange?: (value: string) => void
  onSetValue?: (name: string, value: any) => void
  defaultEnumValue?: ContractDurationType
}

const DurationTypeRadioGroup = forwardRef<
  React.ElementRef<typeof RadioGroup>,
  DurationTypeRadioGroupProps
>(({ value, onChange, onSetValue, defaultEnumValue, ...props }, ref) => {
  // Remove custom props before passing to RadioGroup
  const {
    onSetValue: _onSetValue,
    defaultEnumValue: _defaultEnumValue,
    ...radioGroupProps
  } = props as any
  return (
    <RadioGroup
      {...radioGroupProps}
      ref={ref}
      value={value || defaultEnumValue || ContractDurationType.indefinite}
      onValueChange={(val: string) => {
        onChange?.(val)
        if (val === ContractDurationType.indefinite && onSetValue) {
          onSetValue('duration_months', null)
        }
      }}
    />
  )
})
DurationTypeRadioGroup.displayName = 'DurationTypeRadioGroup'

type TaxCalculationMethodRadioGroupProps = RadioGroupProps & {
  value?: string
  onChange?: (value: string) => void
  defaultEnumValue?: ContractTax_calculation_method
}

const TaxCalculationMethodRadioGroup = forwardRef<
  React.ElementRef<typeof RadioGroup>,
  TaxCalculationMethodRadioGroupProps
>(({ value, onChange, defaultEnumValue, ...props }, ref) => {
  const { defaultEnumValue: _defaultEnumValue, ...radioGroupProps } = props as any
  return (
    <RadioGroup
      {...radioGroupProps}
      ref={ref}
      value={value || defaultEnumValue || ContractTax_calculation_method.progressive}
      onValueChange={onChange}
    />
  )
})
TaxCalculationMethodRadioGroup.displayName = 'TaxCalculationMethodRadioGroup'

const SocialInsuranceRadioGroup = forwardRef<
  React.ElementRef<typeof RadioGroup>,
  RadioGroupProps & { value?: boolean; onChange?: (value: boolean) => void }
>(({ value, onChange, ...props }, ref) => {
  return (
    <RadioGroup
      {...props}
      ref={ref}
      value={value ? 'true' : 'false'}
      onValueChange={(val: string) => onChange?.(val === 'true')}
    />
  )
})
SocialInsuranceRadioGroup.displayName = 'SocialInsuranceRadioGroup'

const InternEvaluationRadioGroup = forwardRef<
  React.ElementRef<typeof RadioGroup>,
  RadioGroupProps & { value?: boolean; onChange?: (value: boolean) => void }
>(({ value, onChange, ...props }, ref) => {
  return (
    <RadioGroup
      {...props}
      ref={ref}
      value={value ? 'true' : 'false'}
      onValueChange={(val: string) => onChange?.(val === 'true')}
    />
  )
})
InternEvaluationRadioGroup.displayName = 'InternEvaluationRadioGroup'

const IsActiveRadioGroup = forwardRef<
  React.ElementRef<typeof RadioGroup>,
  RadioGroupProps & { value?: boolean; onChange?: (value: boolean) => void }
>(({ value, onChange, ...props }, ref) => {
  return (
    <RadioGroup
      {...props}
      ref={ref}
      value={value === false ? 'false' : 'true'}
      onValueChange={(val: string) => onChange?.(val === 'true')}
    />
  )
})
IsActiveRadioGroup.displayName = 'IsActiveRadioGroup'

type WorkingTimeTypeRadioGroupProps = RadioGroupProps & {
  value?: string
  onChange?: (value: string) => void
  defaultEnumValue?: ContractWorkingTimeType
}

const WorkingTimeTypeRadioGroup = forwardRef<
  React.ElementRef<typeof RadioGroup>,
  WorkingTimeTypeRadioGroupProps
>(({ value, onChange, defaultEnumValue, ...props }, ref) => {
  const { defaultEnumValue: _defaultEnumValue, ...radioGroupProps } = props as any
  return (
    <RadioGroup
      {...radioGroupProps}
      ref={ref}
      value={value || defaultEnumValue || ContractWorkingTimeType.full_time}
      onValueChange={onChange}
    />
  )
})
WorkingTimeTypeRadioGroup.displayName = 'WorkingTimeTypeRadioGroup'

type NetPercentageRadioGroupProps = RadioGroupProps & {
  value?: string
  onChange?: (value: string) => void
  defaultEnumValue?: ContractNet_percentage
}

const NetPercentageRadioGroup = forwardRef<
  React.ElementRef<typeof RadioGroup>,
  NetPercentageRadioGroupProps
>(({ value, onChange, defaultEnumValue, ...props }, ref) => {
  const { defaultEnumValue: _defaultEnumValue, ...radioGroupProps } = props as any
  return (
    <RadioGroup
      {...radioGroupProps}
      ref={ref}
      value={value || defaultEnumValue || ContractNet_percentage.Value100}
      onValueChange={onChange}
    />
  )
})
NetPercentageRadioGroup.displayName = 'NetPercentageRadioGroup'

const DurationMonthsTextField = forwardRef<
  HTMLInputElement,
  Omit<TextFieldProps, 'value' | 'onChange'> & {
    value?: number | null
    onChange?: (value: number | null) => void
  }
>(({ value, onChange, ...props }, ref) => {
  return (
    <TextField
      {...props}
      ref={ref}
      value={value !== null && value !== undefined ? value.toString() : ''}
      onChange={(stringValue: string) => {
        const numValue = stringValue ? parseInt(stringValue, 10) : null
        onChange?.(isNaN(numValue as number) ? null : numValue)
      }}
    />
  )
})
DurationMonthsTextField.displayName = 'DurationMonthsTextField'

const AnnualLeaveDaysTextField = forwardRef<
  HTMLInputElement,
  Omit<TextFieldProps, 'value' | 'onChange'> & {
    value?: number
    onChange?: (value: number) => void
  }
>(({ value, onChange, ...props }, ref) => {
  return (
    <TextField
      {...props}
      ref={ref}
      value={value !== undefined ? value.toString() : ''}
      onChange={(stringValue: string) => {
        const numValue = stringValue ? parseInt(stringValue, 10) : 0
        onChange?.(isNaN(numValue) ? 0 : numValue)
      }}
    />
  )
})
AnnualLeaveDaysTextField.displayName = 'AnnualLeaveDaysTextField'

const ContractTypeForm = ({ initialData, onSuccess, onCancel }: ContractTypeFormProps) => {
  const isEditMode = useMemo(() => !!initialData, [initialData])
  const createMutation = useCreateContractType()
  const updateMutation = useUpdateContractType()

  const mutation = isEditMode ? updateMutation : createMutation

  // Get constants for radio group options
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_DURATION_TYPE,
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_TAX_CALCULATION_METHOD,
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_WORKING_TIME_TYPE,
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_EMPLOYEE_TYPE_CHOICES,
    ],
  })

  const durationTypeOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_DURATION_TYPE)
      ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_DURATION_TYPE) || []
      : []
  }, [keysMapOptions])

  const taxCalculationMethodOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_TAX_CALCULATION_METHOD)
      ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_TAX_CALCULATION_METHOD) || []
      : []
  }, [keysMapOptions])

  const workingTimeTypeOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_WORKING_TIME_TYPE)
      ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_WORKING_TIME_TYPE) || []
      : []
  }, [keysMapOptions])

  const employeeTypeOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_EMPLOYEE_TYPE_CHOICES)
      ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_EMPLOYEE_TYPE_CHOICES) || []
      : []
  }, [keysMapOptions])

  // Social insurance options (boolean field - no constant needed)
  const socialInsuranceOptions = useMemo(
    () => [
      { value: 'true', label: 'Có đóng BHXH' },
      { value: 'false', label: 'Không đóng BHXH' },
    ],
    []
  )

  // Intern-evaluation flag options (boolean field - no constant needed)
  const internEvaluationOptions = useMemo(
    () => [
      { value: 'true', label: 'Có' },
      { value: 'false', label: 'Không' },
    ],
    []
  )

  // Net percentage options (Phần trăm lương thực nhận trong thời gian thử việc)
  const netPercentageOptions = useMemo(
    () => [
      { value: ContractNet_percentage.Value100, label: '100%' },
      { value: ContractNet_percentage.Value85, label: '85%' },
    ],
    []
  )

  // Đang hoạt động options
  const isActiveOptions = useMemo(
    () => [
      { value: 'true', label: 'Đang hoạt động' },
      { value: 'false', label: 'Ngừng hoạt động' },
    ],
    []
  )

  const form = useForm<ContractTypeFormData>({
    resolver: zodResolver(contractTypeSchema),
    defaultValues: {
      name: initialData?.name || '',
      symbol: initialData?.symbol || '',
      base_salary: initialData?.base_salary ? parseFloat(initialData.base_salary) : null,
      duration_type: initialData?.duration_type || ContractDurationType.indefinite,
      duration_months: initialData?.duration_months || null,
      annual_leave_days: initialData?.annual_leave_days || 0,
      tax_calculation_method:
        initialData?.tax_calculation_method || ContractTax_calculation_method.progressive,
      has_social_insurance: initialData?.has_social_insurance ?? true,
      requires_intern_evaluation: initialData?.requires_intern_evaluation ?? false,
      working_time_type: initialData?.working_time_type || ContractWorkingTimeType.full_time,
      employee_type: initialData?.employee_type ?? null,
      is_active: initialData?.is_active ?? true,
      lunch_allowance: initialData?.lunch_allowance
        ? parseFloat(initialData.lunch_allowance)
        : null,
      phone_allowance: initialData?.phone_allowance
        ? parseFloat(initialData.phone_allowance)
        : null,
      other_allowance: initialData?.other_allowance
        ? parseFloat(initialData.other_allowance)
        : null,
      net_percentage: initialData?.net_percentage || ContractNet_percentage.Value100,
      working_conditions: initialData?.working_conditions || '',
      rights_and_obligations: initialData?.rights_and_obligations || '',
      terms: initialData?.terms || '',
      note: initialData?.note || null,
      template_file: undefined,
    },
    shouldFocusError: false, // Disable default focus to use custom scroll
  })

  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
    reset,
  } = form

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        symbol: initialData.symbol || '',
        base_salary: initialData.base_salary ? parseFloat(initialData.base_salary) : null,
        duration_type: initialData.duration_type || ContractDurationType.indefinite,
        duration_months: initialData.duration_months || null,
        annual_leave_days: initialData.annual_leave_days || 0,
        tax_calculation_method:
          initialData.tax_calculation_method || ContractTax_calculation_method.progressive,
        has_social_insurance: initialData.has_social_insurance ?? true,
        requires_intern_evaluation: initialData.requires_intern_evaluation ?? false,
        working_time_type: initialData.working_time_type || ContractWorkingTimeType.full_time,
        employee_type: initialData.employee_type ?? null,
        is_active: initialData.is_active ?? true,
        lunch_allowance: initialData.lunch_allowance
          ? parseFloat(initialData.lunch_allowance)
          : null,
        phone_allowance: initialData.phone_allowance
          ? parseFloat(initialData.phone_allowance)
          : null,
        other_allowance: initialData.other_allowance
          ? parseFloat(initialData.other_allowance)
          : null,
        net_percentage: initialData.net_percentage || ContractNet_percentage.Value100,
        working_conditions: initialData.working_conditions || '',
        rights_and_obligations: initialData.rights_and_obligations || '',
        terms: initialData.terms || '',
        note: initialData.note || null,
        template_file: undefined,
      })
    }
  }, [initialData, reset])

  const durationType = useWatch({ name: 'duration_type', control })
  const isActive = useWatch({ name: 'is_active', control })

  // Auto-scroll to first error field when validation fails
  useScrollToError(errors)

  const onSubmit = useCallback(
    async (data: ContractTypeFormData) => {
      try {
        // Validate template_file: must have either new file token or existing file
        // data.template_file can be:
        // - undefined: no file uploaded yet
        // - '': file was deleted by user
        // - string (non-empty): new file token uploaded
        const hasNewFile = data.template_file && data.template_file !== ''

        // In edit mode, check if there was an existing file initially
        const hadExistingFile = isEditMode && initialData?.template_file?.file_path

        // If user deleted the file (empty string) or no file at all, validate
        // In create mode: must have new file
        // In edit mode: if had existing file but now deleted (empty string), must have new file
        const fileWasDeleted = data.template_file === ''
        const needsFile = !isEditMode || (isEditMode && hadExistingFile && fileWasDeleted)

        if (needsFile && !hasNewFile) {
          form.setError('template_file', {
            type: 'manual',
            message: 'File mẫu hợp đồng là bắt buộc',
          })
          // Trigger scroll to error field
          setTimeout(() => {
            const fieldElement = document.querySelector(`[data-field-name="template_file"]`)
            if (fieldElement) {
              fieldElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest',
              })
            }
          }, 100)
          toastService.error('Vui lòng chọn file mẫu hợp đồng')
          return
        }

        const apiData = {
          name: data.name,
          symbol: data.symbol,
          base_salary: data.base_salary != null ? data.base_salary.toString() : undefined,
          duration_type: data.duration_type,
          duration_months:
            data.duration_type === ContractDurationType.fixed ? data.duration_months : null,
          annual_leave_days: data.annual_leave_days,
          tax_calculation_method: data.tax_calculation_method,
          has_social_insurance: data.has_social_insurance,
          requires_intern_evaluation: data.requires_intern_evaluation,
          working_time_type: data.working_time_type,
          employee_type: data.employee_type ?? null,
          is_active: data.is_active,
          lunch_allowance: data.lunch_allowance?.toString() || null,
          phone_allowance: data.phone_allowance?.toString() || null,
          other_allowance: data.other_allowance?.toString() || null,
          net_percentage: data.net_percentage,
          working_conditions: data.working_conditions,
          rights_and_obligations: data.rights_and_obligations,
          terms: data.terms,
          note: data.note || null,
          files: hasNewFile
            ? {
                template_file: data.template_file,
              }
            : undefined,
        }

        if (isEditMode && initialData?.id) {
          await updateMutation.mutateAsync({ id: initialData.id, data: apiData })
          toastService.success('Đã cập nhật loại hợp đồng thành công')
        } else {
          await createMutation.mutateAsync(apiData)
          toastService.success('Đã tạo loại hợp đồng thành công')
        }
        onSuccess?.()
      } catch (error: any) {
        handleApiError(error, form.setError)
      }
    },
    [isEditMode, updateMutation, createMutation, onSuccess, initialData, form]
  )

  const submitButtonText = useMemo(() => (isEditMode ? 'Lưu' : 'Thêm'), [isEditMode])

  return (
    <Form loading={mutation.isPending} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="9" className="w-full px-10 py-4">
        <Flex direction="column" gap="5">
          {/* Row 1: Tên loại hợp đồng & Ký hiệu */}
          <Grid columns={'2'} gap="5">
            <FormController
              register={register}
              name="name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên loại hợp đồng',
                required: true,
                placeholder: 'Nhập tên loại hợp đồng',
                maxLength: 100,
                showCharacterCount: true,
                disabled: mutation.isPending,
              }}
            />
            <FormController
              register={register}
              name="symbol"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Ký hiệu loại hợp đồng',
                required: true,
                placeholder: 'Nhập ký hiệu loại hợp đồng',
                maxLength: 20,
                showCharacterCount: true,
                disabled: mutation.isPending,
              }}
            />
          </Grid>

          {/* Row 2: Mức lương cơ bản & Phụ cấp ăn trưa */}
          <Grid columns={'2'} gap="5">
            <FormController
              register={register}
              name="base_salary"
              control={control}
              Field={CurrencyInput}
              fieldProps={{
                label: 'Mức lương cơ bản (VNĐ)',
                placeholder: 'Nhập mức lương cơ bản',
                disabled: mutation.isPending,
              }}
            />
            <FormController
              register={register}
              name="lunch_allowance"
              control={control}
              Field={CurrencyInput}
              fieldProps={{
                label: 'Phụ cấp ăn trưa',
                placeholder: 'Nhập số tiền',
                disabled: mutation.isPending,
              }}
            />
          </Grid>

          {/* Row 3: Phụ cấp điện thoại & Phụ cấp khác */}
          <Grid columns={'2'} gap="5">
            <FormController
              register={register}
              name="phone_allowance"
              control={control}
              Field={CurrencyInput}
              fieldProps={{
                label: 'Phụ cấp điện thoại',
                placeholder: 'Nhập số tiền',
                disabled: mutation.isPending,
              }}
            />
            <FormController
              register={register}
              name="other_allowance"
              control={control}
              Field={CurrencyInput}
              fieldProps={{
                label: 'Phụ cấp khác',
                placeholder: 'Nhập số tiền',
                disabled: mutation.isPending,
              }}
            />
          </Grid>

          {/* Row 4: Phần trăm lương thực nhận trong thời gian thử việc */}
          <Grid columns={'2'} gap="5">
            <div className="flex-1">
              <FormController
                register={register}
                name="net_percentage"
                control={control}
                Field={NetPercentageRadioGroup}
                fieldProps={{
                  id: 'net_percentage',
                  label: 'Phần trăm lương thực nhận trong thời gian thử việc',
                  required: true,
                  disabled: mutation.isPending,
                  options: netPercentageOptions,
                  defaultEnumValue: ContractNet_percentage.Value100,
                }}
              />
            </div>
          </Grid>

          {/* Row 5: Cách tính thuế & Bảo hiểm xã hội */}
          <Grid columns={'2'} gap="5">
            <div className="flex-1">
              <FormController
                register={register}
                name="tax_calculation_method"
                control={control}
                Field={TaxCalculationMethodRadioGroup}
                fieldProps={{
                  id: 'tax_calculation_method',
                  label: 'Cách tính thuế',
                  required: true,
                  disabled: mutation.isPending,
                  options: taxCalculationMethodOptions,
                  defaultEnumValue: ContractTax_calculation_method.progressive,
                }}
              />
            </div>
            <div className="flex-1">
              <FormController
                register={register}
                name="has_social_insurance"
                control={control}
                Field={SocialInsuranceRadioGroup}
                fieldProps={{
                  id: 'has_social_insurance',
                  label: 'Bảo hiểm xã hội',
                  required: true,
                  disabled: mutation.isPending,
                  options: socialInsuranceOptions,
                }}
              />
            </div>
          </Grid>

          {/* Row 5b: Tự động tạo phiếu đánh giá Thực tập sinh */}
          <Grid columns={'1'} gap="5">
            <div className="flex-1">
              <FormController
                register={register}
                name="requires_intern_evaluation"
                control={control}
                Field={InternEvaluationRadioGroup}
                fieldProps={{
                  id: 'requires_intern_evaluation',
                  label: 'Tự động tạo phiếu đánh giá Thực tập sinh khi gần hết hạn',
                  disabled: mutation.isPending,
                  options: internEvaluationOptions,
                }}
              />
            </div>
          </Grid>

          {/* Row 6: Thời hạn hợp đồng (radio) & Thời hạn hợp đồng (input) */}
          <Grid columns={'2'} gap="5">
            <div className="flex-1">
              <FormController
                register={register}
                name="duration_type"
                control={control}
                Field={DurationTypeRadioGroup}
                fieldProps={{
                  id: 'duration_type',
                  label: 'Loại thời hạn hợp đồng',
                  required: true,
                  disabled: mutation.isPending,
                  options: durationTypeOptions,
                  defaultEnumValue: ContractDurationType.indefinite,
                  onSetValue: (name: string, value: any) => {
                    setValue(name as any, value, { shouldDirty: true })
                  },
                }}
              />
            </div>
            <FormController
              register={register}
              name="duration_months"
              control={control}
              Field={DurationMonthsTextField}
              fieldProps={{
                label: 'Thời hạn hợp đồng',
                required: durationType === ContractDurationType.fixed,
                placeholder: 'Nhập thời hạn',
                type: 'number',
                maxLength: 2,
                showCharacterCount: true,
                disabled: mutation.isPending || durationType !== ContractDurationType.fixed,
                caption:
                  'Chỉ nhập khi Thời hạn hợp đồng là Xác định thời hạn. Thời hạn tính theo tháng',
              }}
            />
          </Grid>

          {/* Row 7: Thời gian làm việc & Số ngày nghỉ phép */}
          <Grid columns={'2'} gap="5">
            <div className="flex-1">
              <FormController
                register={register}
                name="working_time_type"
                control={control}
                Field={WorkingTimeTypeRadioGroup}
                fieldProps={{
                  id: 'working_time_type',
                  label: 'Thời gian làm việc',
                  required: true,
                  disabled: mutation.isPending,
                  options: workingTimeTypeOptions,
                  defaultEnumValue: ContractWorkingTimeType.full_time,
                }}
              />
            </div>
            <FormController
              register={register}
              name="annual_leave_days"
              control={control}
              Field={AnnualLeaveDaysTextField}
              fieldProps={{
                label: 'Số ngày nghỉ phép',
                required: true,
                placeholder: 'Nhập số ngày nghỉ phép',
                type: 'number',
                maxLength: 2,
                showCharacterCount: true,
                disabled: mutation.isPending,
                caption: 'Số ngày tính theo năm không lớn hơn 12',
              }}
            />
          </Grid>

          {/* Row 7b: Loại nhân viên + Đang hoạt động */}
          <Grid columns={'2'} gap="5">
            <FormController
              register={register}
              name="employee_type"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Loại nhân viên',
                // Bắt buộc khi loại hợp đồng đang hoạt động; được để trống khi đã ngừng
                required: isActive !== false,
                placeholder: 'Chọn loại nhân viên',
                options: employeeTypeOptions,
                clearable: true,
                className: 'w-full',
                disabled: mutation.isPending,
                caption:
                  'Loại nhân viên áp dụng khi cấp hợp đồng từ loại này (chỉ được để trống khi loại hợp đồng đã ngừng hoạt động)',
              }}
            />
            <div className="flex-1">
              <FormController
                register={register}
                name="is_active"
                control={control}
                Field={IsActiveRadioGroup}
                fieldProps={{
                  id: 'is_active',
                  label: 'Đang hoạt động',
                  required: true,
                  disabled: mutation.isPending,
                  options: isActiveOptions,
                }}
              />
            </div>
          </Grid>

          {/* Row 8: Chế độ làm việc */}
          <FormController
            register={register}
            name="working_conditions"
            control={control}
            Field={RichText}
            fieldProps={{
              label: 'Chế độ làm việc',
              required: true,
              placeholder: 'Nhập chế độ làm việc',
              maxCharacters: 1000,
              disabled: mutation.isPending,
            }}
          />

          {/* Row 8: Quyền và nghĩa vụ các bên */}
          <FormController
            register={register}
            name="rights_and_obligations"
            control={control}
            Field={RichText}
            fieldProps={{
              label: 'Quyền và nghĩa vụ các bên',
              required: true,
              placeholder: 'Nhập quyền và nghĩa vụ các bên',
              maxCharacters: 5000,
              disabled: mutation.isPending,
            }}
          />

          {/* Row 9: Điều khoản */}
          <FormController
            register={register}
            name="terms"
            control={control}
            Field={RichText}
            fieldProps={{
              label: 'Điều khoản',
              required: true,
              placeholder: 'Nhập điều khoản',
              maxCharacters: 5000,
              disabled: mutation.isPending,
            }}
          />

          {/* Row 10: Ghi chú */}
          <FormController
            register={register}
            name="note"
            control={control}
            Field={TextArea}
            fieldProps={{
              label: 'Ghi chú',
              required: false,
              placeholder: 'Nhập ghi chú',
              rows: 4,
              maxCharacters: 500,
              disabled: mutation.isPending,
            }}
          />

          {/* Separator */}
          <SeparatorHorizontal />

          {/* File Upload */}
          <FormController
            register={register}
            name="template_file"
            control={control}
            Field={FileUpload}
            fieldProps={{
              label: 'File mẫu hợp đồng',
              required: true,
              existingFile: initialData?.template_file,
              accept: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              ],
              disabled: mutation.isPending,
              purpose: 'contract_type',
            }}
          />
        </Flex>

        {/* Action Buttons */}
        <Flex gap="4" align="center" justify="end" width="100%">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={mutation.isPending}
            className="w-[150px]"
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={mutation.isPending}
            loading={mutation.isPending}
            className="w-[150px]"
          >
            {submitButtonText}
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default ContractTypeForm
