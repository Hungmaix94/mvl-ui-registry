import { forwardRef, useImperativeHandle, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormController } from '@/components/ui/form'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import { Select, TextArea } from '@/components/ui'
import type { Employee } from '@/features/employee/services/employee-service'
import type { EmployeeWorkHistory } from '@/features/employee/services/employee-work-history-service'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { EMPLOYEE_ACTION_DESCRIPTION_MAX_LENGTH } from '@/features/employee/management/_shares/constants/employee-actions.ts'

type ResignationDialogProps = {
  employee: Employee
  initialData?: EmployeeWorkHistory
  onSubmit?: (data: ResignationFormData) => Promise<void>
}

const resignationSchema = z.object({
  resignation_date: z.string().min(1, 'Ngày nghỉ việc là bắt buộc'),
  resignation_reason: z
    .string({ required_error: 'Vui lòng chọn lý do nghỉ việc' })
    .nullable()
    .refine((val) => val !== null && val !== undefined && val.length > 0, {
      message: 'Vui lòng chọn lý do nghỉ việc',
    }),
  description: z
    .string()
    .max(
      EMPLOYEE_ACTION_DESCRIPTION_MAX_LENGTH,
      `Mô tả không được quá ${EMPLOYEE_ACTION_DESCRIPTION_MAX_LENGTH} ký tự`
    )
    .optional(),
})

export type ResignationFormData = z.infer<typeof resignationSchema>

export type ResignationDialogRef = {
  submit: () => Promise<void>
}

const ResignationDialog = forwardRef<ResignationDialogRef, ResignationDialogProps>(
  function ResignationDialog({ employee: _employee, initialData, onSubmit }, ref) {
    const { keysMapOptions } = useAppConstant({
      module: 'hrm',
      keys: [APP_CONSTANT_KEY.EMPLOYEE.RESIGNATION_REASON],
    })

    const resignationReasonOptions = useMemo(() => {
      return keysMapOptions.has(APP_CONSTANT_KEY.EMPLOYEE.RESIGNATION_REASON)
        ? keysMapOptions.get(APP_CONSTANT_KEY.EMPLOYEE.RESIGNATION_REASON) || []
        : []
    }, [keysMapOptions])

    const { control, register, handleSubmit, trigger } = useForm<ResignationFormData>({
      resolver: zodResolver(resignationSchema),
      defaultValues: {
        resignation_date: initialData?.date ? format(new Date(initialData.date), DATE_FORMAT) : '',
        resignation_reason: initialData?.resignation_reason || null,
        description: initialData?.detail || initialData?.note || '',
      },
      mode: 'onTouched',
    })

    const handleFormSubmit = async (data: ResignationFormData) => {
      if (onSubmit) {
        await onSubmit(data)
      }
    }

    useImperativeHandle(ref, () => ({
      submit: async () => {
        // Trigger validation for all fields
        const isValid = await trigger()

        if (!isValid) {
          // Validation failed, throw silent error to prevent dialog from closing
          // This error will be caught by GlobalDialog's handleConfirm to prevent closing
          const validationError = new Error('Validation failed')
          ;(validationError as any).isValidationError = true
          throw validationError
        }

        // If validation passes, submit the form
        await handleSubmit(handleFormSubmit)()
      },
    }))

    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-5">
          {/* Resignation Date */}
          <FormController
            register={register}
            name="resignation_date"
            control={control}
            Field={DatePicker}
            fieldProps={{
              label: 'Ngày nghỉ việc',
              required: true,
              placeholder: 'DD/MM/YYYY',
              allowManualInput: true,
            }}
          />

          {/* Resignation Reason */}
          <FormController
            register={register}
            name="resignation_reason"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Lý do nghỉ việc',
              required: true,
              placeholder: 'Chọn lý do nghỉ việc',
              options: resignationReasonOptions,
              searchable: true,
            }}
          />

          {/* Description */}
          <FormController
            register={register}
            name="description"
            control={control}
            Field={TextArea}
            fieldProps={{
              label: 'Mô tả',
              placeholder: 'Nhập mô tả',
              maxCharacters: EMPLOYEE_ACTION_DESCRIPTION_MAX_LENGTH,
              showCharacterCount: true,
              rows: 4,
            }}
          />
        </div>
      </div>
    )
  }
)

export default ResignationDialog
