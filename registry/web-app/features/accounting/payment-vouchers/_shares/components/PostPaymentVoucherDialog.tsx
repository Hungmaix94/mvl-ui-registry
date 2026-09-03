import { useEffect } from 'react'
import { z } from 'zod'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'

import { TextField } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { FileUpload } from '@/components/ui/file-upload/FileUpload'
import AppDialog from '@/components/dialog/AppDialog'
import useAppConstant from '@/hooks/useAppConstant'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import { QUERY_KEYS } from '@/constants'

import {
  usePostPaymentVoucher,
  usePartialUpdatePaymentVoucher,
  type PaymentVoucher,
  type PatchedPaymentVoucherRequest,
} from '@/features/accounting/payment-vouchers/services/payment-voucher-service'
import {
  PAYMENT_VOUCHER_CONSTANT_KEYS,
  PAYMENT_VOUCHER_CONSTANT_MODULE,
  PaymentMethod,
} from '@/features/accounting/payment-vouchers/constants/payment-voucher-constants'

import {
  isNonFieldError,
  useBlockedActionDialog,
} from '@/features/accounting/_shares/hooks/useBlockedActionDialog'
import { attachmentNameFromUrl } from '@/features/accounting/payment-vouchers/utils/payment-voucher-utils'
import { resolveBankRefUpdate } from '@/features/accounting/_shares/utils/bank-ref-utils'

type Props = {
  voucher: PaymentVoucher | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Gọi sau khi ghi sổ thành công (để parent đóng dialog / điều hướng nếu cần) */
  onPosted?: () => void
}

/**
 * Dialog "Ghi sổ phiếu chi" dùng chung cho cả màn danh sách và màn chi tiết.
 * CR 86eycj1de: chứng từ đính kèm và mã tham chiếu ngân hàng đều tuỳ chọn — không chặn ghi sổ.
 */
