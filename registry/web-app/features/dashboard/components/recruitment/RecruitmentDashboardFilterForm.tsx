import React, { useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { Form } from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import FormController from '../../../../components/ui/form/FormController.tsx'
import { Select } from '@/components/ui'
import { useBranchSelect } from '@/hooks/useBranchSelect.ts'

export type RecruitmentDashboardFilterFormValues = {
  dateRange?: {
    from: Date
    to: Date
  }
  branch?: number | number[]
}

export type RecruitmentDashboardFilterFormRef = {
  getValues: () => RecruitmentDashboardFilterFormValues
  clearForm: () => void
}

type RecruitmentDashboardFilterFormProps = {
  initialValues: RecruitmentDashboardFilterFormValues
  onApply: (data: RecruitmentDashboardFilterFormValues) => void
  onClear: () => void
  /** When true, branch filter is hidden (e.g. cost-by-branch chart). */
  hideBranch?: boolean
  /** When true, branch field supports multiple selections. */
  allowMultipleBranch?: boolean
}

/** RHF + Select use string ids from `useBranchSelect` (same as API string ids). */
type RecruitmentDashboardRhfValues = {
  dateRange?: RecruitmentDashboardFilterFormValues['dateRange']
  branch?: string | string[] | number | undefined
}

function branchToSelectValue(
  branch: number | number[] | undefined,
  multiple: boolean
): RecruitmentDashboardRhfValues['branch'] {
  if (branch === undefined || branch === null) {
    return undefined
  }
  if (multiple) {
    const arr = Array.isArray(branch) ? branch : [branch]
    return arr.map((id) => String(id))
  }
  if (Array.isArray(branch)) {
    return branch[0] != null ? String(branch[0]) : undefined
  }
  return String(branch)
}

function branchFromSelectValue(
  branch: RecruitmentDashboardRhfValues['branch'],
  multiple: boolean
): RecruitmentDashboardFilterFormValues['branch'] {
  if (branch === undefined || branch === null) {
    return undefined
  }
  if (multiple) {
    const arr = Array.isArray(branch) ? branch : [branch]
    const nums = arr.map((x) => Number(x)).filter((n) => Number.isFinite(n) && !Number.isNaN(n))
    return nums.length ? nums : undefined
  }
  const n = Number(branch)
  return Number.isFinite(n) && !Number.isNaN(n) ? n : undefined
}

const RecruitmentDashboardFilterForm = React.forwardRef<
  RecruitmentDashboardFilterFormRef,
  RecruitmentDashboardFilterFormProps
>(({ initialValues, onApply, hideBranch = false, allowMultipleBranch = false }, ref) => {
  const [isLoading, setIsLoading] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const { loadBranchOptions, loadInitialBranchOptions } = useBranchSelect()

  const mapInitialToRhf = useCallback(
    (values: RecruitmentDashboardFilterFormValues): RecruitmentDashboardRhfValues => ({
      dateRange: values.dateRange,
      branch: branchToSelectValue(values.branch, allowMultipleBranch),
    }),
    [allowMultipleBranch]
  )

  const { control, handleSubmit, register, reset, getValues } =
    useForm<RecruitmentDashboardRhfValues>({
      defaultValues: mapInitialToRhf(initialValues),
    })

  useEffect(() => {
    reset(mapInitialToRhf(initialValues))
    setFormKey((k) => k + 1)
  }, [initialValues, reset, mapInitialToRhf])

  useImperativeHandle(
    ref,
    () => ({
      getValues: (): RecruitmentDashboardFilterFormValues => {
        const v = getValues()
        return {
          dateRange: v.dateRange,
          branch: branchFromSelectValue(v.branch, allowMultipleBranch),
        }
      },
      clearForm: () => {
        reset({})
        setFormKey((k) => k + 1)
      },
    }),
    [getValues, reset, allowMultipleBranch]
  )

  const onSubmit = async (data: RecruitmentDashboardRhfValues) => {
    setIsLoading(true)
    try {
      onApply({
        dateRange: data.dateRange,
        branch: branchFromSelectValue(data.branch, allowMultipleBranch),
      })
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <Form handleSubmit={handleSubmit} onSubmit={onSubmit} loading={isLoading}>
      <FormController
        key={`dateRange-${formKey}`}
        control={control}
        name="dateRange"
        register={register}
        Field={DateRangePicker}
        fieldProps={{
          label: 'Chọn khoảng thời gian',
          showQuickSelect: true,
        }}
      />
      {!hideBranch && (
        <FormController
          key={`branch-${formKey}`}
          control={control}
          name="branch"
          register={register}
          Field={Select}
          fieldProps={{
            label: 'Chi nhánh',
            placeholder: 'Chọn chi nhánh',
            loadOptions: loadBranchOptions,
            loadInitialOptions: loadInitialBranchOptions,
            searchPlaceholder: 'Tìm kiếm chi nhánh...',
            enableSearch: true,
            multiple: allowMultipleBranch,
            ...(allowMultipleBranch ? { triggerVariant: 'chips' as const, maxChips: 5 } : {}),
            className: 'w-full',
            wrapperClassName: 'mt-4',
          }}
        />
      )}
    </Form>
  )
})

export default RecruitmentDashboardFilterForm
