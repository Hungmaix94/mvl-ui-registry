import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization'

export type UncheckinFilterFormValues = {
  attendanceDate: string
  branch?: string
  block?: string
  department?: string
  position?: string
}

export type UncheckinFilterFormRef = {
  clearForm: () => void
  getValues: () => UncheckinFilterFormValues
}

type UncheckinFilterFormProps = {
  initialValues?: Partial<UncheckinFilterFormValues>
  onValidationChange?: (isValid: boolean) => void
}

const schema = z.object({
  attendanceDate: z.string().min(1, 'Vui lòng chọn ngày'),
  branch: z.string().optional(),
  block: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
})

const UncheckinFilterForm = forwardRef<UncheckinFilterFormRef, UncheckinFilterFormProps>(
  ({ initialValues, onValidationChange }, ref) => {
    const [shouldResetToInitial, setShouldResetToInitial] = useState<boolean>(true)
    const [shouldClearCascade, setShouldClearCascade] = useState(false)
    const [formKey, setFormKey] = useState(0)

    const {
      control,
      handleSubmit,
      register,
      reset,
      getValues,
      setValue,
      formState: { isValid },
      watch,
    } = useForm<UncheckinFilterFormValues>({
      resolver: zodResolver(schema) as any,
      mode: 'onChange',
      reValidateMode: 'onChange',
      defaultValues: {
        attendanceDate: initialValues?.attendanceDate || '',
        branch: initialValues?.branch,
        block: initialValues?.block,
        department: initialValues?.department,
        position: initialValues?.position,
      },
    })

    const attendanceDateValue = watch('attendanceDate')

    useEffect(() => {
      const isValidState = Boolean(attendanceDateValue) && isValid
      onValidationChange?.(isValidState)
    }, [attendanceDateValue, isValid, onValidationChange])

    useEffect(() => {
      if (shouldResetToInitial && initialValues) {
        reset({
          attendanceDate: initialValues.attendanceDate || '',
          branch: initialValues.branch,
          block: initialValues.block,
          department: initialValues.department,
          position: initialValues.position,
        })
        setFormKey((prev) => prev + 1)
        setShouldClearCascade(false)
      }
    }, [initialValues, reset, shouldResetToInitial])

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          setShouldResetToInitial(false)
          setShouldClearCascade(true)
          setFormKey((prev) => prev + 1)
          reset(
            {
              attendanceDate: '',
              branch: undefined,
              block: undefined,
              department: undefined,
              position: undefined,
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

    const handleCascadeChange = (vals: any) => {
      const branch = vals.branch_id ? String(vals.branch_id) : undefined
      const block = vals.block_id ? String(vals.block_id) : undefined
      const department = vals.department_id ? String(vals.department_id) : undefined
      const position = vals.position_id ? String(vals.position_id) : undefined
      setValue('branch', branch, { shouldDirty: false, shouldValidate: false })
      setValue('block', block, { shouldDirty: false, shouldValidate: false })
      setValue('department', department, { shouldDirty: false, shouldValidate: false })
      setValue('position', position, { shouldDirty: false, shouldValidate: false })
    }

    const onSubmit = (_data: UncheckinFilterFormValues) => {}

    return (
      <Form
        onSubmit={onSubmit}
        handleSubmit={handleSubmit as any}
        loading={false}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-5">
          <FormController
            name="attendanceDate"
            control={control}
            register={register}
            Field={DatePicker}
            fieldProps={{
              label: 'Ngày',
              required: true,
              placeholder: 'DD/MM/YYYY',
              clearable: false,
              className: 'w-full',
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
                    position: initialValues?.position,
                  }
            }
            onFormChange={handleCascadeChange}
            showEmployee={false}
            showPosition
            skipValidation
            className={'gap-5'}
          />
        </div>
      </Form>
    )
  }
)

UncheckinFilterForm.displayName = 'UncheckinFilterForm'

export default UncheckinFilterForm
