import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useMemo, useEffect, forwardRef, useRef } from 'react'
import { Flex, Grid, Separator } from '@radix-ui/themes'
import { type ContractFormData, contractSchema } from '../schemas/contract-schema.ts'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import {
  Button,
  Checkbox,
  CurrencyInput,
  FileUpload,
  RadioGroup,
  TextArea,
  TextField,
  Select,
} from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import {
  type Contract,
  type PatchedContractRequest,
  useCreateContract,
  useUpdateContract,
  usePartialUpdateContract,
  usePublishContract,
} from '@/features/contract/services/contract-service'
import { useContractType } from '@/features/contract/services/contract-type-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import type { RadioGroupProps } from '@/components/ui/radio-group.tsx'
import {
  ContractTax_calculation_method,
  ContractNet_percentage,
  ContractInsurance_types,
} from '@/api/schema.ts'
import { CONTRACT_INSURANCE_TYPE_LABELS } from '@/features/contract/manage/_shares/schemas/contract-schema.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { format, parse, isValid } from 'date-fns'
import { DATE_FORMAT, DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import EmployeeSelectWithDialog from '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog.tsx'
import { useContractTypeSelect } from '@/hooks/useContractTypeSelect.ts'
import { useScrollToError } from '@/hooks/useScrollToError.ts'
import { useDialog } from '@/hooks/useDialog.ts'
import { ContractDurationType, ContractStatus } from '@/constants/api-schema-aliases'

type ContractPrefillData = {
  employee_id?: number
  effective_date?: string
  expiration_date?: string | null
  base_salary?: string
  net_percentage?: ContractNet_percentage
}

interface ContractFormProps {
  initialData?: Contract
  prefillData?: ContractPrefillData
  onSuccess?: (contractId: number) => void
  onCancel?: () => void
}

// Wrapper components with forwardRef for inline Field components
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

type SocialInsuranceRadioGroupProps = RadioGroupProps & {
  value?: boolean
  onChange?: (value: boolean) => void
}

const SocialInsuranceRadioGroup = forwardRef<
  React.ElementRef<typeof RadioGroup>,
  SocialInsuranceRadioGroupProps
>(({ value, onChange, ...props }, ref) => {
  const { ...radioGroupProps } = props as any
  return (
    <RadioGroup
      {...radioGroupProps}
      ref={ref}
      value={value !== undefined ? String(value) : 'true'}
      onValueChange={(val: string) => {
        onChange?.(val === 'true')
      }}
    />
  )
})
SocialInsuranceRadioGroup.displayName = 'SocialInsuranceRadioGroup'

type NetPercentageRadioGroupProps = RadioGroupProps & {
  value?: ContractNet_percentage
  onChange?: (value: ContractNet_percentage) => void
  defaultEnumValue?: ContractNet_percentage
}

const NetPercentageRadioGroup = forwardRef<
  React.ElementRef<typeof RadioGroup>,
  NetPercentageRadioGroupProps
>(({ value, onChange, defaultEnumValue, ...props }, ref) => {
  const { defaultEnumValue: _defaultEnumValue, ...radioGroupProps } = props as any
  // Convert number value to string to match options format
  const stringValue =
    value !== undefined && value !== null
      ? String(value)
      : defaultEnumValue !== undefined && defaultEnumValue !== null
        ? String(defaultEnumValue)
        : undefined
  return (
    <RadioGroup
      {...radioGroupProps}
      ref={ref}
      value={stringValue}
      onValueChange={(newValue) => onChange?.(Number(newValue) as ContractNet_percentage)}
    />
  )
})
NetPercentageRadioGroup.displayName = 'NetPercentageRadioGroup'

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
          onSetValue('contract_duration', '')
        }
      }}
    />
  )
})
DurationTypeRadioGroup.displayName = 'DurationTypeRadioGroup'

// Helper function to convert API date format (yyyy-MM-dd) to DatePicker format (dd/MM/yyyy)
const formatDateFromApi = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  try {
    // Try parsing as ISO date (yyyy-MM-dd)
    const date = parse(dateString, DATE_SERVER_FORMAT, new Date())
    if (isValid(date)) {
      return format(date, DATE_FORMAT)
    }
    // If that fails, try parsing as Date object
    const dateObj = new Date(dateString)
    if (isValid(dateObj)) {
      return format(dateObj, DATE_FORMAT)
    }
    return ''
  } catch {
    return ''
  }
}

