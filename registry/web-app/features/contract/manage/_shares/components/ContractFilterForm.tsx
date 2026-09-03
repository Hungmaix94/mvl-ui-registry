import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex, Grid } from '@radix-ui/themes'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Checkbox, Select } from '@/components/ui'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import {
  CascadeSelectGroupOrganization,
  type CascadeSelectFormData,
} from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useContractTypeSelect } from '@/hooks/useContractTypeSelect.ts'
import { PAGE_SIZE } from '@/constants/table.ts'

export type ContractFilterFormRef = {
  clearForm: () => void
  getValues?: () => ContractFilterFormValues
  getRawValues?: () => ContractFilterFormValues
}

type ContractFilterFormProps = {
  initialValues?: Record<string, any>
}

type TDateRange = {
  from?: Date
  to?: Date
}

export type ContractFilterFormValues = {
  effective_date_range?: TDateRange | null
  expiration_date_range?: TDateRange | null
  contract_type_id?: number
  branch_id?: number
  block_id?: number
  department_id?: number
  employee_id?: number
  employee_type?: string
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
  expiration_date_range: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .nullable()
    .optional(),
  contract_type_id: z.number().optional(),
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  department_id: z.number().optional(),
  employee_id: z.number().optional(),
  employee_type: z.string().optional(),
  status: z.array(z.string()).optional(),
})

const ContractFilterForm = forwardRef<ContractFilterFormRef, ContractFilterFormProps>(
  ({ initialValues }, ref) => {
    // Use contract type select hook for load on scrolling
    const { loadContractTypeOptions, loadInitialContractTypeOptions } = useContractTypeSelect({
      pageSize: PAGE_SIZE,
    })

    // Fetch status + employee type options from constants
    const { keysMapOptions } = useAppConstant({
      module: 'hrm',
      keys: [
        APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS,
        APP_CONSTANT_KEY.HRM.CONTRACT_EMPLOYEE_TYPE_CHOICES,
      ],
    })

    const statusOptions = useMemo(() => {
      return keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS)
        ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS) || []
        : []
    }, [keysMapOptions])

    const employeeTypeOptions = useMemo(() => {
      return keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_EMPLOYEE_TYPE_CHOICES)
        ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_EMPLOYEE_TYPE_CHOICES) || []
        : []
    }, [keysMapOptions])

    const { control, reset, getValues, handleSubmit, watch, setValue, register } =
      useForm<ContractFilterFormValues>({
        resolver: zodResolver(Schema) as any,
        defaultValues: {
          effective_date_range: initialValues?.effective_date_range || null,
          expiration_date_range: initialValues?.expiration_date_range || null,
          contract_type_id: initialValues?.contract_type_id,
          branch_id: initialValues?.branch_id,
          block_id: initialValues?.block_id,
          department_id: initialValues?.department_id,
          employee_id: initialValues?.employee_id,
          employee_type: initialValues?.employee_type,
          status: initialValues?.status || [],
        },
      })

    const [formKey, setFormKey] = useState(0)
    const [shouldResetToInitial, setShouldResetToInitial] = useState(true)

    // Khi initialValues thay đổi → reset form
    useEffect(() => {
      if (shouldResetToInitial && initialValues && Object.keys(initialValues).length > 0) {
        // Ensure status is always an array
        const statusArray = Array.isArray(initialValues?.status)
          ? initialValues.status
          : initialValues?.status
            ? [initialValues.status]
            : []

        reset({
          effective_date_range: initialValues?.effective_date_range || null,
          expiration_date_range: initialValues?.expiration_date_range || null,
          contract_type_id: initialValues?.contract_type_id,
          branch_id: initialValues?.branch_id,
          block_id: initialValues?.block_id,
          department_id: initialValues?.department_id,
          employee_id: initialValues?.employee_id,
          employee_type: initialValues?.employee_type,
          status: statusArray,
        })
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
            expiration_date_range: null,
            contract_type_id: undefined,
            branch_id: undefined,
            block_id: undefined,
            department_id: undefined,
            employee_id: undefined,
            employee_type: undefined,
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
        // is handled in useContractFilter hook's onClickApply
        return values
      },
    }))

    // Khi người dùng chọn branch/block/department
    const handleCascadeChange = useCallback(
      (data: CascadeSelectFormData) => {
        const current = getValues()

        // Handle branch_id - set value if changed, or clear if undefined/null
        if (data.branch_id !== undefined && data.branch_id !== current.branch_id) {
          setValue('branch_id', data.branch_id > 0 ? data.branch_id : undefined, {
            shouldDirty: false,
          })
        } else if (
          data.branch_id === undefined ||
          data.branch_id === null ||
          data.branch_id === 0
        ) {
          // Clear branch_id if it was cleared
          setValue('branch_id', undefined, { shouldDirty: false })
        }

        // Handle block_id - set value if changed, or clear if undefined/null
        if (data.block_id !== undefined && data.block_id !== current.block_id) {
          setValue('block_id', data.block_id > 0 ? data.block_id : undefined, {
            shouldDirty: false,
          })
        } else if (data.block_id === undefined || data.block_id === null || data.block_id === 0) {
          // Clear block_id if it was cleared
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
          // Clear department_id if it was cleared
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
          // Clear employee_id if it was cleared
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

    const onSubmit = async (_data: ContractFilterFormValues) => {
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
          <Grid columns={'2'} gap={'5'}>
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

            {/* Date range - Ngày hết hiệu lực */}
            <FormController
              name="expiration_date_range"
              control={control}
              register={register}
              Field={DateRangePicker}
              fieldProps={{
                label: 'Ngày hết hiệu lực',
                className: 'w-full',
                showQuickSelect: true,
              }}
            />

            {/* Loại hợp đồng */}
            <FormController
              register={register}
              name="contract_type_id"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Loại hợp đồng',
                placeholder: 'Chọn loại hợp đồng',
                loadOptions: loadContractTypeOptions,
                loadInitialOptions: loadInitialContractTypeOptions,
                pageSize: PAGE_SIZE,
                searchPlaceholder: 'Tìm kiếm loại hợp đồng...',
                enableSearch: true,
                isClearable: true,
              }}
            />
          </Grid>

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
            className={'gap-4'}
          />

          {/* Loại nhân viên */}
          <FormController
            register={register}
            name="employee_type"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Loại nhân viên',
              placeholder: 'Chọn loại nhân viên',
              options: employeeTypeOptions,
              isClearable: true,
            }}
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
  }
)

ContractFilterForm.displayName = 'ContractFilterForm'
export default ContractFilterForm
