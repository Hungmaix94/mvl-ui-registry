import { useState, forwardRef, useImperativeHandle, useEffect, useCallback } from 'react'
import { type DateRange } from 'react-day-picker'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import { useForm } from 'react-hook-form'
import FormController from '@/components/ui/form/FormController'
import { Flex } from '@radix-ui/themes'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization'
import { RadioGroup } from '@/components/ui/radio-group'
import { formatDateToApi } from '@/utils/date-utils'
import {
  REPORT_PAYMENT_STATUS_OPTIONS,
  ReportPaymentStatus,
} from '@/features/report/recruitment/_shares/constants/report-payment-status'

type FormValues = {
  dateRange?: DateRange | null
  branch?: number
  block?: number
  department?: number
  branchName?: string
  blockName?: string
  departmentName?: string
  paymentStatus?: string
}

export type RecruitmentSourceFilterFormApiParams = {
  from_date?: string
  to_date?: string
  branch?: number
  block?: number
  department?: number
  payment_status?: string
}

export type RecruitmentSourceFilterFormRef = {
  clearForm: () => void
  getValues: () => RecruitmentSourceFilterFormApiParams
}

type RecruitmentSourceFilterFormProps = {
  initialValues?: {
    dateRange?: { from?: Date; to?: Date }
    branch?: number
    block?: number
    department?: number
    paymentStatus?: string
  }
  onValidationChange?: (isValid: boolean) => void
  showBlock?: boolean
  showDepartment?: boolean
  /** When true, render the 3-option payment-status filter (Đã chi / Dự kiến / Tổng). */
  showPaymentStatus?: boolean
}

const RecruitmentSourceFilterForm = forwardRef<
  RecruitmentSourceFilterFormRef,
  RecruitmentSourceFilterFormProps
>(
  (
    {
      initialValues,
      onValidationChange,
      showBlock = true,
      showDepartment = true,
      showPaymentStatus = false,
    },
    ref
  ) => {
    const [formKey, setFormKey] = useState(0)

    const { control, register, reset, getValues, setValue, watch } = useForm<FormValues>({
      defaultValues: {
        dateRange: initialValues?.dateRange || null,
        branch: initialValues?.branch,
        block: initialValues?.block,
        department: initialValues?.department,
        paymentStatus: initialValues?.paymentStatus || ReportPaymentStatus.PAID,
      },
    })

    const dateRangeValue = watch('dateRange')

    // Notify parent when validation state changes
    useEffect(() => {
      const hasDateRange = !!dateRangeValue && !!(dateRangeValue.from || dateRangeValue.to)
      onValidationChange?.(hasDateRange)
    }, [dateRangeValue, onValidationChange])

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
            paymentStatus: ReportPaymentStatus.PAID,
          },
          {
            keepDefaultValues: false,
          }
        )
      },
      getValues: (): RecruitmentSourceFilterFormApiParams => {
        const values = getValues()
        return {
          from_date: values.dateRange?.from ? formatDateToApi(values.dateRange.from) : undefined,
          to_date: values.dateRange?.to ? formatDateToApi(values.dateRange.to) : undefined,
          branch: values.branch,
          block: showBlock ? values.block : undefined,
          department: showDepartment ? values.department : undefined,
          payment_status: showPaymentStatus ? values.paymentStatus || undefined : undefined,
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
        <Flex direction={'column'} gap={'2'}>
          <FormController
            key={`date-range-picker-${formKey}`}
            register={register}
            name="dateRange"
            control={control}
            Field={DateRangePicker}
            fieldProps={{
              label: 'Khoảng thời gian',
              className: 'w-full',
              showQuickSelect: true,
              required: true,
            }}
          />
        </Flex>
        <CascadeSelectGroupOrganization
          key={formKey}
          initialValues={
            formKey === 0
              ? {
                  branch: initialValues?.branch ? String(initialValues.branch) : undefined,
                  block:
                    showBlock && initialValues?.block ? String(initialValues.block) : undefined,
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
          className="w-full"
        />
        {showPaymentStatus && (
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
        )}
      </Flex>
    )
  }
)

RecruitmentSourceFilterForm.displayName = 'RecruitmentSourceFilterForm'

export default RecruitmentSourceFilterForm
