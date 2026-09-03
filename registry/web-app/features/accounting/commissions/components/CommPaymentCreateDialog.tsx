import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { TextField, Select } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}))

const createSchema = z.object({
  year: z.coerce
    .number({ invalid_type_error: 'Năm không hợp lệ' })
    .int()
    .min(2000, 'Năm không hợp lệ')
    .max(2100, 'Năm không hợp lệ'),
  month: z.coerce.number({ invalid_type_error: 'Vui lòng chọn tháng' }).int().min(1).max(12),
  batch_date: z.string().min(1, 'Vui lòng chọn ngày tạo đợt'),
})

export type CommPaymentCreateFormData = z.infer<typeof createSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CommPaymentCreateFormData) => Promise<void>
  isSubmitting?: boolean
}

import AppDialog from '@/components/dialog/AppDialog'

export function CommPaymentCreateDialog({ open, onOpenChange, onSubmit, isSubmitting }: Props) {
  const form = useForm<CommPaymentCreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      batch_date: new Date().toISOString().slice(0, 10),
    },
  })

  const handleClose = () => {
    form.reset()
    onOpenChange(false)
  }

  const handleConfirm = () => {
    return form.handleSubmit(async (data) => {
      await onSubmit(data)
      form.reset()
    })()
  }

  return (
    <AppDialog
      variant="custom"
      open={open}
      onOpenChange={handleClose}
      title="Tạo đợt chi hoa hồng"
      isHideCancelButton={false}
      cancelText="Hủy"
      confirmText="Tạo đợt chi"
      onCancel={handleClose}
      onConfirm={handleConfirm}
      loading={isSubmitting}
      content={
        <FormProvider {...form}>
          <div className="flex flex-col gap-4 pt-2">
            <FormController<CommPaymentCreateFormData, any>
              register={form.register}
              control={form.control}
              name="year"
              Field={TextField}
              fieldProps={{ label: 'Năm', placeholder: 'VD: 2026', type: 'number' }}
            />

            <FormController<CommPaymentCreateFormData, any>
              register={form.register}
              control={form.control}
              name="month"
              Field={Select}
              fieldProps={{
                label: 'Tháng',
                placeholder: 'Chọn tháng',
                options: MONTH_OPTIONS,
              }}
            />

            <FormController<CommPaymentCreateFormData, any>
              register={form.register}
              control={form.control}
              name="batch_date"
              Field={TextField}
              fieldProps={{ label: 'Ngày tạo đợt', type: 'date' }}
            />
          </div>
        </FormProvider>
      }
    />
  )
}

export default CommPaymentCreateDialog
