import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'

import { TextField } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { FileUpload } from '@/components/ui/file-upload/FileUpload'
import AppDialog from '@/components/dialog/AppDialog'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import { QUERY_KEYS } from '@/constants'

import {
  usePostReceiptVoucher,
  usePartialUpdateReceiptVoucher,
  ReceiptVoucherPaymentMethod,
  type ReceiptVoucher,
  type PatchedReceiptVoucherRequest,
} from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'
import { resolveBankRefUpdate } from '@/features/accounting/_shares/utils/bank-ref-utils'
import { attachmentNameFromUrl } from '@/features/accounting/payment-vouchers/utils/payment-voucher-utils'
import { formatCurrencyVND } from '@/utils/common'

export interface CollectionVariance {
  variance: string
  cash: string
  allocated: string
  limit: string
}

const VARIANCE_CODE = 'collection_variance_exceeds_limit'

/**
 * BE ném lỗi ở vài hình dạng khác nhau tùy tầng nào bắt được nó — dò cả ba thay vì đoán một.
 * Cùng lý do như `extractRoundingGap` của modal phát hành: đoán một hình dạng là đủ để dialog
 * im lặng nuốt cảnh báo và người dùng không bao giờ thấy con số.
 */
export function extractCollectionVariance(error: unknown): CollectionVariance | null {
  const candidates = [(error as any)?.error, (error as any)?.server, error as any].filter(Boolean)
  for (const candidate of candidates) {
    if (candidate?.code === VARIANCE_CODE) {
      return {
        variance: String(candidate.variance ?? ''),
        cash: String(candidate.cash ?? ''),
        allocated: String(candidate.allocated ?? ''),
        limit: String(candidate.limit ?? ''),
      }
    }
  }
  return null
}

/**
 * Chỉ những trường mà việc ghi sổ thực sự cần — cố ý KHÔNG nhận cả `ReceiptVoucher`.
 * Màn danh sách truyền vào dòng của serializer `ReceiptVoucherList` (không có `invoices`
 * / `offset_invoices`), nên đọc thêm field ngoài danh sách này sẽ chạy được ở màn chi tiết
 * mà vỡ ngầm ở màn danh sách.
 */
type PostableReceiptVoucher = Pick<
  ReceiptVoucher,
  'id' | 'payment_method' | 'bank_transaction_ref' | 'attachments'
>

type Props = {
  voucher: PostableReceiptVoucher | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Gọi sau khi ghi sổ thành công (để parent đóng dialog / điều hướng nếu cần) */
  onPosted?: () => void
}

// CR 86eycj1de: chứng từ đính kèm và mã tham chiếu ngân hàng đều tuỳ chọn khi ghi sổ.
const postFormSchema = z.object({
  attachment: z
    .object({
      token: z.string().nullable().optional(),
      existing: z.any().nullable().optional(),
    })
    .nullable()
    .optional(),
  bank_transaction_ref: z.string().trim().optional(),
})

type PostFormValues = z.infer<typeof postFormSchema>

/**
 * Dialog "Ghi sổ phiếu thu" dùng chung cho cả màn danh sách (CR 86eyfnh0e) và màn chi tiết.
 * Giữ nguyên luồng cũ: PATCH bổ sung chứng từ / mã tham chiếu (nếu có thay đổi) rồi mới POST ghi sổ.
 */
