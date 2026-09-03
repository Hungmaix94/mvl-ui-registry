import { forwardRef, useCallback, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import FormController from '@/components/ui/form/FormController'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization'
import type { DateRange } from 'react-day-picker'
import { formatDateToApi } from '@/utils/date-utils'

type FormValues = {
  dateRange?: DateRange | null
  branch?: number
  block?: number
  department?: number
  branchName?: string
  blockName?: string
  departmentName?: string
}

export type StaffGrowthFiltersFormApiParams = {
  from_date?: string
  to_date?: string
  branch?: number
  block?: number
  department?: number
}

export type StaffGrowthFiltersFormRef = {
  clearForm: () => void
  getValues: () => StaffGrowthFiltersFormApiParams
}

type StaffGrowthFiltersFormProps = {
  initialValues?: {
    dateRange?: { from?: Date; to?: Date }
    branch?: number
    block?: number
    department?: number
  }
}

const StaffGrowthFiltersForm = forwardRef<StaffGrowthFiltersFormRef, StaffGrowthFiltersFormProps>(
  ({ initialValues }, ref) => {
    const form = useForm<FormValues>({
      defaultValues: {
        dateRange: initialValues?.dateRange,
        branch: initialValues?.branch,
        block: initialValues?.block,
        department: initialValues?.department,
      },
    })
    const [formKey, setFormKey] = useState(0)
    const { setValue, reset } = form

    useImperativeHandle(ref, () => ({
      clearForm: () => {
        reset(
          {
            dateRange: null,
            branch: undefined,
            block: undefined,
            department: undefined,
            branchName: undefined,
            blockName: undefined,
            departmentName: undefined,
          },
          {
            keepDefaultValues: false,
          }
        )
        setFormKey((prev) => prev + 1)
      },
      getValues: (): StaffGrowthFiltersFormApiParams => {
        const values = form.getValues()
        return {
          from_date: values.dateRange?.from ? formatDateToApi(values.dateRange.from) : undefined,
          to_date: values.dateRange?.to ? formatDateToApi(values.dateRange.to) : undefined,
          branch: values.branch,
          block: values.block,
          department: values.department,
        }
      },
    }))

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
      <div className="grid grid-cols-1 gap-4">
        <FormController
          control={form.control}
          name="dateRange"
          register={form.register}
          Field={DateRangePicker}
          fieldProps={{
            label: 'Khoảng thời gian',
            placeholder: 'Chọn khoảng thời gian',
            showQuickSelect: true,
          }}
        />
        <CascadeSelectGroupOrganization
          key={formKey}
          initialValues={
            formKey === 0
              ? {
                  branch: initialValues?.branch?.toString(),
                  block: initialValues?.block?.toString(),
                  department: initialValues?.department?.toString(),
                }
              : undefined
          }
          onFormChange={handleCascadeChange}
          showEmployee={false}
          skipValidation={true}
        />
      </div>
    )
  }
)

export default StaffGrowthFiltersForm
