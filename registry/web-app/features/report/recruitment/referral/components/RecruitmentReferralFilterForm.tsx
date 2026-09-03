import { forwardRef, useEffect, useImperativeHandle, useState, useCallback } from 'react'
import MonthPicker from '@/components/ui/month-picker/MonthPicker'
import FormController from '@/components/ui/form/FormController'
import { useForm } from 'react-hook-form'
import { Flex } from '@radix-ui/themes'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization'
import { RadioGroup } from '@/components/ui/radio-group'
import {
  REPORT_PAYMENT_STATUS_OPTIONS,
  ReportPaymentStatus,
} from '@/features/report/recruitment/_shares/constants/report-payment-status'

type FormValues = {
  month?: Date | null
  branch?: number
  block?: number
  department?: number
  branchName?: string
  blockName?: string
  departmentName?: string
  paymentStatus?: string
}

export type RecruitmentReferralFilterFormApiParams = {
  month?: Date
  branch?: number
  block?: number
  department?: number
  paymentStatus?: string
}

export type RecruitmentReferralFilterFormRef = {
  clearForm: () => void
  getValues: () => RecruitmentReferralFilterFormApiParams
}

type RecruitmentReferralFilterFormProps = {
  initialValues?: {
    month?: Date
    branch?: number
    block?: number
    department?: number
    paymentStatus?: string
  }
  onValidationChange?: (isValid: boolean) => void
  showBlock?: boolean
  showDepartment?: boolean
}

const RecruitmentReferralFilterForm = forwardRef<
  RecruitmentReferralFilterFormRef,
  RecruitmentReferralFilterFormProps
>(({ initialValues, onValidationChange, showBlock = true, showDepartment = true }, ref) => {
  const [formKey, setFormKey] = useState(0)

  const { control, register, reset, getValues, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      month: initialValues?.month || undefined,
      branch: initialValues?.branch,
      block: initialValues?.block,
      department: initialValues?.department,
      paymentStatus: initialValues?.paymentStatus || ReportPaymentStatus.PAID,
    },
  })

  const monthValue = watch('month')

  // Notify parent when validation state changes
  useEffect(() => {
    const hasMonth = !!monthValue
    onValidationChange?.(hasMonth)
  }, [monthValue, onValidationChange])

  useImperativeHandle(ref, () => ({
    clearForm: () => {
      setFormKey((prev) => prev + 1)
      reset(
        {
          month: undefined,
          branch: undefined,
          block: undefined,
          department: undefined,
          branchName: undefined,
          blockName: undefined,
          departmentName: undefined,
          paymentStatus: ReportPaymentStatus.PAID,
        },
        {
          keepDefaultValues: false,
        }
      )
      setValue('month', undefined, { shouldDirty: false, shouldValidate: false })
      setValue('paymentStatus', ReportPaymentStatus.PAID, {
        shouldDirty: false,
        shouldValidate: false,
      })
    },
    getValues: (): RecruitmentReferralFilterFormApiParams => {
      const values = getValues()
      return {
        month: values.month || undefined,
        branch: values.branch,
        block: showBlock ? values.block : undefined,
        department: showDepartment ? values.department : undefined,
        paymentStatus: values.paymentStatus || undefined,
      }
    },
  }))

  const handleCascadeChange = useCallback(
    (vals: any) => {
      const nextBranch = vals.branch_id ? vals.branch_id : undefined
      const nextBlock = showBlock && vals.block_id ? vals.block_id : undefined
      const nextDept = showDepartment && vals.department_id ? vals.department_id : undefined
      const nextBranchName = vals.branch_name || undefined
      const nextBlockName = showBlock ? vals.block_name || undefined : undefined
      const nextDeptName = showDepartment ? vals.department_name || undefined : undefined

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
    [getValues, setValue, showBlock, showDepartment]
  )

  return (
    <Flex direction={'column'} gap={'5'}>
      <FormController
        key={`month-picker-${formKey}`}
        register={register}
        name="month"
        control={control}
        Field={MonthPicker}
        fieldProps={{
          label: 'Chọn tháng',
          placeholder: 'Chọn tháng',
          required: true,
        }}
      />
      <CascadeSelectGroupOrganization
        key={formKey}
        initialValues={
          formKey === 0
            ? {
                branch: initialValues?.branch ? String(initialValues.branch) : undefined,
                block: showBlock && initialValues?.block ? String(initialValues.block) : undefined,
                department: initialValues?.department
                  ? showDepartment
                    ? String(initialValues.department)
                    : undefined
                  : undefined,
              }
            : undefined
        }
        showBlock={showBlock}
        showDepartment={showDepartment}
        showEmployee={false}
        skipValidation
        onFormChange={handleCascadeChange}
        layout={'vertical'}
        className="w-full"
      />
      <RadioGroup
        key={`payment-status-${formKey}`}
        id="payment-status"
        label="Trạng thái thanh toán"
        disabled={false}
        options={REPORT_PAYMENT_STATUS_OPTIONS.map((opt) => ({
          value: String(opt.value),
          label: opt.label,
        }))}
        value={watch('paymentStatus') || ReportPaymentStatus.PAID}
        onChange={(value) => setValue('paymentStatus', String(value), { shouldDirty: true })}
      />
    </Flex>
  )
})

RecruitmentReferralFilterForm.displayName = 'RecruitmentReferralFilterForm'

export default RecruitmentReferralFilterForm
