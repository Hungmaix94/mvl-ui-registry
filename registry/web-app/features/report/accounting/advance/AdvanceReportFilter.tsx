import { forwardRef, useCallback, useImperativeHandle, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Flex } from '@radix-ui/themes'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import type { DateRange } from 'react-day-picker'

export type AdvanceReportFilterFormData = {
  branch?: number
  block?: number
  department?: number
  /** Kept alongside the ids so the report header band can label the filter without a refetch. */
  branchName?: string
  blockName?: string
  departmentName?: string
  date_range?: DateRange | null
}

export type AdvanceReportFilterRef = {
  getValues: () => AdvanceReportFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: AdvanceReportFilterFormData
}

/**
 * Filter dialog for the advance-settlement report.
 *
 * The free-text search deliberately lives on `PageTitle`, not here — CR 21.3 asked for it to be
 * always visible instead of buried one dialog deep.
 */
export const AdvanceReportFilter = forwardRef<AdvanceReportFilterRef, Props>(
  ({ initialValues }, ref) => {
    const form = useForm<AdvanceReportFilterFormData>({
      defaultValues: {
        branch: initialValues?.branch,
        block: initialValues?.block,
        department: initialValues?.department,
        branchName: initialValues?.branchName,
        blockName: initialValues?.blockName,
        departmentName: initialValues?.departmentName,
        date_range: initialValues?.date_range,
      },
    })
    const { control, reset, setValue } = form

    const buildCascadeInitialValues = useCallback(
      (values: AdvanceReportFilterFormData | undefined) => ({
        branch: values?.branch ? String(values.branch) : undefined,
        block: values?.block ? String(values.block) : undefined,
        department: values?.department ? String(values.department) : undefined,
      }),
      []
    )

    const [cascadeInitialValues, setCascadeInitialValues] = useState(() =>
      buildCascadeInitialValues(initialValues)
    )
    // Bumped on every reset so the cascade selects remount and re-read their defaults — without it
    // "Xoá bộ lọc → Áp dụng" silently re-sends the old org filter (see conventions.md § clearForm trap).
    const [cascadeKey, setCascadeKey] = useState(0)

    // No effect re-seeds the form from `initialValues`. The parent already remounts this
    // component on every dialog-open (via `key`), so `defaultValues` above is the seed — and
    // `initialValues` gets a fresh identity whenever an org-name lookup resolves, which for an
    // effect means wiping whatever the user had just picked while the dialog was open.

    useImperativeHandle(
      ref,
      () => ({
        getValues: () => form.getValues(),
        clearForm: () => {
          reset({
            branch: undefined,
            block: undefined,
            department: undefined,
            branchName: undefined,
            blockName: undefined,
            departmentName: undefined,
            date_range: null,
          })
          setCascadeInitialValues(buildCascadeInitialValues({}))
          setCascadeKey((prev) => prev + 1)
        },
      }),
      [form, reset, buildCascadeInitialValues]
    )

    const handleCascadeChange = useCallback(
      (data: {
        branch_id?: number
        block_id?: number
        department_id?: number
        branch_name?: string
        block_name?: string
        department_name?: string
      }) => {
        setValue('branch', data.branch_id ? data.branch_id : undefined)
        setValue('block', data.block_id ? data.block_id : undefined)
        setValue('department', data.department_id ? data.department_id : undefined)
        setValue('branchName', data.branch_name)
        setValue('blockName', data.block_name)
        setValue('departmentName', data.department_name)
      },
      [setValue]
    )

    return (
      <Flex direction="column" gap="4">
        <Controller
          name="date_range"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <DateRangePicker
              label="Khoảng ngày chi"
              value={field.value || undefined}
              showQuickSelect
              onChange={(range) => field.onChange(range || null)}
              error={error?.message}
            />
          )}
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

AdvanceReportFilter.displayName = 'AdvanceReportFilter'

export default AdvanceReportFilter
