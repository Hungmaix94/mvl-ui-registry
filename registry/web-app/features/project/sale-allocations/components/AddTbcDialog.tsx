import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Button, CurrencyInput, Select, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import FormController from '@/components/ui/form/FormController'

type FormValues = {
  category: string
  effective_from: Date | null
  effective_to: Date | null
  percentage: string | null
  fixed_amount: string | null
  note: string | null
}

export type AddTbcDialogProps = {
  onConfirm: (data: FormValues) => void
  onCancel?: () => void
}

export const AddTbcDialog = ({ onConfirm, onCancel }: AddTbcDialogProps) => {
  const { register, control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      category: '',
      effective_from: new Date(),
      effective_to: null,
      percentage: null,
      fixed_amount: null,
      note: '',
    },
  })

  const categoryOptions = useMemo(
    () => [
      { value: 'agency_fee', label: 'Phí môi giới (Agency Fee)' },
      { value: 'sale_commission', label: 'Hoa hồng bán hàng' },
      { value: 'revenue', label: 'Doanh thu' },
      { value: 'investor_bonus', label: 'Thưởng CĐT' },
      { value: 'investor_bonus_to_sale', label: 'Thưởng cho sale' },
    ],
    []
  )

  const onSubmit = (data: FormValues) => {
    onConfirm(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <FormController<FormValues, any>
        register={register}
        control={control}
        name="category"
        Field={Select}
        fieldProps={{
          label: 'Loại hoa hồng',
          options: categoryOptions,
          placeholder: 'Chọn loại...',
          required: true,
        }}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormController<FormValues, any>
          register={register}
          control={control}
          name="effective_from"
          Field={DatePicker}
          fieldProps={{ label: 'Ngày áp dụng', required: true }}
        />
        <FormController<FormValues, any>
          register={register}
          control={control}
          name="effective_to"
          Field={DatePicker}
          fieldProps={{ label: 'Ngày kết thúc', isClearable: true }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormController<FormValues, any>
          register={register}
          control={control}
          name="percentage"
          Field={TextField}
          fieldProps={{ label: 'Tỷ lệ (%)', type: 'number', step: '0.01' }}
        />
        <FormController<FormValues, any>
          register={register}
          control={control}
          name="fixed_amount"
          Field={CurrencyInput}
          fieldProps={{ label: 'Số tiền cố định (VND)' }}
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

export default AddTbcDialog
