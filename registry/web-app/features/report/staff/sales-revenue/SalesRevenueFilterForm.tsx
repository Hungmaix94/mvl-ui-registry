import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import FormController from '@/components/ui/form/FormController.tsx'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import type { DateRange } from 'react-day-picker'
import { Flex } from '@radix-ui/themes'

export type SalesRevenueFilterFormValues = {
  dateRange?: DateRange | null
  branch?: number
  block?: number
  department?: number
  branchName?: string
  blockName?: string
  departmentName?: string
}

export interface SalesRevenueFilterFormRef {
  clearForm: () => void
  getValues: () => SalesRevenueFilterFormValues
}

interface SalesRevenueFilterFormProps {
  initialValues: SalesRevenueFilterFormValues
  onValidationChange?: (isValid: boolean) => void
}

const SalesRevenueFilterForm = forwardRef<SalesRevenueFilterFormRef, SalesRevenueFilterFormProps>(
  ({ initialValues, onValidationChange }, ref) => {
    const form = useForm<SalesRevenueFilterFormValues>({
      defaultValues: {
        dateRange: initialValues?.dateRange,
        branch: initialValues?.branch,
        block: initialValues?.block,
        department: initialValues?.department,
        branchName: initialValues?.branchName,
        blockName: initialValues?.blockName,
        departmentName: initialValues?.departmentName,
      },
    })

    const { setValue, reset, watch } = form

    // Watch dateRange to notify parent about validation
    const dateRange = watch('dateRange')
    useEffect(() => {
      const isValid = !!(dateRange?.from && dateRange?.to)
      onValidationChange?.(isValid)
    }, [dateRange, onValidationChange])

    const buildCascadeInitialValues = useCallback(
      (values: SalesRevenueFilterFormValues | undefined) => ({
        branch: values?.branch ? values.branch.toString() : undefined,
        block: values?.block ? values.block.toString() : undefined,
        department: values?.department ? values.department.toString() : undefined,
      }),
      []
    )

    const [cascadeInitialValues, setCascadeInitialValues] = useState(() =>
      buildCascadeInitialValues(initialValues)
    )
    const [cascadeKey, setCascadeKey] = useState(0)

    useEffect(() => {
      reset({
        dateRange: initialValues?.dateRange,
        branch: initialValues?.branch,
        block: initialValues?.block,
        department: initialValues?.department,
        branchName: initialValues?.branchName,
        blockName: initialValues?.blockName,
        departmentName: initialValues?.departmentName,
      })
      setCascadeInitialValues(buildCascadeInitialValues(initialValues))
      setCascadeKey((prev) => prev + 1)
    }, [initialValues, reset, buildCascadeInitialValues])

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          reset({
            dateRange: undefined,
            branch: undefined,
            block: undefined,
            department: undefined,
            branchName: undefined,
            blockName: undefined,
            departmentName: undefined,
          })
          setCascadeInitialValues(buildCascadeInitialValues({}))
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
      },
      [setValue]
    )

    return (
      <Flex direction={'column'} gap={'4'}>
        <FormController
          control={form.control}
          name="dateRange"
          register={form.register}
          Field={DateRangePicker}
          fieldProps={{
            label: 'Chọn khoảng thời gian',
            required: true,
            showQuickSelect: true,
          }}
        />
        <CascadeSelectGroupOrganization
          key={cascadeKey}
          initialValues={cascadeInitialValues}
          onFormChange={handleCascadeChange}
          showEmployee={false}
          showDepartment={true}
          skipValidation={true}
        />
      </Flex>
    )
  }
)

SalesRevenueFilterForm.displayName = 'SalesRevenueFilterForm'

export default SalesRevenueFilterForm
