import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormProvider, useForm } from 'react-hook-form'

import { TextField } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import AppDialog from '@/components/dialog/AppDialog'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import {
  refreshInputInvoiceQueries,
  useVerifyInputInvoice,
  type InputInvoice,
} from '@/features/accounting/input-invoices/services/input-invoice-service'

const verifySchema = z.object({
  external_invoice_no: z.string().trim().min(1, 'Vui lòng nhập số hóa đơn thực tế!'),
})

type VerifyFormValues = z.infer<typeof verifySchema>

type Props = {
  record: InputInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Dialog "Xác nhận hóa đơn đầu vào" dùng chung cho cả màn Chi tiết và Danh sách.
 * Chuyển trạng thái hóa đơn sang VERIFIED (Đã xác nhận).
 */
export function VerifyInputInvoiceDialog({ record, open, onOpenChange, onSuccess }: Props) {
  const queryClient = useQueryClient()
  const verifyMutation = useVerifyInputInvoice()

  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { external_invoice_no: '' },
  })

  useEffect(() => {
    if (open && record) {
      form.reset({ external_invoice_no: record.external_invoice_no || '' })
    }
  }, [open, record, form])

  const onConfirm = async () => {
    if (!record) return
    const isValid = await form.trigger()
    if (!isValid) throw { isValidationError: true }
    const values = form.getValues()

    try {
      await verifyMutation.mutateAsync({
        id: record.id,
        data: { external_invoice_no: values.external_invoice_no.trim() },
      })
      await refreshInputInvoiceQueries(queryClient)
      toastService.success('Xác nhận hóa đơn thành công!')
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      handleApiError(err, form.setError, { external_invoice_no: 'external_invoice_no' })
      throw { isValidationError: true }
    }
  }

  return (
    <AppDialog
      variant="custom"
      isHideCancelButton={false}
      onCancel={() => onOpenChange(false)}
      open={open}
      onOpenChange={onOpenChange}
      title="Xác nhận hóa đơn đầu vào"
      content={
        <div className="flex min-w-[400px] flex-col gap-4 py-4">
          <p className="text-sm text-gray-700">
            Bạn có chắc chắn muốn xác nhận hóa đơn đầu vào này không? Hành động này sẽ chuyển trạng
            thái của hóa đơn sang <strong className="text-blue-600">ĐÃ XÁC NHẬN</strong> và chuẩn bị
            cho các đợt thanh toán tiếp theo.
          </p>
          <FormProvider {...form}>
            <FormController
              control={form.control}
              register={form.register}
              name="external_invoice_no"
              Field={TextField}
              fieldProps={{
                label: 'Số hóa đơn thực tế',
                placeholder: 'Nhập số hóa đơn...',
                required: true,
              }}
            />
          </FormProvider>
        </div>
      }
      onConfirm={onConfirm}
      confirmText="Xác nhận đồng ý"
    />
  )
}

export default VerifyInputInvoiceDialog
