import { forwardRef, useImperativeHandle } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormController } from '@/components/ui/form'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import { type PenaltyTicket } from '@/features/payroll/services/penalty-ticket-service'
import { isValid, parse } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format'

const schema = z.object({
  payment_date: z
    .string()
    .min(1, 'Vui lòng chọn ngày nộp phạt')
    .refine((value) => {
      const parsed = parse(value, DATE_FORMAT, new Date())
      return isValid(parsed)
    }, 'Ngày nộp không hợp lệ'),
})

export type MarkPaidFormData = z.infer<typeof schema>

export type MarkPaidDialogRef = {
  submit: () => Promise<void>
}

type MarkPaidDialogFormProps = {
  ticket: PenaltyTicket
  onSubmit?: (data: MarkPaidFormData) => Promise<void>
}

const MarkPaidDialogForm = forwardRef<MarkPaidDialogRef, MarkPaidDialogFormProps>(
  function MarkPaidDialogForm({ ticket: _ticket, onSubmit }, ref) {
    const { control, register, handleSubmit, trigger } = useForm<MarkPaidFormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        payment_date: '',
      },
      mode: 'onTouched',
    })

    const handleFormSubmit = async (data: MarkPaidFormData) => {
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
        <FormController
          register={register}
          name="payment_date"
          control={control}
          Field={DatePicker}
          fieldProps={{
            label: 'Ngày nộp',
            placeholder: 'DD/MM/YYYY',
            allowManualInput: true,
            clearable: true,
            required: true,
          }}
        />
      </div>
    )
  }
)

export default MarkPaidDialogForm