export function PostPaymentVoucherDialog({ voucher, open, onOpenChange, onPosted }: Props) {
  const queryClient = useQueryClient()
  const { mutateAsync: postVoucher } = usePostPaymentVoucher()
  const { mutateAsync: partialUpdateVoucher } = usePartialUpdatePaymentVoucher()
  const { showBlocked } = useBlockedActionDialog()

  const { keysMap } = useAppConstant({
    module: PAYMENT_VOUCHER_CONSTANT_MODULE,
    keys: [PAYMENT_VOUCHER_CONSTANT_KEYS.PAYMENT_METHOD],
  })
  const paymentMethodChoices = keysMap.get(PAYMENT_VOUCHER_CONSTANT_KEYS.PAYMENT_METHOD) as Record<
    string,
    string
  > | null

  const isTransferMethod = voucher?.payment_method === PaymentMethod.TRANSFER
  const paymentMethodLabel = voucher?.payment_method
    ? (paymentMethodChoices?.[voucher.payment_method] ?? '')
    : ''
  const attachmentUploadLabel = isTransferMethod
    ? 'Chứng từ đính kèm (UNC, Ủy nhiệm chi,...)'
    : 'Chứng từ đính kèm (Phiếu chi tiền mặt, biên nhận,...)'

  const postFormSchema = z.object({
    attachment: z
      .object({
        token: z.string().nullable().optional(),
        existing: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    bank_ref: z.string().trim().optional(),
  })

  const postForm = useForm<z.infer<typeof postFormSchema>>({
    resolver: zodResolver(postFormSchema),
    mode: 'onTouched',
    defaultValues: { attachment: null, bank_ref: '' },
  })

  useEffect(() => {
    if (open && voucher) {
      postForm.reset({
        attachment: {
          token: null,
          existing: voucher.attachments?.[0]?.view_url || null,
        },
        bank_ref: voucher.bank_ref || '',
      })
    }
  }, [open, voucher, postForm])

  const existingAttachment = postForm.watch('attachment')?.existing

  const onConfirmPost = async () => {
    if (!voucher) return
    const isValid = await postForm.trigger()
    if (!isValid) {
      throw { isValidationError: true }
    }
    const values = postForm.getValues()
    try {
      const updateData: PatchedPaymentVoucherRequest = {}
      if (values.attachment?.token) {
        updateData.files = {
          attachments: [values.attachment.token],
        }
      }
      if (voucher.payment_method === PaymentMethod.TRANSFER) {
        const nextRef = resolveBankRefUpdate(voucher.bank_ref, values.bank_ref)
        if (nextRef !== undefined) {
          updateData.bank_ref = nextRef
        }
      }

      if (Object.keys(updateData).length > 0) {
        await partialUpdateVoucher({ id: voucher.id, data: updateData })
      }
      await postVoucher(voucher.id)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.PAYMENT_VOUCHERS.DETAIL(voucher.id),
      })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTING.PAYMENT_VOUCHERS.LIST({}) })
      toastService.success('Ghi sổ phiếu chi thành công')
      onOpenChange(false)
      onPosted?.()
    } catch (err) {
      // A business rule that BLOCKED the posting (e.g. the voucher's payout splits moved
      // after it was drafted) has no form field to attach to — it would land in a toast
      // and fade before the accountant reads which step to do first. Give it a dialog.
      if (isNonFieldError(err)) {
        showBlocked(err, {
          title: 'Chưa ghi sổ được phiếu chi',
          hint: 'Xử lý xong bước được nêu ở trên rồi quay lại ghi sổ.',
        })
      } else {
        handleApiError(err, postForm.setError, {
          attachment: 'attachment',
          bank_ref: 'bank_ref',
        })
      }
      throw { isApiError: true }
    }
  }

  return (
    <AppDialog
      variant="custom"
      isHideCancelButton={false}
      onCancel={() => onOpenChange(false)}
      open={open}
      onOpenChange={onOpenChange}
      title="Ghi sổ phiếu chi"
      titleDescription={
        paymentMethodLabel
          ? isTransferMethod
            ? `Hình thức ${paymentMethodLabel} — có thể bổ sung mã tham chiếu ngân hàng và UNC.`
            : `Hình thức ${paymentMethodLabel} — có thể bổ sung phiếu chi tiền mặt / biên nhận.`
          : undefined
      }
      content={
        <div className="flex min-w-[400px] flex-col gap-4 py-4">
          <FormProvider {...postForm}>
            <div className="flex flex-col gap-4">
              <Controller
                control={postForm.control}
                name="attachment"
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <div className="flex flex-col gap-2">
                    <FileUpload
                      onChange={(token: string | string[]) => {
                        onChange({
                          token: typeof token === 'string' ? token || null : (token[0] ?? null),
                          existing: value?.existing ?? null,
                        })
                      }}
                      value={value?.token ?? ''}
                      error={error?.message}
                      multiple={false}
                      required={false}
                      purpose="accounting_payment_voucher"
                      label={attachmentUploadLabel}
                      accept={['.jpg', '.jpeg', '.png', '.pdf', '.xls', '.xlsx', '.doc', '.docx']}
                    />
                    {existingAttachment && !value?.token && (
                      <a
                        href={existingAttachment}
                        target="_blank"
                        rel="noreferrer"
                        className="text-action-primary-blue-default hover:text-action-primary-blue-hover text-sm font-semibold"
                      >
                        Chứng từ hiện tại: {attachmentNameFromUrl(existingAttachment)}
                      </a>
                    )}
                  </div>
                )}
              />

              {isTransferMethod && (
                <FormController
                  control={postForm.control}
                  register={postForm.register}
                  name="bank_ref"
                  Field={TextField}
                  fieldProps={{
                    label: 'Mã tham chiếu ngân hàng',
                    placeholder: 'Nhập mã tham chiếu...',
                  }}
                />
              )}
            </div>
          </FormProvider>
        </div>
      }
      onConfirm={onConfirmPost}
      confirmText="Xác nhận ghi sổ"
    />
  )
}

export default PostPaymentVoucherDialog
