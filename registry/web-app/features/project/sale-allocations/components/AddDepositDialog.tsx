import { useForm } from 'react-hook-form'
import { Button, CurrencyInput, Select, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import FormController from '@/components/ui/form/FormController'
import { useSaleAllocationLoadOptions } from '../services/useSaleAllocationLoadOptions'

type FormValues = {
  sign_date: Date | null
  amount: string | null
  refunded_amount: string | null
  admin_id: string | number | null
  note: string | null
}

export type AddDepositDialogProps = {
  initialValues?: Partial<FormValues>
  onConfirm: (data: FormValues) => void
  onCancel?: () => void
}

export const AddDepositDialog = ({ initialValues, onConfirm, onCancel }: AddDepositDialogProps) => {
  const { register, control, handleSubmit } = useForm<FormValues>({
    defaultValues: initialValues || {
      sign_date: new Date(),
      amount: null,
      refunded_amount: '0',
      admin_id: null,
      note: '',
    },
  })

  const { loadEmployeeOptions, loadInitialEmployeeOptions } = useSaleAllocationLoadOptions()

  return (
    <form onSubmit={handleSubmit(onConfirm)} className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <FormController<FormValues, any>
          register={register}
          control={control}
          name="sign_date"
          Field={DatePicker}
          fieldProps={{ label: 'Ngày ký', placeholder: 'Chọn ngày' }}
        />

        <FormController<FormValues, any>
          register={register}
          control={control}
          name="admin_id"
          Field={Select}
          fieldProps={{
            label: 'Admin phụ trách',
            placeholder: 'Chọn admin',
            loadOptions: loadEmployeeOptions,
            loadInitialOptions: loadInitialEmployeeOptions,
            enableSearch: true,
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormController<FormValues, any>
          register={register}
          control={control}
          name="amount"
          Field={CurrencyInput}
          fieldProps={{ label: 'Tiền ký quỹ (VND)' }}
        />

        <FormController<FormValues, any>
          register={register}
          control={control}
          name="refunded_amount"
          Field={CurrencyInput}
          fieldProps={{ label: 'Đã hoàn (VND)' }}
        />
      </div>

      <FormController<FormValues, any>
        register={register}
        control={control}
        name="note"
        Field={TextField}
        fieldProps={{ label: 'Ghi chú' }}
      />

      <div className="border-border-1 mt-6 flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary-border" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" variant="primary">
          Xác nhận
        </Button>
      </div>
    </form>
  )
}

export default AddDepositDialog
