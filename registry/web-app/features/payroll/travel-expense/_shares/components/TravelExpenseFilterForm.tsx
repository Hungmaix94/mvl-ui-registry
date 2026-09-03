import { useState, forwardRef, useImperativeHandle, useEffect, useMemo } from 'react'
import Form from '@/components/ui/form/Form.tsx'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import FormController from '@/components/ui/form/FormController.tsx'
import { Flex, Text } from '@radix-ui/themes'
import { Checkbox } from '@/components/ui'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import type { CascadeSelectFormData } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import MonthPicker from '@/components/ui/month-picker/MonthPicker.tsx'
import { parse, isValid } from 'date-fns'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'

export type TravelExpenseFilterFormRef = {
  clearForm: () => void
  getValues?: () => TravelExpenseFilterForm
  submitForm: () => void
}

type TravelExpenseFilterFormProps = {
  initialValues?: Record<string, any>
}

export type TravelExpenseFilterForm = {
  month?: Date
  employee?: string
  branch_id?: number
  block_id?: number
  department_id?: number
  position_id?: number
  expense_type?: string[]
  status?: string[]
}

const Schema = z.object({
  month: z.date().nullable().optional(),
  employee: z.coerce.number().optional(),
  branch_id: z.coerce.number().optional(),
  block_id: z.coerce.number().optional(),
  department_id: z.coerce.number().optional(),
  position_id: z.coerce.number().optional(),
  expense_type: z.array(z.string()).optional(),
  status: z.array(z.string()).optional(),
})

// Helper function to normalize month value (can be Date or string)
const normalizeMonth = (month: unknown): Date | undefined => {
  if (!month) return undefined
  if (month instanceof Date) {
    return isValid(month) ? month : undefined
  }
  if (typeof month === 'string') {
    try {
      const parsed = parse(month, 'MM/yyyy', new Date())
      return isValid(parsed) ? parsed : undefined
    } catch {
      return undefined
    }
  }
  return undefined
}

const TravelExpenseFilterForm = forwardRef<
  TravelExpenseFilterFormRef,
  TravelExpenseFilterFormProps
