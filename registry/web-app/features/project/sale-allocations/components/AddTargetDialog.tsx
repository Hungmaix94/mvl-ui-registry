import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Button, CurrencyInput, Select, TextField } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'

type FormValues = {
  type: string
  target_revenue: string | null
  note: string | null
}

export type AddTargetDialogProps = {
  onConfirm: (data: FormValues) => void
  onCancel?: () => void
}

export const AddTargetDialog = ({ onConfirm, onCancel }: AddTargetDialogProps) => {
  const { register, control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      type: '',
      target_revenue: null,
      note: '',
    },
  })

  const targetTypeOptions = useMemo(
    () => [
      { value: 'revenue', label: 'Doanh thu' },
      { value: 'booking_count', label: 'Số lượng giao dịch' },
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
        name="type"
        Field={Select}
        fieldProps={{
          label: 'Loại Target (KPIs)',
          options: targetTypeOptions,
          placeholder: 'Chọn loại KPI...',
          required: true,
        }}
      />

      <FormController<FormValues, any>
        register={register}
        control={control}
        name="target_revenue"
        Field={CurrencyInput}
        fieldProps={{ label: 'Doanh thu mục tiêu (VND)' }}
      />

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

export default AddTargetDialog