export function PostReceiptVoucherDialog({ voucher, open, onOpenChange, onPosted }: Props) {
  const queryClient = useQueryClient()
  const { mutateAsync: postVoucher } = usePostReceiptVoucher()
  const { mutateAsync: partialUpdateVoucher } = usePartialUpdateReceiptVoucher()
  const [variance, setVariance] = useState<CollectionVariance | null>(null)

  const postForm = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    mode: 'onTouched',
    defaultValues: { attachment: null, bank_transaction_ref: '' },
  })

  useEffect(() => {
    if (open && voucher) {
      setVariance(null)
      postForm.reset({
        attachment: {
          token: null,
          existing: voucher.attachments?.[0] || null,
        },
        bank_transaction_ref: voucher.bank_transaction_ref || '',
      })
    }
  }, [open, voucher, postForm])

  const isTransferMethod = voucher?.payment_method === ReceiptVoucherPaymentMethod.TRANSFER

  const onConfirmPost = async (acknowledgeLargeVariance: boolean) => {
    if (!voucher) return
    const isValid = await postForm.trigger()
    if (!isValid) {
      throw { isValidationError: true }
    }
    const values = postForm.getValues()
    try {
      const updateData: PatchedReceiptVoucherRequest = {}
      if (values.attachment?.token) {
        updateData.files = {
          attachments: [values.attachment.token],
        }
      }
      if (isTransferMethod) {
        const nextRef = resolveBankRefUpdate(
          voucher.bank_transaction_ref,
          values.bank_transaction_ref
        )
        if (nextRef !== undefined) {
          updateData.bank_transaction_ref = nextRef
        }
      }

      if (Object.keys(updateData).length > 0) {
        await partialUpdateVoucher({
          id: voucher.id,
          data: updateData,
        })
      }
      await postVoucher({
        id: voucher.id,
        data: acknowledgeLargeVariance ? { acknowledge_large_variance: true } : undefined,
      })
      // Prefix chung phủ cả DETAIL, LIST và SUMMARY — dùng prefix vì LIST(params) nhét params
      // đã stringify vào phần tử cuối, invalidate LIST({}) sẽ không khớp query thật của bảng.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTING.RECEIPT_VOUCHERS.ALL })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.DEAL_PERIOD_ALLOCATIONS.LIST({
          receipt_voucher: voucher.id,
        }),
      })
      toastService.success('Ghi sổ phiếu thu thành công')
      onOpenChange(false)
      onPosted?.()
    } catch (err) {
      const detected = extractCollectionVariance(err)
      if (detected && !acknowledgeLargeVariance) {
        // Không phải lỗi để chặn — là câu hỏi cho kế toán. Giữ dialog mở kèm con số.
        setVariance(detected)
        throw { isValidationError: true }
      }
      handleApiError(err, postForm.setError, {
        attachment: 'attachment',
        bank_transaction_ref: 'bank_transaction_ref',
      })
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
      title="Ghi sổ phiếu thu"
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
                        const parsedToken =
                          typeof token === 'string' ? token || null : (token[0] ?? null)
                        onChange({
                          token: parsedToken,
                          existing: parsedToken ? null : value?.existing,
                        })
                      }}
                      value={value?.token ?? ''}
                      error={error?.message}
                      multiple={false}
                      required={false}
                      purpose="accounting_receipt_voucher"
                      existingFile={value?.existing}
                      label="Chứng từ đính kèm (UNC, Ủy nhiệm chi,...)"
                      accept={['.jpg', '.jpeg', '.png', '.pdf', '.xls', '.xlsx', '.doc', '.docx']}
                    />
                    {value?.existing && !value?.token && (
                      <a
                        href={value.existing.view_url || value.existing.download_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-action-primary-blue-default hover:text-action-primary-blue-hover text-sm font-semibold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Chứng từ hiện tại:{' '}
                        {value.existing.file_name ||
                          attachmentNameFromUrl(
                            value.existing.view_url || value.existing.download_url
                          )}
                      </a>
                    )}
                  </div>
                )}
              />

              {isTransferMethod && (
                <FormController
                  control={postForm.control}
                  register={postForm.register}
                  name="bank_transaction_ref"
                  Field={TextField}
                  fieldProps={{
                    label: 'Mã tham chiếu ngân hàng',
                    placeholder: 'Nhập mã tham chiếu...',
                  }}
                />
              )}
            </div>
          </FormProvider>

          {variance && (
            <div
              className="flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm"
              data-testid="collection-variance-warning"
            >
              <span className="font-medium text-amber-900">
                Chênh lệch thu vượt mức làm tròn giải thích được
              </span>
              <span className="text-amber-900">
                Tiền thực nhận {formatCurrencyVND(Number(variance.cash))}đ, mệnh giá tất toán{' '}
                {formatCurrencyVND(Number(variance.allocated))}đ — lệch{' '}
                {formatCurrencyVND(Number(variance.variance))}đ, vượt mức{' '}
                {formatCurrencyVND(Number(variance.limit))}đ.
              </span>
              {/* Nói đúng hai nguyên nhân thật, không nói chung chung: mức trần này tách công nợ
                  vụn khỏi lỗi nhập liệu, mà hai lỗi kia sai hàng triệu chứ không vài nghìn. */}
              <span className="text-amber-800">
                Thường là gõ nhầm số tiền trên sao kê, hoặc thiếu một hóa đơn trong phần phân bổ —
                kiểm lại trước khi ghi sổ. Vẫn muốn ghi sổ thì bấm lại nút xác nhận.
              </span>
            </div>
          )}
        </div>
      }
      onConfirm={() => onConfirmPost(variance !== null)}
      confirmText={variance ? 'Vẫn ghi sổ' : 'Xác nhận ghi sổ'}
    />
  )
}

export default PostReceiptVoucherDialog