>(({ initialValues }, ref) => {
  const [shouldResetToInitial, setShouldResetToInitial] = useState<boolean>(true)
  const [formKey, setFormKey] = useState(0)

  const { keysMapOptions } = useAppConstant({
    module: 'payroll',
    keys: [
      APP_CONSTANT_KEY.PAYROLL.TRAVEL_EXPENSE_EXPENSE_TYPE,
      APP_CONSTANT_KEY.PAYROLL.TRAVEL_EXPENSE_TRAVEL_EXPENSE_STATUS,
    ],
  })

  const expenseTypeOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.PAYROLL.TRAVEL_EXPENSE_EXPENSE_TYPE)
      ? keysMapOptions.get(APP_CONSTANT_KEY.PAYROLL.TRAVEL_EXPENSE_EXPENSE_TYPE) || []
      : []
  }, [keysMapOptions])

  const statusOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.PAYROLL.TRAVEL_EXPENSE_TRAVEL_EXPENSE_STATUS)
      ? keysMapOptions.get(APP_CONSTANT_KEY.PAYROLL.TRAVEL_EXPENSE_TRAVEL_EXPENSE_STATUS) || []
      : []
  }, [keysMapOptions])

  const { control, handleSubmit, register, reset, getValues, setValue, watch } =
    useForm<TravelExpenseFilterForm>({
      resolver: zodResolver(Schema) as any,
      defaultValues: {
        month: normalizeMonth(initialValues?.month),
        employee: initialValues?.employee || undefined,
        branch_id: initialValues?.branch_id || undefined,
        block_id: initialValues?.block_id || undefined,
        department_id: initialValues?.department_id || undefined,
        position_id: initialValues?.position_id || undefined,
        expense_type: Array.isArray(initialValues?.expense_type)
          ? initialValues.expense_type
          : initialValues?.expense_type
            ? [initialValues.expense_type]
            : [],
        status: Array.isArray(initialValues?.status)
          ? initialValues.status
          : initialValues?.status
            ? [initialValues.status]
            : [],
      },
    })

  const watchedExpenseType = watch('expense_type') || []
  const watchedStatus = watch('status') || []

  // Update form values when initialValues change
  useEffect(() => {
    if (shouldResetToInitial && initialValues && Object.keys(initialValues).length > 0) {
      reset({
        month: normalizeMonth(initialValues?.month),
        employee: initialValues?.employee || undefined,
        branch_id: initialValues?.branch_id || undefined,
        block_id: initialValues?.block_id || undefined,
        department_id: initialValues?.department_id || undefined,
        position_id: initialValues?.position_id || undefined,
        expense_type: Array.isArray(initialValues?.expense_type)
          ? initialValues.expense_type
          : initialValues?.expense_type
            ? [initialValues.expense_type]
            : [],
        status: Array.isArray(initialValues?.status)
          ? initialValues.status
          : initialValues?.status
            ? [initialValues.status]
            : [],
      })
    }
  }, [initialValues, reset, shouldResetToInitial])

  const handleCheckboxChange = (
    field: 'expense_type' | 'status',
    value: string,
    checked: boolean
  ) => {
    const currentValues = getValues(field) || []
    let newValues: string[]
    if (checked) {
      newValues = [...currentValues, value]
    } else {
      newValues = currentValues.filter((v) => v !== value)
    }
    setValue(field, newValues, { shouldDirty: true })
  }

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        setShouldResetToInitial(false)
        setFormKey((prev) => prev + 1)
        reset(
          {
            month: undefined,
            employee: undefined,
            branch_id: undefined,
            block_id: undefined,
            department_id: undefined,
            position_id: undefined,
            expense_type: [],
            status: [],
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
        setValue('month', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('employee', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('branch_id', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('block_id', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('department_id', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('position_id', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('expense_type', [], { shouldDirty: false, shouldValidate: false })
        setValue('status', [], { shouldDirty: false, shouldValidate: false })
      },
      getValues: () => getValues(),
      submitForm: () => handleSubmit(onSubmit)(),
    }),
    [reset, setValue, getValues, handleSubmit]
  )

  const handleCascadeChange = (data: CascadeSelectFormData) => {
    setValue('branch_id', data.branch_id || undefined, {
      shouldDirty: false,
      shouldValidate: false,
    })
    setValue('block_id', data.block_id || undefined, { shouldDirty: false, shouldValidate: false })
    setValue('department_id', data.department_id || undefined, {
      shouldDirty: false,
      shouldValidate: false,
    })
    setValue('position_id', data.position_id || undefined, {
      shouldDirty: false,
      shouldValidate: false,
    })
    if (data.employee_id) {
      setValue('employee', String(data.employee_id), { shouldDirty: false, shouldValidate: false })
    }
  }

  const onSubmit = (_data: TravelExpenseFilterForm) => {}

  return (
    <>
      <Form key={formKey} onSubmit={onSubmit} handleSubmit={handleSubmit as any} loading={false}>
        <Flex direction={'column'} gap={'4'}>
          <div className="flex flex-col gap-2 space-y-2">
            <FormController
              key={`month_${formKey}`}
              register={register}
              name="month"
              control={control}
              Field={MonthPicker}
              fieldProps={{
                label: 'Kỳ tính lương',
                placeholder: 'Chọn kỳ tính lương',
                showYear: true,
                onChange: (date: Date | undefined) => {
                  setValue('month', date, {
                    shouldDirty: false,
                    shouldValidate: false,
                  })
                },
              }}
            />
          </div>

          <CascadeSelectGroupOrganization
            initialValues={
              formKey === 0 && initialValues
                ? {
                    branch: initialValues?.branch_id?.toString(),
                    block: initialValues?.block_id?.toString(),
                    department: initialValues?.department_id?.toString(),
                    position: initialValues?.position_id?.toString(),
                    employee: initialValues?.employee?.toString(),
                  }
                : undefined
            }
            onFormChange={handleCascadeChange}
            skipValidation
            showEmployee
            showPosition
            positionLabel="Chức vụ"
            employeeLabel="Nhân viên"
            className="gap-4"
          />

          {/* Expense Type Checkboxes */}
          <Flex direction="column" gap="3">
            <Text className="text-content-dark-2 typo-body-base-semibold">Loại công tác phí</Text>
            <Flex gap="5" wrap="wrap">
              {expenseTypeOptions.map((option) => (
                <Flex key={option.value} align="center" gap="2">
                  <Checkbox
                    checked={watchedExpenseType.includes(option.value)}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange('expense_type', option.value, checked === true)
                    }
                    id={`expense-type-${option.value}`}
                  />
                  <label
                    htmlFor={`expense-type-${option.value}`}
                    className="text-content-dark-1 typo-body-base-regular cursor-pointer"
                  >
                    {option.label}
                  </label>
                </Flex>
              ))}
            </Flex>
          </Flex>

          {/* Status Checkboxes */}
          <Flex direction="column" gap="3">
            <Text className="text-content-dark-2 typo-body-base-semibold">Trạng thái</Text>
            <Flex gap="5" wrap="wrap">
              {statusOptions.map((option) => (
                <Flex key={option.value} align="center" gap="2">
                  <Checkbox
                    checked={watchedStatus.includes(option.value)}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange('status', option.value, checked === true)
                    }
                    id={`status-${option.value}`}
                  />
                  <label
                    htmlFor={`status-${option.value}`}
                    className="text-content-dark-1 typo-body-base-regular cursor-pointer"
                  >
                    {option.label}
                  </label>
                </Flex>
              ))}
            </Flex>
          </Flex>
        </Flex>
      </Form>
    </>
  )
})

TravelExpenseFilterForm.displayName = 'TravelExpenseFilterForm'

export default TravelExpenseFilterForm
