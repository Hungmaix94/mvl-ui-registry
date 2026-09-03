import { forwardRef, useImperativeHandle, useState, useCallback } from 'react'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import FormController from '@/components/ui/form/FormController'
import { useForm } from 'react-hook-form'
import { Flex } from '@radix-ui/themes'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization'
import { formatDateToApi } from '@/utils/date-utils'
import type { DateRange } from 'react-day-picker'

type FormValues = {
  dateRange?: DateRange | null
  branch?: number
  block?: number
  department?: number
  branchName?: string
  blockName?: string
  departmentName?: string
}

export type RecruitmentHiredCandidateFilterFormApiParams = {
  from_date?: string
  to_date?: string
  branch?: number
  block?: number
  department?: number
}

export type RecruitmentHiredCandidateFilterFormRef = {
  clearForm: () => void
  getValues: () => RecruitmentHiredCandidateFilterFormApiParams
}

type RecruitmentHiredCandidateFilterFormProps = {
  initialValues?: {
    dateRange?: { from?: Date; to?: Date }
    branch?: number
    block?: number
    department?: number
  }
}

const RecruitmentHiredCandidateFilterForm = forwardRef<
  RecruitmentHiredCandidateFilterFormRef,
  RecruitmentHiredCandidateFilterFormProps
>(({ initialValues }, ref) => {
  const [formKey, setFormKey] = useState(0)

  const { control, register, reset, getValues, setValue } = useForm<FormValues>({
    defaultValues: {
      dateRange: initialValues?.dateRange || null,
      branch: initialValues?.branch,
      block: initialValues?.block,
      department: initialValues?.department,
    },
  })

  useImperativeHandle(ref, () => ({
    clearForm: () => {
      setFormKey((prev) => prev + 1)
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
        { keepDefaultValues: false }
      )
    },
    getValues: (): RecruitmentHiredCandidateFilterFormApiParams => {
      const values = getValues()
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
    (vals: any) => {
      const nextBranch = vals.branch_id ? vals.branch_id : undefined
      const nextBlock = vals.block_id ? vals.block_id : undefined
      const nextDept = vals.department_id ? vals.department_id : undefined
      const nextBranchName = vals.branch_name || undefined
      const nextBlockName = vals.block_name || undefined
      const nextDeptName = vals.department_name || undefined

      const current = getValues()
      const changed =
        current.branch !== nextBranch ||
        current.block !== nextBlock ||
        current.department !== nextDept ||
        current.branchName !== nextBranchName ||
        current.blockName !== nextBlockName ||
        current.departmentName !== nextDeptName

      if (!changed) return

      setValue('branch', nextBranch, { shouldDirty: false, shouldValidate: false })
      setValue('block', nextBlock, { shouldDirty: false, shouldValidate: false })
      setValue('department', nextDept, { shouldDirty: false, shouldValidate: false })
      setValue('branchName', nextBranchName, { shouldDirty: false, shouldValidate: false })
      setValue('blockName', nextBlockName, { shouldDirty: false, shouldValidate: false })
      setValue('departmentName', nextDeptName, { shouldDirty: false, shouldValidate: false })
    },
    [getValues, setValue]
  )

  return (
    <Flex direction={'column'} gap={'4'}>
      <FormController
        key={`date-range-picker-${formKey}`}
        register={register}
        name="dateRange"
        control={control}
        Field={DateRangePicker}
        fieldProps={{
          label: 'Khoảng thời gian',
          showQuickSelect: true,
        }}
      />
      <CascadeSelectGroupOrganization
        key={`org-${formKey}`}
        initialValues={
          formKey === 0
            ? {
                branch: initialValues?.branch ? String(initialValues.branch) : undefined,
                block: initialValues?.block ? String(initialValues.block) : undefined,
                department: initialValues?.department
                  ? String(initialValues.department)
                  : undefined,
              }
            : undefined
        }
        showEmployee={false}
        skipValidation
        onFormChange={handleCascadeChange}
        className="w-full"
      />
    </Flex>
  )
})

RecruitmentHiredCandidateFilterForm.displayName = 'RecruitmentHiredCandidateFilterForm'

export default RecruitmentHiredCandidateFilterForm
