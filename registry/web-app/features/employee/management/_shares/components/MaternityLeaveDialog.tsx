import { forwardRef, useImperativeHandle } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormController } from '@/components/ui/form'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { TextArea } from '@/components/ui'
import type { Employee } from '@/features/employee/services/employee-service'
import type { EmployeeWorkHistory } from '@/features/employee/services/employee-work-history-service'
import { EMPLOYEE_ACTION_DESCRIPTION_MAX_LENGTH } from '@/features/employee/management/_shares/constants/employee-actions.ts'

type MaternityLeaveDialogProps = {
  employee: Employee
  initialData?: EmployeeWorkHistory
  onSubmit?: (data: MaternityLeaveFormData) => Promise<void>
}

const maternityLeaveSchema = z.object({
  date_range: z
    .object(
      {
        from: z.date(),
        to: z.date().optional(),
      },
      { message: 'Vui lòng chọn ngày nghỉ thai sản' }
    )
    .nullable()
    .refine(
      (data) => {
        if (!data || !data.from) return false
        if (data.to && data.from > data.to) return false
        return true
      },
      {
        message: 'Vui lòng chọn ngày nghỉ thai sản',
      }
    ),
  description: z
    .string()
    .max(
      EMPLOYEE_ACTION_DESCRIPTION_MAX_LENGTH,
      `Mô tả không được quá ${EMPLOYEE_ACTION_DESCRIPTION_MAX_LENGTH} ký tự`
    )
    .optional(),
})

export type MaternityLeaveFormData = z.infer<typeof maternityLeaveSchema>

export type MaternityLeaveDialogRef = {
  submit: () => Promise<void>
}

const MaternityLeaveDialog = forwardRef<MaternityLeaveDialogRef, MaternityLeaveDialogProps>(
  function MaternityLeaveDialog({ employee: _employee, initialData, onSubmit }, ref) {
    const { control, register, handleSubmit, trigger } = useForm<MaternityLeaveFormData>({
      resolver: zodResolver(maternityLeaveSchema),
      defaultValues: {
        date_range:
          initialData?.from_date && initialData?.to_date
            ? {
                from: new Date(initialData.from_date),
                to: new Date(initialData.to_date),
              }
            : initialData?.from_date
              ? {
                  from: new Date(initialData.from_date),
                  to: undefined,
                }
              : undefined,
        description: initialData?.detail || '',
      },
      mode: 'onTouched',
    })

    const handleFormSubmit = async (data: MaternityLeaveFormData) => {
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
          {/* Date Range */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-0.5">
                <label className="typo-body-base-semibold text-content-dark-2">
                  Ngày nghỉ thai sản
                </label>
                <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
              </div>
            </div>
            <FormController
              register={register}
              name="date_range"
              control={control}
              Field={DateRangePicker}
              fieldProps={{
                className: 'w-full',
                showQuickSelect: false,
              }}
            />
            <p className="text-content-dark-3 text-sm">
              Trạng thái làm việc của nhân viên sẽ tự động chuyển về <b>Đang làm việc</b> sau khi
              hết thời gian nghỉ
            </p>
          </div>

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

export default MaternityLeaveDialog
