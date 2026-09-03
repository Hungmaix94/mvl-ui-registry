import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Checkbox } from '@/components/ui'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import {
  CascadeSelectGroupOrganization,
  type CascadeSelectFormData,
} from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
export type ContractAppendixFilterFormRef = {
  clearForm: () => void
  getValues?: () => ContractAppendixFilterFormValues
  getRawValues?: () => ContractAppendixFilterFormValues
}

type ContractAppendixFilterFormProps = {
  initialValues?: Record<string, any>
}

type TDateRange = {
  from?: Date
  to?: Date
}

export type ContractAppendixFilterFormValues = {
  effective_date_range?: TDateRange | null
  branch_id?: number
  block_id?: number
  department_id?: number
  employee_id?: number
  status?: string[]
}

const Schema = z.object({
  effective_date_range: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .nullable()
    .optional(),
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  employee_id: z.number().optional(),
  status: z.array(z.string()).optional(),
})

const ContractAppendixFilterForm = forwardRef<
  ContractAppendixFilterFormRef,
  ContractAppendixFilterFormProps
>(({ initialValues }, ref) => {
  const { control, reset, getValues, handleSubmit, watch, setValue, register } =
    useForm<ContractAppendixFilterFormValues>({
      resolver: zodResolver(Schema) as any,
      defaultValues: {
        effective_date_range: initialValues?.effective_date_range || null,
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        employee_id: initialValues?.employee_id,
        status: initialValues?.status || [],
      },
    })

  // Fetch status options from constants
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS],
  })

  const statusOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS)
      ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS) || []
      : []
  }, [keysMapOptions])

  const [formKey, setFormKey] = useState(0)
  const [shouldResetToInitial, setShouldResetToInitial] = useState(true)

  // Reset form when component mounts with initialValues (when dialog opens)
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      // Ensure status is always an array
      const statusArray = Array.isArray(initialValues?.status)
        ? initialValues.status
        : initialValues?.status
          ? [initialValues.status]
          : []

      const resetValues = {
        effective_date_range: initialValues?.effective_date_range || null,
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        employee_id: initialValues?.employee_id,
        status: statusArray,
      }

      reset(resetValues)
      setShouldResetToInitial(true)
      setFormKey(0)
    } else {
      reset({
        effective_date_range: null,
        branch_id: undefined,
        block_id: undefined,
        department_id: undefined,
        employee_id: undefined,
        status: [],
      })
      setFormKey(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Khi initialValues thay đổi → reset form (for when dialog reopens with different values)
  useEffect(() => {
    if (shouldResetToInitial && initialValues && Object.keys(initialValues).length > 0) {
      // Ensure status is always an array
      const statusArray = Array.isArray(initialValues?.status)
        ? initialValues.status
        : initialValues?.status
          ? [initialValues.status]
          : []

      const resetValues = {
        effective_date_range: initialValues?.effective_date_range || null,
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        department_id: initialValues?.department_id,
        employee_id: initialValues?.employee_id,
        status: statusArray,
      }

      reset(resetValues)
      setShouldResetToInitial(true)
      // Reset formKey to 0 to allow CascadeSelectGroupOrganization to receive new initialValues
      setFormKey(0)
    } else if (!initialValues || Object.keys(initialValues).length === 0) {
      // If no initialValues, reset formKey to allow clearing
      setFormKey(0)
    }
  }, [initialValues, reset, shouldResetToInitial])

  // expose các hàm public ra ngoài
  useImperativeHandle(ref, () => ({
    clearForm: () => {
      setShouldResetToInitial(false)
      reset(
        {
          effective_date_range: null,
          branch_id: undefined,
          block_id: undefined,
          department_id: undefined,
          employee_id: undefined,
          status: [],
        },
        {
          keepDefaultValues: false,
        }
      )
      setFormKey((prev) => prev + 1)
    },
    getRawValues: () => {
      return getValues()
    },
    getValues: () => {
      const values = getValues()
      // This method is used internally by the form, the actual API params conversion
      // is handled in useContractAppendixFilter hook's onClickApply
      return values
    },
  }))

  // Khi người dùng chọn branch/block/department/employee
  const handleCascadeChange = useCallback(
    (data: CascadeSelectFormData) => {
      const current = getValues()

      // Handle branch_id - set value if changed, or clear if undefined/null
      if (data.branch_id !== undefined && data.branch_id !== current.branch_id) {
        setValue('branch_id', data.branch_id > 0 ? data.branch_id : undefined, {
          shouldDirty: false,
        })
      } else if (data.branch_id === undefined || data.branch_id === null || data.branch_id === 0) {
        setValue('branch_id', undefined, { shouldDirty: false })
      }

      // Handle block_id - set value if changed, or clear if undefined/null
      if (data.block_id !== undefined && data.block_id !== current.block_id) {
        setValue('block_id', data.block_id > 0 ? data.block_id : undefined, {
          shouldDirty: false,
        })
      } else if (data.block_id === undefined || data.block_id === null || data.block_id === 0) {
        setValue('block_id', undefined, { shouldDirty: false })
      }

      // Handle department_id - set value if changed, or clear if undefined/null
      if (data.department_id !== undefined && data.department_id !== current.department_id) {
        setValue('department_id', data.department_id > 0 ? data.department_id : undefined, {
          shouldDirty: false,
        })
      } else if (
        data.department_id === undefined ||
        data.department_id === null ||
        data.department_id === 0
      ) {
        setValue('department_id', undefined, { shouldDirty: false })
      }

      // Handle employee_id - set value if changed, or clear if undefined/null
      if (data.employee_id !== undefined && data.employee_id !== current.employee_id) {
        setValue('employee_id', data.employee_id > 0 ? data.employee_id : undefined, {
          shouldDirty: false,
        })
      } else if (
        data.employee_id === undefined ||
        data.employee_id === null ||
        data.employee_id === 0
      ) {
        setValue('employee_id', undefined, { shouldDirty: false })
      }
    },
    [setValue, getValues]
  )

  const [isLoading, setIsLoading] = useState(false)
  const selectedStatuses = watch('status')

  const handleCheckboxChange = (value: string, checked: boolean) => {
    const current = watch('status') || []
    if (checked) {
      setValue('status', [...current, value])
    } else {
      setValue(
        'status',
        current.filter((v) => v !== value)
      )
    }
  }

  const onSubmit = async (_data: ContractAppendixFilterFormValues) => {
    setIsLoading(true)
    try {
      // Form submission is handled by parent component
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form onSubmit={onSubmit} handleSubmit={handleSubmit as any} loading={isLoading}>
      <Flex direction="column" gap="5">
        {/* Date range - Ngày hiệu lực */}
        <FormController
          name="effective_date_range"
          control={control}
          register={register}
          Field={DateRangePicker}
          fieldProps={{
            label: 'Ngày hiệu lực',
            className: 'w-full',
            showQuickSelect: true,
          }}
        />

        {/* CascadeSelectGroupOrganization */}
        <CascadeSelectGroupOrganization
          key={formKey}
          initialValues={
            formKey === 0
              ? {
                  branch: initialValues?.branch_id?.toString(),
                  block: initialValues?.block_id?.toString(),
                  department: initialValues?.department_id?.toString(),
                  employee: initialValues?.employee_id?.toString(),
                }
              : undefined
          }
          onFormChange={handleCascadeChange}
          skipValidation
          showEmployee={true}
          employeeLabel="Nhân viên"
          className={'gap-5'}
        />

        {/* Status Checkboxes */}
        <div className="flex flex-col gap-3">
          <label className="typo-body-base-semibold text-content-dark-2">Trạng thái</label>
          <div className="flex flex-wrap gap-[23px]">
            {statusOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2 py-1.5">
                <Checkbox
                  checked={selectedStatuses?.includes(option.value)}
                  onCheckedChange={(checked: any) =>
                    handleCheckboxChange(option.value, Boolean(checked))
                  }
                />
                <span className="text-content-dark-1 text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </Flex>
    </Form>
  )
})

ContractAppendixFilterForm.displayName = 'NoContractFilterForm'
export default ContractAppendixFilterForm
