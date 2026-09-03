import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import { startOfMonth } from 'date-fns'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Checkbox } from '@/components/ui/checkbox'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import MonthPicker from '@/components/ui/month-picker/MonthPicker.tsx'
import useOrganization from '@/hooks/useOrganization.tsx'
import { formatMonthForApi } from '@/features/attendance/timesheet/_shares/utils/timesheet-utils.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { EmployeeSalaryType } from '@/constants/api-schema-aliases'
export type TimesheetFilterFormRef = {
  clearForm: () => void
  getValues: () => Record<string, any>
  getRawValues: () => TimesheetFilterFormValues
  trigger: () => Promise<boolean>
  isValid?: () => boolean
}

type TimesheetFilterFormProps = {
  initialValues?: Record<string, any>
  onValidationChange?: (isValid: boolean) => void
}

export type TimesheetFilterFormValues = {
  branch_id?: number
  block_id?: number
  department_id?: number
  position_id?: number
  employee_id?: number
  employee_salary_type?: EmployeeSalaryType[]
  month?: Date
  has_conflict?: boolean
}

const Schema = z.object({
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  position_id: z.number().optional(),
  employee_id: z.number().optional(),
  employee_salary_type: z.array(z.nativeEnum(EmployeeSalaryType)).optional(),
  month: z.date({
    required_error: 'Vui lòng chọn tháng',
    invalid_type_error: 'Vui lòng chọn tháng',
  }),
  has_conflict: z.boolean().optional(),
})

