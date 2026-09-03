import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormProvider, useForm, Controller } from 'react-hook-form'

import { TextField } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import AppDialog from '@/components/dialog/AppDialog'
import { FileUpload } from '@/components/ui/file-upload/FileUpload'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import {
  refreshInputInvoiceQueries,
  useMarkReceivedInputInvoice,
  type InputInvoice,
} from '@/features/accounting/input-invoices/services/input-invoice-service'

const markReceivedSchema = z.object({
  external_invoice_no: z.string().trim().min(1, 'Vui lòng nhập số hóa đơn thực tế!'),
  invoice_date: z.string().trim().min(1, 'Vui lòng chọn ngày hóa đơn!'),
  received_date: z.string().trim().min(1, 'Vui lòng chọn ngày nhận hóa đơn!'),
  attachment_file: z.string().trim().optional(),
})

type MarkReceivedFormValues = z.infer<typeof markReceivedSchema>

type Props = {
  record: InputInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * Dialog "Nhận hóa đơn đầu vào" dùng chung cho cả màn Chi tiết và Danh sách.
 * Bao trọn form + schema + mutation; tự invalidate list + detail khi thành công.
 */
export function MarkReceiveInputInvoiceDialog({ record, open, onOpenChange, onSuccess }: Props) {
  const queryClient = useQueryClient()
  const markReceivedMutation = useMarkReceivedInputInvoice()

  const form = useForm<MarkReceivedFormValues>({
    resolver: zodResolver(markReceivedSchema),
    defaultValues: {
      external_invoice_no: '',
      invoice_date: '',
      received_date: '',
      attachment_file: '',
    },
  })

  useEffect(() => {
    if (open && record) {
      form.reset({
        external_invoice_no: record.external_invoice_no || '',
        invoice_date: record.invoice_date || '',
        received_date: new Date().toISOString().split('T')[0],
        attachment_file: '',
      })
    }
  }, [open, record, form])

  const onConfirm = async () => {
    if (!record) return
    const isValid = await form.trigger()
    if (!isValid) throw { isValidationError: true }
    const values = form.getValues()

    try {
      await markReceivedMutation.mutateAsync({
        id: record.id,
        data: {
          external_invoice_no: values.external_invoice_no.trim(),
          invoice_date: values.invoice_date,
          received_date: values.received_date,
          attachment_file: values.attachment_file,
        },
      })
      await refreshInputInvoiceQueries(queryClient)
      toastService.success('Đã xác nhận nhận hóa đơn đầu vào!')
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      handleApiError(err, form.setError, {
        external_invoice_no: 'external_invoice_no',
        invoice_date: 'invoice_date',
        received_date: 'received_date',
        attachment_file: 'attachment_file',
      })
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
      title="Nhận hóa đơn đầu vào"
      content={
        <div className="flex min-w-[450px] flex-col gap-4 py-4">
          <p className="text-sm text-gray-500">
            Nhập đầy đủ thông tin hóa đơn đỏ VAT thực tế nhận được để cập nhật trạng thái đối chiếu
            số liệu:
          </p>
          <FormProvider {...form}>
            <div className="flex flex-col gap-4">
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
              <FormController
                control={form.control}
                register={form.register}
                name="invoice_date"
                Field={TextField}
                fieldProps={{ label: 'Ngày hóa đơn', type: 'date', required: true }}
              />
              <FormController
                control={form.control}
                register={form.register}
                name="received_date"
                Field={TextField}
                fieldProps={{ label: 'Ngày nhận hóa đơn', type: 'date', required: true }}
              />
              <div className="mt-2 flex flex-col gap-1.5">
                <Controller
                  control={form.control}
                  name="attachment_file"
                  render={({ field, fieldState }) => (
                    <FileUpload
                      label="Tệp đính kèm hóa đơn (VAT đỏ)"
                      // Optional in both the zod schema and the API — FileUpload defaults to
                      // required and would print a "*" the form never enforces.
                      required={false}
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      multiple={false}
                      purpose="accounting_input_invoice"
                    />
                  )}
                />
              </div>
            </div>
          </FormProvider>
        </div>
      }
      onConfirm={onConfirm}
      confirmText="Xác nhận nhận hóa đơn"
    />
  )
}

export default MarkReceiveInputInvoiceDialog