const ContractForm = ({ initialData, prefillData, onSuccess, onCancel }: ContractFormProps) => {
  const isEditMode = useMemo(() => !!initialData, [initialData])
  const isEditNonDraft = useMemo(
    () => isEditMode && initialData?.status !== ContractStatus.draft,
    [isEditMode, initialData?.status]
  )
  const createMutation = useCreateContract()
  const updateMutation = useUpdateContract()
  const partialUpdateMutation = usePartialUpdateContract()
  const publishMutation = usePublishContract()
  const { displayConfirm } = useDialog()

  // Determine which mutation to use based on mode
  // For draft save, use create/update
  // For publish, we'll handle it separately
  const mutation = isEditMode ? updateMutation : createMutation
  // When editing an already-published (non-draft) contract, we persist the
  // limited set of editable fields via PATCH partial-update.
  const effectiveMutation = isEditNonDraft ? partialUpdateMutation : mutation

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_DURATION_TYPE,
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_TAX_CALCULATION_METHOD,
      APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_NET_PERCENTAGE,
      APP_CONSTANT_KEY.HRM.CONTRACT_EMPLOYEE_TYPE_CHOICES,
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

  const netPercentageOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_NET_PERCENTAGE)
      ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_NET_PERCENTAGE) || []
      : []
  }, [keysMapOptions])

  const employeeTypeOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_EMPLOYEE_TYPE_CHOICES)
      ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_EMPLOYEE_TYPE_CHOICES) || []
      : []
  }, [keysMapOptions])

  // Social insurance options (boolean field)
  const socialInsuranceOptions = useMemo(
    () => [
      { value: 'true', label: 'Có đóng BHXH' },
      { value: 'false', label: 'Không đóng BHXH' },
    ],
    []
  )

  const { loadContractTypeOptions, loadInitialContractTypeOptions } = useContractTypeSelect()

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      employee_id: initialData?.employee?.id || prefillData?.employee_id || undefined,
      contract_type_id: initialData?.contract_type?.id || undefined,
      contract_number: initialData?.contract_number || '',
      sign_date: formatDateFromApi(initialData?.sign_date),
      effective_date:
        formatDateFromApi(initialData?.effective_date) || prefillData?.effective_date || '',
      expiration_date: initialData?.expiration_date
        ? formatDateFromApi(initialData.expiration_date)
        : prefillData?.expiration_date || null,
      duration_type:
        (initialData?.duration_type as ContractDurationType) || ContractDurationType.indefinite,
      contract_duration:
        initialData?.duration_months !== null && initialData?.duration_months !== undefined
          ? initialData.duration_months.toString()
          : '',
      annual_leave_days:
        initialData?.annual_leave_days !== null && initialData?.annual_leave_days !== undefined
          ? initialData.annual_leave_days.toString()
          : '',
      base_salary: initialData?.base_salary
        ? parseFloat(initialData.base_salary)
        : prefillData?.base_salary
          ? parseFloat(prefillData.base_salary)
          : 0,
      kpi_salary: null,
      lunch_allowance: initialData?.lunch_allowance
        ? parseFloat(initialData.lunch_allowance)
        : null,
      phone_allowance: initialData?.phone_allowance
        ? parseFloat(initialData.phone_allowance)
        : null,
      other_allowance: initialData?.other_allowance
        ? parseFloat(initialData.other_allowance)
        : null,
      tax_calculation_method:
        (initialData?.tax_calculation_method as ContractTax_calculation_method) ||
        ContractTax_calculation_method.progressive,
      net_percentage:
        initialData?.net_percentage ||
        prefillData?.net_percentage ||
        ContractNet_percentage.Value100,
      employee_type: initialData?.employee_type ?? null,
      has_social_insurance: initialData?.has_social_insurance ?? true,
      insurance_types:
        (initialData as Contract & { insurance_types?: ContractInsurance_types[] })
          ?.insurance_types ?? [],
      note: initialData?.note || null,
      attachment: undefined,
    },
    shouldFocusError: false,
  })

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = form

  // Watch contract_type_id to auto-fill fields when contract type is selected
  const contractTypeId = watch('contract_type_id')
  const durationType = watch('duration_type')

  // Track previous contract type ID to detect user changes (not initial load)
  const previousContractTypeIdRef = useRef<number | undefined>(
    initialData?.contract_type?.id || undefined
  )

  // Track if form initialization is complete to avoid auto-fill during initial load in edit mode
  const isInitializationCompleteRef = useRef(false)

  // Determine which contract type ID to fetch
  // Priority: current form value > initialData contract_type_id
  const effectiveContractTypeId = useMemo(() => {
    if (contractTypeId && contractTypeId > 0) {
      return contractTypeId
    }
    if (initialData?.contract_type?.id && initialData.contract_type.id > 0) {
      return initialData.contract_type.id
    }
    return 0
  }, [contractTypeId, initialData?.contract_type?.id])

  // Fetch contract type details when contract_type_id changes
  const { data: contractType } = useContractType(effectiveContractTypeId)

  // Auto-fill fields from contract type when contract type is selected by user
  useEffect(() => {
    // Only auto-fill if:
    // 1. Form initialization is complete (to avoid overwriting initial data in edit mode)
    // 2. Contract type is loaded
    // 3. Contract type ID is valid
    // 4. User has changed the contract type (not initial load)
    const isUserChange =
      contractTypeId && contractTypeId > 0 && contractTypeId !== previousContractTypeIdRef.current

    if (
      isInitializationCompleteRef.current &&
      contractType &&
      effectiveContractTypeId > 0 &&
      isUserChange
    ) {
      // Set duration_type from contract type (always auto-fill from contract type)
      if (contractType.duration_type) {
        setValue('duration_type', contractType.duration_type as ContractDurationType, {
          shouldDirty: false,
        })
      }

      // Set contract_duration from duration_months (only for fixed-term contracts)
      if (
        contractType.duration_type === ContractDurationType.fixed &&
        contractType.duration_months !== null &&
        contractType.duration_months !== undefined
      ) {
        setValue('contract_duration', contractType.duration_months.toString(), {
          shouldDirty: false,
        })
      } else if (contractType.duration_type === ContractDurationType.indefinite) {
        setValue('contract_duration', '', { shouldDirty: false })
      }

      // Set annual_leave_days
      if (contractType.annual_leave_days !== undefined && contractType.annual_leave_days !== null) {
        setValue('annual_leave_days', contractType.annual_leave_days.toString(), {
          shouldDirty: false,
        })
      }

      // Set base_salary
      if (contractType.base_salary) {
        const baseSalaryValue = parseFloat(contractType.base_salary)
        if (!isNaN(baseSalaryValue)) {
          setValue('base_salary', baseSalaryValue, { shouldDirty: false })
        }
      }

      // Set lunch_allowance
      if (contractType.lunch_allowance) {
        const lunchAllowanceValue = parseFloat(contractType.lunch_allowance)
        if (!isNaN(lunchAllowanceValue)) {
          setValue('lunch_allowance', lunchAllowanceValue, { shouldDirty: false })
        }
      } else {
        setValue('lunch_allowance', null, { shouldDirty: false })
      }

      // Set phone_allowance
      if (contractType.phone_allowance) {
        const phoneAllowanceValue = parseFloat(contractType.phone_allowance)
        if (!isNaN(phoneAllowanceValue)) {
          setValue('phone_allowance', phoneAllowanceValue, { shouldDirty: false })
        }
      } else {
        setValue('phone_allowance', null, { shouldDirty: false })
      }

      // Set other_allowance
      if (contractType.other_allowance) {
        const otherAllowanceValue = parseFloat(contractType.other_allowance)
        if (!isNaN(otherAllowanceValue)) {
          setValue('other_allowance', otherAllowanceValue, { shouldDirty: false })
        }
      } else {
        setValue('other_allowance', null, { shouldDirty: false })
      }

      // Set tax_calculation_method
      if (contractType.tax_calculation_method) {
        setValue(
          'tax_calculation_method',
          contractType.tax_calculation_method as ContractTax_calculation_method,
          { shouldDirty: false }
        )
      }

      // Set net_percentage (API may return number or numeric string)
      const netPercentageValue = Number(contractType.net_percentage)
      if (
        netPercentageValue === ContractNet_percentage.Value100 ||
        netPercentageValue === ContractNet_percentage.Value85
      ) {
        setValue('net_percentage', netPercentageValue as ContractNet_percentage, {
          shouldDirty: false,
        })
      }

      // Set has_social_insurance
      if (
        contractType.has_social_insurance !== undefined &&
        contractType.has_social_insurance !== null
      ) {
        setValue('has_social_insurance', contractType.has_social_insurance, { shouldDirty: false })
      }

      // Set employee_type from contract type (default-fill; user can override)
      setValue('employee_type', contractType.employee_type ?? null, { shouldDirty: false })

      // Set insurance_types from contract type if available (type may not be in schema)
      const contractTypeInsuranceTypes = (
        contractType as { insurance_types?: ContractInsurance_types[] }
      ).insurance_types
      if (contractTypeInsuranceTypes && Array.isArray(contractTypeInsuranceTypes)) {
        setValue('insurance_types', contractTypeInsuranceTypes, { shouldDirty: false })
      }

      // Update previous contract type ID after auto-filling
      previousContractTypeIdRef.current = contractTypeId
    } else if (contractTypeId === 0 || !contractTypeId) {
      // Clear values when no contract type is selected
      setValue('duration_type', ContractDurationType.indefinite, {
        shouldDirty: false,
      })
      setValue('contract_duration', '', { shouldDirty: false })
      setValue('annual_leave_days', '', { shouldDirty: false })
      // Don't clear salary and allowances when contract type is cleared
      // User might have already edited them
      previousContractTypeIdRef.current = undefined
    }
  }, [contractType, contractTypeId, effectiveContractTypeId, setValue])

  useEffect(() => {
    if (initialData) {
      // Mark initialization as not complete before reset
      isInitializationCompleteRef.current = false

      reset({
        employee_id: initialData.employee?.id || undefined,
        contract_type_id: initialData.contract_type?.id || undefined,
        contract_number: initialData.contract_number || '',
        sign_date: formatDateFromApi(initialData.sign_date),
        effective_date: formatDateFromApi(initialData.effective_date),
        expiration_date: initialData.expiration_date
          ? formatDateFromApi(initialData.expiration_date)
          : null,
        duration_type:
          (initialData?.duration_type as ContractDurationType) || ContractDurationType.indefinite,
        contract_duration:
          initialData.duration_months !== null && initialData.duration_months !== undefined
            ? initialData.duration_months.toString()
            : '',
        annual_leave_days:
          initialData.annual_leave_days !== null && initialData.annual_leave_days !== undefined
            ? initialData.annual_leave_days.toString()
            : '',
        base_salary: initialData.base_salary ? parseFloat(initialData.base_salary) : 0,
        kpi_salary: initialData.kpi_salary ? parseFloat(initialData.kpi_salary) : null,
        lunch_allowance: initialData.lunch_allowance
          ? parseFloat(initialData.lunch_allowance)
          : null,
        phone_allowance: initialData.phone_allowance
          ? parseFloat(initialData.phone_allowance)
          : null,
        other_allowance: initialData.other_allowance
          ? parseFloat(initialData.other_allowance)
          : null,
        tax_calculation_method:
          (initialData.tax_calculation_method as ContractTax_calculation_method) ||
          ContractTax_calculation_method.progressive,
        net_percentage:
          (initialData.net_percentage as ContractNet_percentage) || ContractNet_percentage.Value100,
        employee_type: initialData.employee_type ?? null,
        has_social_insurance: initialData.has_social_insurance ?? true,
        insurance_types:
          (initialData as Contract & { insurance_types?: ContractInsurance_types[] })
            .insurance_types ?? [],
        note: initialData.note || null,
        attachment: undefined,
      })

      // Mark initialization as complete after a short delay to ensure all form values are set
      setTimeout(() => {
        isInitializationCompleteRef.current = true
        // Update previousContractTypeIdRef to match the initialized value
        previousContractTypeIdRef.current = initialData.contract_type?.id || undefined
      }, 100)
    } else {
      // In create mode, mark as complete immediately
      isInitializationCompleteRef.current = true
    }
  }, [initialData, reset])

  // Auto-scroll to first error field when validation fails
  useScrollToError(errors)

  const handleSave = useCallback(
    async (data: ContractFormData, isDraft: boolean = false) => {
      try {
        // Loại nhân viên là bắt buộc (luồng tạo/lưu nháp/ban hành)
        if (!data.employee_type) {
          form.setError('employee_type', {
            type: 'manual',
            message: 'Loại nhân viên là bắt buộc',
          })
          setTimeout(() => {
            document
              .querySelector('[data-field-name="employee_type"]')
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }, 100)
          return
        }

        const apiData = {
          employee_id: data.employee_id,
          contract_type_id: data.contract_type_id,
          sign_date: formatDateToApi(data.sign_date),
          effective_date: formatDateToApi(data.effective_date),
          expiration_date: data.expiration_date ? formatDateToApi(data.expiration_date) : null,
          duration_type: data.duration_type,
          duration_months:
            data.duration_type === ContractDurationType.fixed && data.contract_duration
              ? parseInt(data.contract_duration, 10)
              : null,
          base_salary: data.base_salary.toString(),
          kpi_salary:
            data.kpi_salary !== null && data.kpi_salary !== undefined
              ? data.kpi_salary.toString()
              : undefined,
          lunch_allowance: data.lunch_allowance?.toString() || null,
          phone_allowance: data.phone_allowance?.toString() || null,
          other_allowance: data.other_allowance?.toString() || null,
          tax_calculation_method: data.tax_calculation_method,
          net_percentage: data.net_percentage,
          employee_type: data.employee_type ?? null,
          has_social_insurance: data.has_social_insurance,
          insurance_types: data.insurance_types ?? [],
          annual_leave_days: data.annual_leave_days
            ? parseInt(data.annual_leave_days, 10)
            : undefined,
          note: data.note || null,
          files: data.attachment
            ? {
                attachment: data.attachment,
              }
            : undefined,
        } as any

        let contractId: number

        // Step 1: Create or update contract (save as draft)
        if (isEditMode && initialData?.id) {
          contractId = initialData.id
          await updateMutation.mutateAsync({ id: contractId, data: apiData })
          if (isDraft) {
            toastService.success('Đã lưu nháp hợp đồng thành công')
          }
        } else {
          // Create new contract
          const createdContractResponse = await createMutation.mutateAsync(apiData)
          // Extract contract ID from response (ApiResponse<Contract>)
          const createdContract = (createdContractResponse as any)?.data || createdContractResponse
          contractId = createdContract?.id
          if (!contractId) {
            throw new Error('Không thể lấy ID hợp đồng sau khi tạo')
          }
          if (isDraft) {
            toastService.success('Đã lưu nháp hợp đồng thành công')
          }
        }

        // Step 2: If not draft, publish the contract
        if (!isDraft && contractId) {
          await publishMutation.mutateAsync(contractId)
          toastService.success(
            isEditMode
              ? 'Đã ban hành hợp đồng thành công'
              : 'Đã tạo và ban hành hợp đồng thành công'
          )
        }

        onSuccess?.(contractId)
      } catch (error: any) {
        handleApiError(error, form.setError)
      }
    },
    [isEditMode, initialData, createMutation, updateMutation, publishMutation, onSuccess, form]
  )

  // Editing an already-published contract: only a limited set of fields may be
  // changed (dates, salary & allowances, insurance, note). Persist them via
  // PATCH partial-update behind an explicit confirmation.
  const handleSaveIssuedContract = useCallback(
    async (data: ContractFormData) => {
      if (!isEditNonDraft || !initialData?.id) return
      const contractId = initialData.id
      displayConfirm({
        title: 'Xác nhận chỉnh sửa hợp đồng đã ban hành',
        content:
          'Bạn đang chỉnh sửa hợp đồng đã ban hành. Thay đổi về ngày, lương, phụ cấp, bảo hiểm và ghi chú sẽ được lưu ngay. Bạn có chắc chắn muốn tiếp tục?',
        confirmText: 'Lưu thay đổi',
        cancelText: 'Huỷ',
        onConfirm: async () => {
          try {
            const payload: PatchedContractRequest = {
              sign_date: formatDateToApi(data.sign_date),
              effective_date: formatDateToApi(data.effective_date),
              expiration_date: data.expiration_date ? formatDateToApi(data.expiration_date) : null,
              base_salary: data.base_salary.toString(),
              kpi_salary:
                data.kpi_salary !== null && data.kpi_salary !== undefined
                  ? data.kpi_salary.toString()
                  : undefined,
              lunch_allowance: data.lunch_allowance?.toString() || null,
              phone_allowance: data.phone_allowance?.toString() || null,
              other_allowance: data.other_allowance?.toString() || null,
              has_social_insurance: data.has_social_insurance,
              insurance_types: data.insurance_types ?? [],
              note: data.note || null,
            }
            await partialUpdateMutation.mutateAsync({ id: contractId, data: payload })
            toastService.success('Đã lưu thay đổi hợp đồng')
            onSuccess?.(contractId)
          } catch (error: any) {
            handleApiError(error, form.setError)
          }
        },
      })
    },
    [isEditNonDraft, initialData?.id, partialUpdateMutation, onSuccess, form, displayConfirm]
  )

  const onSubmit = useCallback(
    async (data: ContractFormData) => {
      await handleSave(data, false)
    },
    [handleSave]
  )

  const onSaveDraft = useCallback(
    async (data: ContractFormData) => {
      await handleSave(data, true)
    },
    [handleSave]
  )

  return (
    <Form
      handleSubmit={handleSubmit}
      onSubmit={isEditNonDraft ? handleSaveIssuedContract : onSubmit}
      loading={effectiveMutation.isPending}
    >
      <div className="flex flex-col gap-9">
        {/* Thông tin nhân viên */}
        <div className="flex flex-col gap-5">
          <h3 className="typo-body-extra-semibold text-content-dark-1">Thông tin nhân viên</h3>
          <div data-field-name="employee_id">
            <Controller
              name="employee_id"
              control={control}
              render={({ field, fieldState: { error } }) => {
                const selectValue = field.value || null
                return (
                  <EmployeeSelectWithDialog
                    value={selectValue}
                    onChange={(value) => {
                      // Transform null/undefined to undefined for form state
                      // This ensures schema validation works correctly
                      field.onChange(value || undefined)
                    }}
                    error={error?.message}
                    required
                    label="Nhân viên"
                    disabled={effectiveMutation.isPending || isEditNonDraft}
                  />
                )
              }}
            />
          </div>
        </div>

        <div className="bg-border-1 h-px" />

        {/* Thông tin hợp đồng */}
        <div className="flex flex-col gap-5">
          <h3 className="typo-body-extra-semibold text-content-dark-1">Thông tin hợp đồng</h3>

          {/* Mã hợp đồng (chỉ hiển thị khi edit), Số hợp đồng, Loại hợp đồng */}
          <Grid columns={isEditMode ? '3' : '1'} gap="5">
            {isEditMode && (
              <div data-field-name="code">
                <TextField label="Mã hợp đồng" value={initialData?.code || ''} disabled required />
              </div>
            )}
            {isEditMode && (
              <div data-field-name="contract_number">
                <TextField
                  label="Số hợp đồng"
                  value={initialData?.contract_number || ''}
                  disabled
                  required
                />
              </div>
            )}
            <div data-field-name="contract_type_id">
              <Controller
                name="contract_type_id"
                control={control}
                render={({ field, fieldState }) => {
                  // Transform value: 0 or undefined -> null for Select
                  const selectValue = field.value && field.value > 0 ? field.value : null

                  return (
                    <Select
                      {...field}
                      value={selectValue}
                      onChange={(value: string | number | (string | number)[] | null) => {
                        // Transform back: null -> 0 for form
                        // Since multiple is false, value should never be an array
                        if (Array.isArray(value)) {
                          const numVal = value.length > 0 ? Number(value[0]) || 0 : 0
                          field.onChange(numVal > 0 ? numVal : 0)
                        } else {
                          const numVal = value
                            ? typeof value === 'number'
                              ? value
                              : Number(value) || 0
                            : 0
                          field.onChange(numVal > 0 ? numVal : 0)
                        }
                      }}
                      label="Loại hợp đồng"
                      required
                      placeholder="Chọn loại hợp đồng"
                      loadOptions={loadContractTypeOptions}
                      loadInitialOptions={loadInitialContractTypeOptions}
                      enableSearch
                      searchPlaceholder="Tìm kiếm loại hợp đồng..."
                      clearable={true}
                      error={fieldState.error?.message}
                      disabled={effectiveMutation.isPending || isEditNonDraft}
                    />
                  )
                }}
              />
            </div>
          </Grid>

          {/* Ngày ký, Ngày hiệu lực, Ngày hết hạn */}
          <Grid columns="3" gap="5">
            <div data-field-name="sign_date">
              <FormController
                register={register}
                name="sign_date"
                control={control}
                Field={DatePicker}
                fieldProps={{
                  label: 'Ngày ký',
                  required: true,
                  placeholder: 'DD/MM/YYYY',
                  allowManualInput: true,
                  disabled: effectiveMutation.isPending,
                }}
              />
            </div>
            <div data-field-name="effective_date">
              <FormController
                register={register}
                name="effective_date"
                control={control}
                Field={DatePicker}
                fieldProps={{
                  label: 'Ngày hiệu lực',
                  required: true,
                  placeholder: 'DD/MM/YYYY',
                  allowManualInput: true,
                  disabled: effectiveMutation.isPending,
                }}
              />
            </div>
            <div data-field-name="expiration_date">
              <FormController
                register={register}
                name="expiration_date"
                control={control}
                Field={DatePicker}
                fieldProps={{
                  label: 'Ngày hết hiệu lực',
                  required: false,
                  placeholder: 'DD/MM/YYYY',
                  allowManualInput: true,
                  clearable: true,
                  disabled: effectiveMutation.isPending,
                }}
              />
            </div>
          </Grid>

          {/* Loại thời hạn hợp đồng, Số ngày nghỉ phép */}
          <Grid columns="3" gap="5">
            <div className="flex-1" data-field-name="duration_type">
              <FormController
                register={register}
                name="duration_type"
                control={control}
                Field={DurationTypeRadioGroup}
                fieldProps={{
                  id: 'duration_type',
                  label: 'Loại thời hạn hợp đồng',
                  required: true,
                  disabled: true, // Always disabled - value comes from contract type
                  options: durationTypeOptions,
                  defaultEnumValue: ContractDurationType.indefinite,
                  onSetValue: (name: string, value: any) => {
                    setValue(name as any, value, { shouldDirty: true })
                  },
                  className: 'gap-2',
                }}
              />
            </div>
            <div data-field-name="contract_duration">
              <FormController
                register={register}
                name="contract_duration"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Thời hạn hợp đồng',
                  required: durationType === ContractDurationType.fixed,
                  placeholder: 'Nhập thời hạn',
                  suffix: 'tháng',
                  caption: 'Chỉ nhập khi Thời hạn hợp đồng là Xác định thời hạn.',
                  disabled:
                    durationType === ContractDurationType.indefinite ||
                    mutation.isPending ||
                    isEditNonDraft,
                  maxLength: 2,
                  showCharacterCount: false,
                }}
              />
            </div>
            <div data-field-name="annual_leave_days">
              <FormController
                register={register}
                name="annual_leave_days"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Số ngày nghỉ phép',
                  required: true,
                  placeholder: 'Nhập số ngày nghỉ phép',
                  suffix: 'ngày',
                  maxLength: 2,
                  disabled: mutation.isPending || isEditNonDraft,
                }}
              />
            </div>
          </Grid>

          {/* Mức lương cơ bản, Mức lương KPI */}
          <Grid columns="2" gap="5">
            <div data-field-name="base_salary">
              <FormController
                register={register}
                name="base_salary"
                control={control}
                Field={CurrencyInput}
                fieldProps={{
                  label: 'Mức lương cơ bản',
                  required: true,
                  placeholder: 'Nhập mức lương cơ bản',
                  disabled: effectiveMutation.isPending,
                }}
              />
            </div>
            <div data-field-name="kpi_salary">
              <FormController
                register={register}
                name="kpi_salary"
                control={control}
                Field={CurrencyInput}
                fieldProps={{
                  label: 'Mức lương KPI',
                  required: false,
                  placeholder: 'Nhập mức lương KPI',
                  disabled: effectiveMutation.isPending,
                }}
              />
            </div>
          </Grid>

          {/* Phụ cấp ăn trưa, Phụ cấp điện thoại, Phụ cấp khác */}
          <Grid columns="3" gap="5">
            <div data-field-name="lunch_allowance">
              <FormController
                register={register}
                name="lunch_allowance"
                control={control}
                Field={CurrencyInput}
                fieldProps={{
                  label: 'Phụ cấp ăn trưa',
                  placeholder: 'Nhập phụ cấp ăn trưa',
                  disabled: effectiveMutation.isPending,
                }}
              />
            </div>
            <div data-field-name="phone_allowance">
              <FormController
                register={register}
                name="phone_allowance"
                control={control}
                Field={CurrencyInput}
                fieldProps={{
                  label: 'Phụ cấp điện thoại',
                  placeholder: 'Nhập phụ cấp điện thoại',
                  disabled: effectiveMutation.isPending,
                }}
              />
            </div>
            <div data-field-name="other_allowance">
              <FormController
                register={register}
                name="other_allowance"
                control={control}
                Field={CurrencyInput}
                fieldProps={{
                  label: 'Phụ cấp khác',
                  placeholder: 'Nhập phụ cấp khác',
                  disabled: effectiveMutation.isPending,
                }}
              />
            </div>
          </Grid>

          {/* Loại nhân viên (mặc định lấy theo loại hợp đồng) */}
          <Grid columns="2" gap="5">
            <div data-field-name="employee_type">
              <FormController
                register={register}
                name="employee_type"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Loại nhân viên',
                  required: true,
                  placeholder: 'Chọn loại nhân viên',
                  options: employeeTypeOptions,
                  clearable: true,
                  className: 'w-full',
                  disabled: mutation.isPending || isEditNonDraft,
                  caption: 'Mặc định lấy theo loại hợp đồng, có thể chỉnh sửa',
                }}
              />
            </div>
          </Grid>

          {/* Cách tính thuế, Phần trăm lương thực nhận trong thời gian thử việc, Bảo hiểm xã hội */}
          <Grid columns="2" gap="5">
            <div className="flex-1" data-field-name="tax_calculation_method">
              <FormController
                register={register}
                name="tax_calculation_method"
                control={control}
                Field={TaxCalculationMethodRadioGroup}
                fieldProps={{
                  id: 'tax_calculation_method',
                  label: 'Cách tính thuế',
                  required: true,
                  disabled: mutation.isPending || isEditNonDraft,
                  options: taxCalculationMethodOptions,
                  defaultEnumValue: ContractTax_calculation_method.progressive,
                  className: 'gap-4',
                }}
              />
            </div>
            <div className="flex-1" data-field-name="net_percentage">
              <FormController
                register={register}
                name="net_percentage"
                control={control}
                Field={NetPercentageRadioGroup}
                fieldProps={{
                  id: 'net_percentage',
                  label: 'Phần trăm lương thực nhận trong thời gian thử việc',
                  required: false,
                  disabled: mutation.isPending || isEditNonDraft,
                  options: netPercentageOptions,
                  defaultEnumValue: ContractNet_percentage.Value100,
                }}
              />
            </div>
          </Grid>

          <Grid columns={'2'} gap={'5'}>
            {/* Nhân viên có bảo hiểm + Loại bảo hiểm */}
            <div data-field-name="has_social_insurance">
              <FormController
                register={register}
                name="has_social_insurance"
                control={control}
                Field={SocialInsuranceRadioGroup}
                fieldProps={{
                  id: 'has_social_insurance',
                  label: 'Nhân viên có bảo hiểm',
                  required: true,
                  disabled: effectiveMutation.isPending,
                  options: socialInsuranceOptions,
                }}
              />
            </div>

            {/* Loại bảo hiểm (group checkbox from ContractInsurance_types) */}
            <div data-field-name="insurance_types">
              <Controller
                name="insurance_types"
                control={control}
                render={({ field }) => {
                  const selected = (field.value ?? []) as ContractInsurance_types[]
                  const toggle = (type: ContractInsurance_types) => {
                    const next = selected.includes(type)
                      ? selected.filter((t) => t !== type)
                      : [...selected, type]
                    field.onChange(next)
                  }
                  return (
                    <div className="flex flex-col gap-2">
                      <p className="typo-body-base-semibold text-content-dark-2">Loại bảo hiểm</p>
                      <Flex gap="4" wrap="wrap">
                        {(
                          Object.keys(CONTRACT_INSURANCE_TYPE_LABELS) as ContractInsurance_types[]
                        ).map((type) => (
                          <div key={type} className="flex items-center gap-2">
                            <Checkbox
                              id={`insurance_types_${type}`}
                              checked={selected.includes(type)}
                              onCheckedChange={() => toggle(type)}
                              disabled={effectiveMutation.isPending}
                              label={CONTRACT_INSURANCE_TYPE_LABELS[type]}
                            />
                          </div>
                        ))}
                      </Flex>
                    </div>
                  )
                }}
              />
            </div>
          </Grid>

          {/* Ghi chú */}
          <div data-field-name="note">
            <FormController
              register={register}
              name="note"
              control={control}
              Field={TextArea}
              fieldProps={{
                label: 'Ghi chú',
                required: false,
                placeholder: 'Nhập ghi chú',
                maxCharacters: 500,
                disabled: effectiveMutation.isPending,
              }}
            />
          </div>
        </div>

        <Separator orientation={'horizontal'} className={'!w-full'} />

        {/* File đính kèm */}
        <div data-field-name="attachment">
          <FormController
            register={register}
            name="attachment"
            control={control}
            Field={FileUpload}
            fieldProps={{
              label: 'File đính kèm',
              required: false,
              disabled: mutation.isPending || isEditNonDraft,
              existingFile: initialData?.attachment,
              purpose: 'hrm_contract_attachment',
            }}
          />
        </div>

        {/* Action buttons */}
        <Flex gap="4" justify="end">
          <Button
            type="button"
            variant="text"
            onClick={onCancel}
            disabled={effectiveMutation.isPending}
          >
            Huỷ
          </Button>
          {isEditNonDraft ? (
            <Button
              type="submit"
              variant="primary"
              disabled={partialUpdateMutation.isPending}
              loading={partialUpdateMutation.isPending}
            >
              Lưu
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSubmit(onSaveDraft)}
                disabled={mutation.isPending || publishMutation.isPending}
                loading={mutation.isPending || publishMutation.isPending}
              >
                Lưu nháp
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={mutation.isPending || publishMutation.isPending}
                loading={mutation.isPending || publishMutation.isPending}
              >
                Ban hành
              </Button>
            </>
          )}
        </Flex>
      </div>
    </Form>
  )
}

export default ContractForm
