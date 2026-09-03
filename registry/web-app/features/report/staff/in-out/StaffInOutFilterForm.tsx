import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { DateRange } from 'react-day-picker'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import { Select } from '@/components/ui'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { RecruitmentReportPeriodType } from '@/constants/api-schema-aliases'
export type StaffInOutFilterFormValues = {
  periodType?: RecruitmentReportPeriodType
  fromDate?: Date
  toDate?: Date
  branch?: string
  block?: string
  department?: string
  branchName?: string
  blockName?: string
  departmentName?: string
  block_types?: string[]
}

export type StaffInOutFilterFormRef = {
  clearForm: (defaults?: { periodType?: RecruitmentReportPeriodType; range?: DateRange }) => void
  getValues: () => StaffInOutFilterFormValues
}

type StaffInOutFilterFormProps = {
  initialValues?: Partial<StaffInOutFilterFormValues>
  onValidationChange?: (isValid: boolean) => void
}

const schema = z.object({
  periodType: z.nativeEnum(RecruitmentReportPeriodType, {
    required_error: 'Vui lòng chọn loại kỳ',
  }),
  fromDate: z.date({ required_error: 'Vui lòng chọn thời gian' }),
  toDate: z.date({ required_error: 'Vui lòng chọn thời gian' }),
  branch: z.string().optional(),
  block: z.string().optional(),
  department: z.string().optional(),
  branchName: z.string().optional(),
  blockName: z.string().optional(),
  departmentName: z.string().optional(),
  block_types: z.array(z.string()).optional(),
})

