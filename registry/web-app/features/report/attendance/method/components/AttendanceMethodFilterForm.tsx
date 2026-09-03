import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { type DateRange } from 'react-day-picker'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization'

export type AttendanceMethodFilterFormValues = {
  dateRange?: DateRange | null
  branch?: string
  block?: string
  department?: string
  branchName?: string
  blockName?: string
  departmentName?: string
}

export type AttendanceMethodFilterFormRef = {
  clearForm: () => void
  getValues: () => AttendanceMethodFilterFormValues
}

type AttendanceMethodFilterFormProps = {
  initialValues?: Partial<AttendanceMethodFilterFormValues>
  onValidationChange?: (isValid: boolean) => void
}

const buildDefaultDateRange = (): DateRange => {
  const today = new Date()
  const from = new Date(today)
  from.setDate(today.getDate() - 6)
  return { from, to: today }
}

const AttendanceMethodFilterForm = forwardRef<
  AttendanceMethodFilterFormRef,
  AttendanceMethodFilterFormProps
>(({ initialValues, onValidationChange }, ref) => {
  const [shouldResetToInitial, setShouldResetToInitial] = useState<boolean>(true)
  const [shouldClearCascade, setShouldClearCascade] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const defaultDateRange = useMemo(() => buildDefaultDateRange(), [])

  const { control, handleSubmit, register, reset, getValues, setValue, watch } =
    useForm<AttendanceMethodFilterFormValues>({
      mode: 'onChange',
      reValidateMode: 'onChange',
      defaultValues: {
        dateRange: initialValues?.dateRange ?? defaultDateRange,
        branch: initialValues?.branch,
        block: initialValues?.block,
        department: initialValues?.department,
        branchName: initialValues?.branchName,
        blockName: initialValues?.blockName,
        departmentName: initialValues?.departmentName,
      },
    })

  const dateRange = watch('dateRange')

  useEffect(() => {
    const isValidState = !!(dateRange?.from && dateRange?.to)
    onValidationChange?.(isValidState)
  }, [dateRange, onValidationChange])

  useEffect(() => {
    if (shouldResetToInitial && initialValues) {
      reset({
        dateRange: initialValues.dateRange ?? defaultDateRange,
        branch: initialValues.branch,
        block: initialValues.block,
        department: initialValues.department,
        branchName: initialValues.branchName,
        blockName: initialValues.blockName,
        departmentName: initialValues.departmentName,
      })
      setFormKey((prev) => prev + 1)
      setShouldClearCascade(false)
    }
  }, [initialValues, reset, shouldResetToInitial, defaultDateRange])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        setShouldResetToInitial(false)
        setShouldClearCascade(true)
        setFormKey((prev) => prev + 1)
        reset(
          {
            dateRange: defaultDateRange,
            branch: undefined,
            block: undefined,
            department: undefined,
            branchName: undefined,
            blockName: undefined,
            departmentName: undefined,
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
    [getValues, reset, defaultDateRange]
  )

  const handleCascadeChange = (vals: any) => {
    const branch = vals.branch_id ? String(vals.branch_id) : undefined
    const block = vals.block_id ? String(vals.block_id) : undefined
    const department = vals.department_id ? String(vals.department_id) : undefined
    const branchName = vals.branch_name || undefined
    const blockName = vals.block_name || undefined
    const departmentName = vals.department_name || undefined

    setValue('branch', branch, { shouldDirty: false, shouldValidate: false })
    setValue('block', block, { shouldDirty: false, shouldValidate: false })
    setValue('department', department, { shouldDirty: false, shouldValidate: false })
    setValue('branchName', branchName, { shouldDirty: false, shouldValidate: false })
    setValue('blockName', blockName, { shouldDirty: false, shouldValidate: false })
    setValue('departmentName', departmentName, { shouldDirty: false, shouldValidate: false })
  }

  const onSubmit = (_data: AttendanceMethodFilterFormValues) => {
    // submission handled by dialog confirm
  }

  return (
    <Form
      onSubmit={onSubmit}
      handleSubmit={handleSubmit as any}
      loading={false}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-5">
        <FormController
          name="dateRange"
          control={control}
          register={register}
          Field={DateRangePicker}
          fieldProps={{
            label: 'Khoảng thời gian',
            placeholder: 'Chọn khoảng thời gian',
            className: 'w-full',
            showQuickSelect: true,
            required: true,
          }}
        />

        <CascadeSelectGroupOrganization
          key={formKey}
          initialValues={
            shouldClearCascade
              ? undefined
              : {
                  branch: initialValues?.branch,
                  block: initialValues?.block,
                  department: initialValues?.department,
                }
          }
          onFormChange={handleCascadeChange}
          showEmployee={false}
          showPosition={false}
          skipValidation
        />
      </div>
    </Form>
  )
})

AttendanceMethodFilterForm.displayName = 'AttendanceMethodFilterForm'

export default AttendanceMethodFilterForm