const TimesheetFilterForm = forwardRef<TimesheetFilterFormRef, TimesheetFilterFormProps>(
  ({ initialValues, onValidationChange }, ref) => {
    const { keysMapOptions } = useAppConstant({
      module: 'hrm',
      keys: [APP_CONSTANT_KEY.HRM.EMPLOYEE_SALARY_TYPE],
    })

    const salaryTypeOptions = useMemo(() => {
      return keysMapOptions.has(APP_CONSTANT_KEY.HRM.EMPLOYEE_SALARY_TYPE)
        ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.EMPLOYEE_SALARY_TYPE) || []
        : []
    }, [keysMapOptions])

    const defaultMonth = useMemo(() => {
      if (initialValues?.month) {
        // If it's already a Date, use it
        if (initialValues.month instanceof Date) {
          return initialValues.month
        }
        // If it's a string, try to parse it
        if (typeof initialValues.month === 'string') {
          const parsed = new Date(initialValues.month)
          if (!isNaN(parsed.getTime())) {
            return startOfMonth(parsed)
          }
        }
      }
      return startOfMonth(new Date())
    }, [initialValues?.month])

    const {
      control,
      reset,
      getValues,
      handleSubmit,
      watch,
      setValue,
      register,
      formState,
      trigger,
    } = useForm<TimesheetFilterFormValues>({
      resolver: zodResolver(Schema) as any,
      mode: 'onChange',
      reValidateMode: 'onChange',
      defaultValues: {
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        position_id: initialValues?.position_id,
        employee_id: initialValues?.employee_id,
        employee_salary_type: initialValues?.employee_salary_type || [],
        month: defaultMonth,
        has_conflict: initialValues?.has_conflict || false,
      },
    })

    const monthValue = watch('month')

    // Trigger validation when monthValue changes
    useEffect(() => {
      trigger('month').then(() => {
        // Validation triggered, will update formState.isValid
      })
    }, [monthValue, trigger])

    // Notify parent when validation state changes
    useEffect(() => {
      // Check validity: month must be selected and form must be valid
      // Use monthValue directly as primary check since formState.isValid might lag
      const hasMonth = !!monthValue
      // If month is cleared (undefined), form is invalid
      // If month exists, check formState.isValid or absence of errors
      const isValid = hasMonth && (formState.isValid || !formState.errors.month)
      onValidationChange?.(isValid)
    }, [formState.isValid, monthValue, onValidationChange, formState.errors.month])

    const [formKey, setFormKey] = useState(0)

    const watchedBranch = watch('branch_id')
    const watchedBlock = watch('block_id')
    const watchedDepartment = watch('department_id')
    const watchedPosition = watch('position_id')
    const watchedSalaryType = watch('employee_salary_type') || []

    useOrganization({
      branch: watchedBranch,
      block: watchedBlock,
    })

    useEffect(() => {
      if (initialValues && Object.keys(initialValues).length > 0) {
        let monthValue: Date = startOfMonth(new Date())

        if (initialValues?.month) {
          // If it's already a Date, use it
          if (initialValues.month instanceof Date) {
            monthValue = initialValues.month
          }
          // If it's a string, try to parse it
          else if (typeof initialValues.month === 'string') {
            const parsed = new Date(initialValues.month)
            if (!isNaN(parsed.getTime())) {
              monthValue = startOfMonth(parsed)
            }
          }
        }

        reset({
          branch_id: initialValues?.branch_id,
          block_id: initialValues?.block_id,
          department_id: initialValues?.department_id,
          position_id: initialValues?.position_id,
          employee_id: initialValues?.employee_id,
          employee_salary_type: initialValues?.employee_salary_type || [],
          month: monthValue,
          has_conflict: initialValues?.has_conflict || false,
        })
      }
    }, [initialValues, reset])

    useImperativeHandle(ref, () => ({
      clearForm: () => {
        reset({
          branch_id: undefined,
          block_id: undefined,
          department_id: undefined,
          position_id: undefined,
          employee_id: undefined,
          employee_salary_type: [],
          month: undefined,
          has_conflict: false,
        })
        setFormKey((prev) => prev + 1)
      },
      getRawValues: () => {
        return getValues()
      },
      getValues: () => {
        const values = getValues()
        const apiParams: Record<string, any> = {}

        if (values.branch_id) apiParams.branch = values.branch_id
        if (values.block_id) apiParams.block = values.block_id
        if (values.department_id) apiParams.department = values.department_id
        if (values.position_id) apiParams.position = values.position_id
        if (values.employee_id) apiParams.employee = values.employee_id

        if (values.employee_salary_type && values.employee_salary_type.length > 0) {
          apiParams.employee_salary_type = values.employee_salary_type
        }

        if (values.month) {
          apiParams.month = formatMonthForApi(values.month)
        }

        if (values.has_conflict) {
          apiParams.has_conflict = true
        }

        return apiParams
      },
      trigger: async () => {
        return await trigger()
      },
      isValid: () => {
        const hasMonth = !!monthValue
        return hasMonth && (formState.isValid || !formState.errors.month)
      },
    }))

    const handleCascadeChange = useCallback(
      (data: any) => {
        const current = getValues()

        if (data.branch_id !== undefined && data.branch_id !== current.branch_id) {
          setValue('branch_id', data.branch_id, { shouldDirty: false })
          setValue('block_id', undefined, { shouldDirty: false })
          setValue('department_id', undefined, { shouldDirty: false })
        }

        if (data.block_id !== undefined && data.block_id !== current.block_id) {
          setValue('block_id', data.block_id, { shouldDirty: false })
          setValue('department_id', undefined, { shouldDirty: false })
        }

        if (data.department_id !== undefined && data.department_id !== current.department_id) {
          setValue('department_id', data.department_id, { shouldDirty: false })
        }

        if (data.position_id !== undefined && data.position_id !== current.position_id) {
          setValue('position_id', data.position_id, { shouldDirty: false })
        }

        if (data.employee_id !== undefined && data.employee_id !== current.employee_id) {
          setValue('employee_id', data.employee_id, { shouldDirty: false })
        }
      },
      [getValues, setValue]
    )

    const handleSalaryTypeChange = useCallback(
      (type: string, checked: boolean) => {
        const current = watchedSalaryType
        const typedType = type as EmployeeSalaryType
        if (checked) {
          setValue('employee_salary_type', [...current, typedType], { shouldDirty: false })
        } else {
          setValue(
            'employee_salary_type',
            current.filter((t) => t !== typedType),
            { shouldDirty: false }
          )
        }
      },
      [watchedSalaryType, setValue]
    )

    const onSubmit = async (_data: TimesheetFilterFormValues) => {
      // Form submission is handled by parent via ref
    }

    return (
      <Form key={formKey} loading={false} onSubmit={onSubmit} handleSubmit={handleSubmit as any}>
        <Flex direction={'column'} gap={'5'}>
          {/* Organization cascade select */}
          <CascadeSelectGroupOrganization
            initialValues={{
              branch: watchedBranch ? String(watchedBranch) : undefined,
              block: watchedBlock ? String(watchedBlock) : undefined,
              department: watchedDepartment ? String(watchedDepartment) : undefined,
              position: watchedPosition ? String(watchedPosition) : undefined,
              employee: watch('employee_id') ? String(watch('employee_id')) : undefined,
            }}
            onFormChange={(data) => {
              handleCascadeChange({
                branch_id: data.branch_id,
                block_id: data.block_id,
                department_id: data.department_id,
                position_id: data.position_id,
                employee_id: data.employee_id,
              })
            }}
            showEmployee={true}
            showPosition={true}
            employeeLabel="Nhân viên"
            positionLabel="Chức vụ"
            skipValidation={true}
            className="gap-5"
          />

          {/* Employee Salary Type */}
          <div className="flex flex-col gap-3 space-y-2">
            <label className="typo-body-base-semibold text-content-dark-2 mb-0">
              Loại nhân viên
            </label>
            <div className="flex flex-wrap gap-6">
              {salaryTypeOptions.map((option: { value: string; label: string }) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={watchedSalaryType.includes(option.value as EmployeeSalaryType)}
                    onCheckedChange={(checked) =>
                      handleSalaryTypeChange(option.value, checked as boolean)
                    }
                  />
                  <label className="typo-body-base-regular text-content-dark-1">
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Conflict filter */}
          <div className="flex flex-col gap-3 space-y-2">
            <label className="typo-body-base-semibold text-content-dark-2 mb-0">
              Ngày công xung đột
            </label>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={!!watch('has_conflict')}
                onCheckedChange={(checked) =>
                  setValue('has_conflict', checked as boolean, { shouldDirty: false })
                }
              />
              <label className="typo-body-base-regular text-content-dark-1">
                Chỉ hiển thị ngày công bị xung đột
              </label>
            </div>
          </div>

          {/* Month */}
          <div className="flex flex-col gap-2 space-y-2">
            <label className="typo-body-base-semibold text-content-dark-2 mb-0">
              Tháng <span className="text-action-primary-red-default">*</span>
            </label>
            <FormController
              register={register}
              name="month"
              control={control}
              Field={MonthPicker}
              fieldProps={{
                placeholder: 'Chọn tháng',
                showYear: true,
                required: true,
                value: watch('month'),
                onChange: (date: Date | undefined) => {
                  // Allow undefined to be set (for clearing)
                  setValue('month', date, { shouldDirty: false, shouldValidate: true })
                  // Trigger validation after state update
                  setTimeout(() => {
                    trigger('month')
                  }, 0)
                },
              }}
            />
            {formState.errors.month && (
              <p className="text-action-primary-red-default text-sm">
                {formState.errors.month.message}
              </p>
            )}
          </div>
        </Flex>
      </Form>
    )
  }
)

TimesheetFilterForm.displayName = 'TimesheetFilterForm'

export default TimesheetFilterForm