const StaffInOutFilterForm = forwardRef<StaffInOutFilterFormRef, StaffInOutFilterFormProps>(
  ({ initialValues, onValidationChange }, ref) => {
    const [formKey, setFormKey] = useState(0)
    const [shouldResetToInitial, setShouldResetToInitial] = useState<boolean>(true)
    const [shouldClearCascade, setShouldClearCascade] = useState(false)

    const { keysMapOptions } = useAppConstant({
      module: 'hrm',
      keys: [APP_CONSTANT_KEY.HRM.STAFF_GROWTH_REPORT_TIMEFRAME_TYPE],
    })

    const periodTypeOptions = useMemo(
      () => keysMapOptions.get(APP_CONSTANT_KEY.HRM.STAFF_GROWTH_REPORT_TIMEFRAME_TYPE) || [],
      [keysMapOptions]
    )

    const {
      handleSubmit,
      register,
      reset,
      getValues,
      setValue,
      control,
      formState: { isValid },
      watch,
    } = useForm<StaffInOutFilterFormValues>({
      resolver: zodResolver(schema) as any,
      mode: 'onChange',
      reValidateMode: 'onChange',
      defaultValues: {
        periodType: initialValues?.periodType,
        fromDate: initialValues?.fromDate,
        toDate: initialValues?.toDate,
        branch: initialValues?.branch,
        block: initialValues?.block,
        department: initialValues?.department,
        branchName: initialValues?.branchName,
        blockName: initialValues?.blockName,
        departmentName: initialValues?.departmentName,
        block_types: initialValues?.block_types || [],
      },
    })

    const periodTypeValue = watch('periodType')
    const fromDateValue = watch('fromDate')
    const toDateValue = watch('toDate')

    useEffect(() => {
      const isValidState =
        Boolean(periodTypeValue) && Boolean(fromDateValue) && Boolean(toDateValue) && isValid
      onValidationChange?.(isValidState)
    }, [periodTypeValue, fromDateValue, toDateValue, isValid, onValidationChange])

    useEffect(() => {
      if (shouldResetToInitial && initialValues && Object.keys(initialValues).length > 0) {
        reset({
          periodType: initialValues.periodType,
          fromDate: initialValues.fromDate,
          toDate: initialValues.toDate,
          branch: initialValues.branch,
          block: initialValues.block,
          department: initialValues.department,
          branchName: initialValues.branchName,
          blockName: initialValues.blockName,
          departmentName: initialValues.departmentName,
          block_types: initialValues.block_types || [],
        })
        setFormKey((prev) => prev + 1)
        // Reset clear flag when initialValues change (dialog reopened with new values)
        setShouldClearCascade(false)
      }
    }, [initialValues, reset, shouldResetToInitial])

    useImperativeHandle(
      ref,
      () => ({
        clearForm: (defaults) => {
          setShouldResetToInitial(false)
          setShouldClearCascade(true)
          setFormKey((prev) => prev + 1)
          reset(
            {
              periodType: defaults?.periodType,
              fromDate: defaults?.range?.from,
              toDate: defaults?.range?.to,
              branch: undefined,
              block: undefined,
              department: undefined,
              branchName: undefined,
              blockName: undefined,
              departmentName: undefined,
              block_types: [],
            },
            {
              keepDefaultValues: false,
              keepErrors: false,
              keepDirty: false,
              keepIsSubmitted: false,
              keepTouched: false,
              keepIsValid: false,
              keepSubmitCount: false,
            }
          )
        },
        getValues: () => getValues(),
      }),
      [getValues, reset]
    )

    const onSubmit = (_data: StaffInOutFilterFormValues) => {
      // Submit handled via dialog actions
    }

    return (
      <Form
        onSubmit={onSubmit}
        handleSubmit={handleSubmit as any}
        loading={false}
        className="flex flex-col gap-5"
      >
        <FormController
          key={`staff-in-out-period-type-${formKey}`}
          name="periodType"
          control={control}
          register={register}
          Field={Select}
          fieldProps={{
            label: 'Loại kỳ',
            required: true,
            placeholder: 'Chọn loại kỳ',
            options: periodTypeOptions,
            clearable: false,
            onChange: (value: RecruitmentReportPeriodType) => {
              setValue('periodType', value, { shouldDirty: true, shouldValidate: true })
            },
          }}
        />

        <FormController
          key={`staff-in-out-date-range-picker-${formKey}`}
          name="fromDate"
          control={control}
          register={register}
          Field={DateRangePicker}
          fieldProps={{
            label: 'Thời gian',
            required: true,
            showQuickSelect: true,
            className: 'w-full',
            value: { from: fromDateValue, to: toDateValue } as DateRange,
            onChange: (range: DateRange | undefined) => {
              setValue('fromDate', range?.from, { shouldDirty: true, shouldValidate: true })
              setValue('toDate', range?.to, { shouldDirty: true, shouldValidate: true })
              return range?.from
            },
          }}
        />

        <CascadeSelectGroupOrganization
          key={formKey}
          initialValues={
            shouldClearCascade
              ? undefined
              : {
                  branch: !isNaN(Number(initialValues?.branch))
                    ? String(initialValues?.branch)
                    : undefined,
                  block: !isNaN(Number(initialValues?.block))
                    ? String(initialValues?.block)
                    : undefined,
                  department: !isNaN(Number(initialValues?.department))
                    ? String(initialValues?.department)
                    : undefined,
                  block_types: initialValues?.block_types,
                }
          }
          showEmployee={false}
          showBlockTypeFilter
          blockTypeLabel="Chức năng khối"
          blockTypeVariant="select"
          skipValidation
          onFormChange={(vals: any) => {
            const nextBranch = vals.branch_id ? String(vals.branch_id) : undefined
            const nextBlock = vals.block_id ? String(vals.block_id) : undefined
            const nextDepartment = vals.department_id ? String(vals.department_id) : undefined
            const nextBranchName = vals.branch_name || undefined
            const nextBlockName = vals.block_name || undefined
            const nextDepartmentName = vals.department_name || undefined
            const nextBlockTypes = Array.isArray(vals.block_types)
              ? vals.block_types.map((item: any) => String(item))
              : []

            const current = getValues()
            const changed =
              current.branch !== nextBranch ||
              current.block !== nextBlock ||
              current.department !== nextDepartment ||
              current.branchName !== nextBranchName ||
              current.blockName !== nextBlockName ||
              current.departmentName !== nextDepartmentName ||
              JSON.stringify(current.block_types ?? []) !== JSON.stringify(nextBlockTypes)

            if (!changed) {
              return
            }

            setValue('branch', nextBranch, { shouldDirty: false, shouldValidate: false })
            setValue('block', nextBlock, { shouldDirty: false, shouldValidate: false })
            setValue('department', nextDepartment, { shouldDirty: false, shouldValidate: false })
            setValue('branchName', nextBranchName, { shouldDirty: false, shouldValidate: false })
            setValue('blockName', nextBlockName, { shouldDirty: false, shouldValidate: false })
            setValue('departmentName', nextDepartmentName, {
              shouldDirty: false,
              shouldValidate: false,
            })
            setValue('block_types', nextBlockTypes, { shouldDirty: false, shouldValidate: false })
          }}
          className="w-full gap-5"
        />
      </Form>
    )
  }
)

StaffInOutFilterForm.displayName = 'StaffInOutFilterForm'

export default StaffInOutFilterForm
