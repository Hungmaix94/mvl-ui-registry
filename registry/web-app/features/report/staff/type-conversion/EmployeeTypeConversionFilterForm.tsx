import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import FormController from '@/components/ui/form/FormController.tsx'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { Select } from '@/components/ui'
import type { DateRange } from 'react-day-picker'
import { Flex } from '@radix-ui/themes'
import { startOfQuarter, endOfQuarter } from 'date-fns'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'

export type EmployeeTypeConversionFilterFormValues = {
  dateRange?: DateRange | null
  branch?: number
  block?: number
  department?: number
  employee_id?: number
  branchName?: string
  blockName?: string
  departmentName?: string
  old_employee_type?: string
  new_employee_type?: string
}

export interface EmployeeTypeConversionFilterFormRef {
  clearForm: () => void
  getValues: () => EmployeeTypeConversionFilterFormValues
}

interface EmployeeTypeConversionFilterFormProps {
  initialValues: EmployeeTypeConversionFilterFormValues
  onApply?: (values: EmployeeTypeConversionFilterFormValues) => void
  onValidationChange?: (isValid: boolean) => void
}

const EmployeeTypeConversionFilterForm = forwardRef<
  EmployeeTypeConversionFilterFormRef,
  EmployeeTypeConversionFilterFormProps
>(({ initialValues, onValidationChange }, ref) => {
  const today = new Date()
  const defaultDateRange: DateRange = {
    from: startOfQuarter(today),
    to: endOfQuarter(today),
  }

  const form = useForm<EmployeeTypeConversionFilterFormValues>({
    defaultValues: {
      dateRange: initialValues?.dateRange ?? defaultDateRange,
      branch: initialValues?.branch,
      block: initialValues?.block,
      department: initialValues?.department,
      employee_id: initialValues?.employee_id,
      branchName: initialValues?.branchName,
      blockName: initialValues?.blockName,
      departmentName: initialValues?.departmentName,
      old_employee_type: initialValues?.old_employee_type,
      new_employee_type: initialValues?.new_employee_type,
    },
  })

  const { setValue, reset, watch } = form

  // Watch dateRange to notify parent about validation
  const dateRange = watch('dateRange')
  useEffect(() => {
    const isValid = !!(dateRange?.from && dateRange?.to)
    onValidationChange?.(isValid)
  }, [dateRange, onValidationChange])

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.EMPLOYEE_TYPE],
  })

  const employeeTypeOptions = useMemo(() => {
    return keysMapOptions.get(APP_CONSTANT_KEY.HRM.EMPLOYEE_TYPE) || []
  }, [keysMapOptions])

  const buildCascadeInitialValues = useCallback(
    (values: EmployeeTypeConversionFilterFormValues | undefined) => ({
      branch: values?.branch ? values.branch.toString() : undefined,
      block: values?.block ? values.block.toString() : undefined,
      department: values?.department ? values.department.toString() : undefined,
      employee: values?.employee_id ? values.employee_id.toString() : undefined,
    }),
    []
  )

  const [cascadeInitialValues, setCascadeInitialValues] = useState(() =>
    buildCascadeInitialValues(initialValues)
  )
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    reset({
      dateRange: initialValues?.dateRange ?? defaultDateRange,
      branch: initialValues?.branch,
      block: initialValues?.block,
      department: initialValues?.department,
      employee_id: initialValues?.employee_id,
      branchName: initialValues?.branchName,
      blockName: initialValues?.blockName,
      departmentName: initialValues?.departmentName,
      old_employee_type: initialValues?.old_employee_type,
      new_employee_type: initialValues?.new_employee_type,
    })
    setCascadeInitialValues(buildCascadeInitialValues(initialValues))
    setFormKey((prev) => prev + 1)
  }, [initialValues, reset, buildCascadeInitialValues])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        reset({
          dateRange: defaultDateRange,
          branch: undefined,
          block: undefined,
          department: undefined,
          employee_id: undefined,
          branchName: undefined,
          blockName: undefined,
          departmentName: undefined,
          old_employee_type: undefined,
          new_employee_type: undefined,
        })
        setCascadeInitialValues(buildCascadeInitialValues({}))
        setFormKey((prev) => prev + 1)
      },
      getValues: () => form.getValues(),
    }),
    [form, reset, buildCascadeInitialValues, defaultDateRange]
  )

  const handleCascadeChange = useCallback(
    (data: any) => {
      setValue('branch', data.branch_id && data.branch_id !== 0 ? data.branch_id : undefined)
      setValue('block', data.block_id && data.block_id !== 0 ? data.block_id : undefined)
      setValue(
        'department',
        data.department_id && data.department_id !== 0 ? data.department_id : undefined
      )
      setValue(
        'employee_id',
        data.employee_id && data.employee_id !== 0 ? data.employee_id : undefined
      )
      setValue('branchName', data.branch_name)
      setValue('blockName', data.block_name)
      setValue('departmentName', data.department_name)
    },
    [setValue]
  )

  return (
    <div className="flex flex-col gap-5">
      <Flex direction="column" gap="2">
        <FormController
          control={form.control}
          name="dateRange"
          register={form.register}
          Field={DateRangePicker}
          fieldProps={{
            label: 'Thời gian',
            placeholder: 'Chọn khoảng thời gian',
            className: 'w-full',
            showQuickSelect: true,
            required: true,
          }}
        />
      </Flex>

      <CascadeSelectGroupOrganization
        key={`cascade-${formKey}`}
        initialValues={cascadeInitialValues}
        onFormChange={handleCascadeChange}
        showEmployee={true}
        showPosition={false}
        employeeLabel="Nhân Viên"
        skipValidation
        className="w-full gap-5"
      />

      <Flex direction="row" gap="4" className="w-full">
        <div className="flex-1">
          <FormController
            key={`old_employee_type-${formKey}`}
            control={form.control}
            name="old_employee_type"
            register={form.register}
            Field={Select}
            fieldProps={{
              label: 'Loại nhân viên cũ',
              placeholder: 'Chọn loại nhân viên cũ',
              options: employeeTypeOptions,
              className: 'w-full',
              clearable: true,
            }}
          />
        </div>

        <div className="flex-1">
          <FormController
            key={`new_employee_type-${formKey}`}
            control={form.control}
            name="new_employee_type"
            register={form.register}
            Field={Select}
            fieldProps={{
              label: 'Loại nhân viên mới',
              placeholder: 'Chọn loại nhân viên mới',
              options: employeeTypeOptions,
              className: 'w-full',
              clearable: true,
            }}
          />
        </div>
      </Flex>
    </div>
  )
})

EmployeeTypeConversionFilterForm.displayName = 'EmployeeTypeConversionFilterForm'

export default EmployeeTypeConversionFilterForm
