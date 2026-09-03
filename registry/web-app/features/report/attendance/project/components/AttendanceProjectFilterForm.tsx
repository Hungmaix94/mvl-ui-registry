import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { DateRange } from 'react-day-picker'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization'

export type AttendanceProjectFilterFormValues = {
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

export type AttendanceProjectFilterFormRef = {
  clearForm: (defaultRange?: DateRange) => void
  getValues: () => AttendanceProjectFilterFormValues
}

type AttendanceProjectFilterFormProps = {
  initialValues?: Partial<AttendanceProjectFilterFormValues>
  onValidationChange?: (isValid: boolean) => void
}

// BE limits the from_date/to_date range to 12 months
const MAX_RANGE_MONTHS = 12

function isWithinMaxRange(from: Date, to: Date): boolean {
  const limit = new Date(from)
  limit.setMonth(limit.getMonth() + MAX_RANGE_MONTHS)
  return to <= limit
}

const schema = z
  .object({
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
  .refine((values) => values.fromDate <= values.toDate, {
    message: 'Từ ngày phải nhỏ hơn hoặc bằng Đến ngày',
    path: ['toDate'],
  })
  .refine((values) => isWithinMaxRange(values.fromDate, values.toDate), {
    message: `Khoảng thời gian tối đa ${MAX_RANGE_MONTHS} tháng`,
    path: ['toDate'],
  })

const AttendanceProjectFilterForm = forwardRef<
  AttendanceProjectFilterFormRef,
  AttendanceProjectFilterFormProps
>(({ initialValues, onValidationChange }, ref) => {
  const [formKey, setFormKey] = useState(0)
  const [shouldResetToInitial, setShouldResetToInitial] = useState<boolean>(true)
  const [shouldClearCascade, setShouldClearCascade] = useState(false)

  const {
    handleSubmit,
    register,
    reset,
    getValues,
    setValue,
    control,
    formState: { isValid },
    watch,
  } = useForm<AttendanceProjectFilterFormValues>({
    resolver: zodResolver(schema) as any,
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
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

  const fromDateValue = watch('fromDate')
  const toDateValue = watch('toDate')

  useEffect(() => {
    const isValidState = Boolean(fromDateValue) && Boolean(toDateValue) && isValid
    onValidationChange?.(isValidState)
  }, [fromDateValue, toDateValue, isValid, onValidationChange])

  useEffect(() => {
    if (shouldResetToInitial && initialValues && Object.keys(initialValues).length > 0) {
      reset({
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
      clearForm: (defaultRange?: DateRange) => {
        setShouldResetToInitial(false)
        setShouldClearCascade(true)
        const newFormKey = formKey + 1
        setFormKey(newFormKey)
        reset(
          {
            fromDate: defaultRange?.from,
            toDate: defaultRange?.to,
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
        // Explicitly set the date range to ensure Controller updates
        setValue('fromDate', defaultRange?.from, { shouldDirty: false, shouldValidate: false })
        setValue('toDate', defaultRange?.to, { shouldDirty: false, shouldValidate: false })
        // Clear cascade fields explicitly
        setValue('branch', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('block', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('department', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('branchName', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('blockName', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('departmentName', undefined, { shouldDirty: false, shouldValidate: false })
        setValue('block_types', [], { shouldDirty: false, shouldValidate: false })
      },
      getValues: () => getValues(),
    }),
    [getValues, reset, setValue, formKey]
  )

  const onSubmit = (_data: AttendanceProjectFilterFormValues) => {
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
        key={`attendance-date-range-picker-${formKey}`}
        name="fromDate"
        control={control}
        register={register}
        Field={DateRangePicker}
        fieldProps={{
          label: 'Thời gian',
          required: true,
          placeholder: 'DD/MM/YYYY',
          allowManualInput: true,
          clearable: false,
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
})

AttendanceProjectFilterForm.displayName = 'AttendanceProjectFilterForm'

export default AttendanceProjectFilterForm
