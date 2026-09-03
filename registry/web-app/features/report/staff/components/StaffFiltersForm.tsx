import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import FormController from '@/components/ui/form/FormController.tsx'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import type { DateRange } from 'react-day-picker'
import { Flex } from '@radix-ui/themes'

export type StaffTurnoverFiltersFormValues = {
  dateRange?: DateRange | null
  branch?: number
  block?: number
  department?: number
  branchName?: string
  blockName?: string
  departmentName?: string
  block_types?: string[]
}

export interface StaffTurnoverFiltersFormRef {
  clearForm: () => void
  getValues: () => StaffTurnoverFiltersFormValues
}

interface StaffTurnoverFiltersFormProps {
  initialValues: StaffTurnoverFiltersFormValues
  onApply?: (values: StaffTurnoverFiltersFormValues) => void
}

const StaffFiltersForm = forwardRef<StaffTurnoverFiltersFormRef, StaffTurnoverFiltersFormProps>(
  ({ initialValues }, ref) => {
    const form = useForm<StaffTurnoverFiltersFormValues>({
      defaultValues: {
        ...initialValues,
        block_types: initialValues?.block_types ?? [],
      },
    })
    const { setValue, reset } = form

    const buildCascadeInitialValues = useCallback(
      (values: StaffTurnoverFiltersFormValues | undefined) => ({
        branch: values?.branch ? values.branch.toString() : undefined,
        block: values?.block ? values.block.toString() : undefined,
        department: values?.department ? values.department.toString() : undefined,
        block_types: values?.block_types ?? [],
      }),
      []
    )

    const [cascadeInitialValues, setCascadeInitialValues] = useState(() =>
      buildCascadeInitialValues(initialValues)
    )
    const [cascadeKey, setCascadeKey] = useState(0)

    useEffect(() => {
      reset(initialValues)
      setCascadeInitialValues(buildCascadeInitialValues(initialValues))
      setCascadeKey((prev) => prev + 1)
    }, [initialValues, reset, buildCascadeInitialValues])

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          reset({
            dateRange: null,
            branch: undefined,
            block: undefined,
            department: undefined,
            branchName: undefined,
            blockName: undefined,
            departmentName: undefined,
            block_types: [],
          })
          setCascadeInitialValues(
            buildCascadeInitialValues({
              block_types: [],
            })
          )
          setCascadeKey((prev) => prev + 1)
        },
        getValues: () => form.getValues(),
      }),
      [form, reset, buildCascadeInitialValues]
    )

    const handleCascadeChange = useCallback(
      (data: any) => {
        setValue('branch', data.branch_id && data.branch_id !== 0 ? data.branch_id : undefined)
        setValue('block', data.block_id && data.block_id !== 0 ? data.block_id : undefined)
        setValue(
          'department',
          data.department_id && data.department_id !== 0 ? data.department_id : undefined
        )
        setValue('branchName', data.branch_name)
        setValue('blockName', data.block_name)
        setValue('departmentName', data.department_name)
        setValue('block_types', Array.isArray(data.block_types) ? data.block_types : [])
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
              disableFutureDates: true,
            }}
          />
        </Flex>

        <CascadeSelectGroupOrganization
          key={cascadeKey}
          initialValues={cascadeInitialValues}
          onFormChange={handleCascadeChange}
          showEmployee={false}
          showPosition={false}
          showBlockTypeFilter
          blockTypeVariant={'select'}
          skipValidation
          className="w-full gap-5"
        />
      </div>
    )
  }
)

export default StaffFiltersForm
