import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Select, TextField } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import AppDialog from '@/components/dialog/AppDialog'
import { IconWarningcircle } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import toastService from '@/services/toast-service'
import { formatCurrencyVND } from '@/utils/common'
import { extractErrorMessage, handleApiError, isConflictError } from '@/utils/error-utils'
import useAppConstant from '@/hooks/useAppConstant'
import { useBankAccounts } from '@/features/accounting/bank-accounts/services/bank-account-service'
import {
  useCreateInputInvoicePaymentVoucher,
  useInputInvoicePaymentVoucherPreview,
  type InputInvoice,
} from '@/features/accounting/input-invoices/services/input-invoice-service'
import {
  PAYMENT_SKIP_REASON_LABEL,
  PAYMENT_VOUCHER_CONSTANT_KEYS,
  PAYMENT_VOUCHER_CONSTANT_MODULE,
} from '@/features/accounting/input-invoices/constants/payment-voucher-constants'
import { inputInvoiceDraftHoldingVouchers } from '@/features/accounting/input-invoices/utils/input-invoice-payment'
import { VoucherPaymentMethod as PaymentMethod } from '@/constants/api-schema-aliases'

const createPaymentVoucherSchema = z
  .object({
    voucher_date: z.string().trim().min(1, 'Vui lòng chọn ngày phiếu chi!'),
    payment_method: z.nativeEnum(PaymentMethod),
    from_bank_account: z.coerce.number().nullish(),
  })
  .superRefine((values, ctx) => {
    // The API allows a null account (cash / offset vouchers have none), but a transfer without a
    // source account is a voucher the bank file cannot be built from — catch it here, not at post.
    if (values.payment_method === PaymentMethod.TRANSFER && !values.from_bank_account) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['from_bank_account'],
        message: 'Vui lòng chọn tài khoản ngân hàng chi!',
      })
    }
  })

type CreatePaymentVoucherFormValues = z.infer<typeof createPaymentVoucherSchema>

type Props = {
  invoice: InputInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/**
 * "Tạo phiếu chi" từ màn chi tiết hóa đơn đầu vào (CR STT10).
 *
 * The accountant does NOT type an amount: the backend builds the voucher from the F2 allocations
 * that already have cash behind them. So the dialog's job is to show that computed figure — plus
 * the lines left out and why — before anything is created.
 */
export function CreatePaymentVoucherDialog({ invoice, open, onOpenChange, onSuccess }: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const invoiceId = invoice?.id ?? 0

  const {
    data: preview,
    isLoading: isPreviewLoading,
    error: previewError,
  } = useInputInvoicePaymentVoucherPreview(invoiceId, { enabled: open && !!invoiceId })
  const createVoucher = useCreateInputInvoicePaymentVoucher()

  const { keysMapOptions } = useAppConstant({
    module: PAYMENT_VOUCHER_CONSTANT_MODULE,
    keys: [PAYMENT_VOUCHER_CONSTANT_KEYS.PAYMENT_METHOD],
  })
  const paymentMethodOptions =
    keysMapOptions.get(PAYMENT_VOUCHER_CONSTANT_KEYS.PAYMENT_METHOD) ?? []

  const { data: bankAccountsResponse } = useBankAccounts({ page_size: 50 }, { enabled: open })
  const bankAccountOptions = useMemo(
    () =>
      (bankAccountsResponse?.results ?? []).map((acc) => ({
        value: acc.id,
        label: `${acc.bank_name} - ${acc.account_number} (${acc.account_holder})`,
      })),
    [bankAccountsResponse]
  )

  const holdingVouchers = useMemo(
    () => (invoice ? inputInvoiceDraftHoldingVouchers(invoice) : []),
    [invoice]
  )

  const form = useForm<CreatePaymentVoucherFormValues>({
    resolver: zodResolver(createPaymentVoucherSchema),
    defaultValues: {
      voucher_date: '',
      payment_method: PaymentMethod.TRANSFER,
      from_bank_account: null,
    },
  })
  const paymentMethod = form.watch('payment_method')

  useEffect(() => {
    if (open) {
      form.reset({
        voucher_date: new Date().toISOString().split('T')[0],
        payment_method: PaymentMethod.TRANSFER,
        from_bank_account: null,
      })
    }
  }, [open, form])

  const totalAmount = Number(preview?.total_amount_with_vat ?? 0)
  // Pre-VAT side of the same total, straight from the API — the VAT is the difference,
  // never a rate applied on the FE.
  const totalNetAmount = Number(preview?.total_net_amount ?? 0)
  const hasNothingToCollect = !isPreviewLoading && !previewError && totalAmount <= 0

  const onConfirm = async () => {
    if (!invoice) return
    const isValid = await form.trigger()
    if (!isValid) throw { isValidationError: true }
    const values = form.getValues()

    try {
      const voucher = await createVoucher.mutateAsync({
        id: invoice.id,
        data: {
          voucher_date: values.voucher_date,
          payment_method: values.payment_method,
          from_bank_account:
            values.payment_method === PaymentMethod.TRANSFER ? values.from_bank_account : null,
        },
      })
      queryClient.invalidateQueries({ queryKey: ['accounting', 'input-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['accounting', 'payment-vouchers'] })
      toastService.success('Đã tạo phiếu chi nháp từ hóa đơn đầu vào!')
      onOpenChange(false)
      onSuccess?.()
      if (voucher?.id) {
        navigate(APP_PATH.PAYMENT_VOUCHER_DETAIL.replace(':id', String(voucher.id)))
      }
    } catch (err) {
      // 409 = this invoice already has a draft voucher. The API refuses a second one, so point the
      // accountant at the existing draft instead of leaving them to retry a button that cannot work.
      if (isConflictError(err)) {
        const codes = holdingVouchers.map((v) => v.code).join(', ')
        toastService.error(
          codes
            ? `Hóa đơn này đã có phiếu chi nháp (${codes}). Vui lòng mở phiếu đó để chỉnh sửa thay vì tạo phiếu mới.`
            : 'Hóa đơn này đã có phiếu chi nháp. Vui lòng mở phiếu đó để chỉnh sửa thay vì tạo phiếu mới.'
        )
        onOpenChange(false)
        throw { isValidationError: true }
      }
      handleApiError(err, form.setError, {
        voucher_date: 'voucher_date',
        payment_method: 'payment_method',
        from_bank_account: 'from_bank_account',
      })
      throw { isValidationError: true }
    }
  }

  return (
    <AppDialog
      variant="custom"
      // 80% chiều rộng trang: bảng có 6 cột và tên dự án dài (vd "Dự án Vinaconex7(N test)_Sửa
      // tên") làm tụt dòng ở bề rộng mặc định. `cn` dùng twMerge nên class này thắng
      // `max-w-*` của `size`, vì vậy không truyền `size` để khỏi mâu thuẫn.
      dialogContentClassName="max-w-[80vw]"
      isHideCancelButton={false}
      onCancel={() => onOpenChange(false)}
      open={open}
      onOpenChange={onOpenChange}
      title="Tạo phiếu chi từ hóa đơn đầu vào"
      disableConfirm={isPreviewLoading || hasNothingToCollect || !!previewError}
      loading={createVoucher.isPending}
      content={
        <div className="flex flex-col gap-4 py-4">
          {holdingVouchers.length > 0 && (
            <div className="border-border-1 flex items-start gap-2 rounded-md border bg-[#FFF6F2] p-3">
              <IconWarningcircle size={18} className="text-action-primary-red-default mt-0.5" />
              <p className="text-content-dark-2 text-sm">
                Hóa đơn này đang nằm trong phiếu chi nháp{' '}
                <span className="font-semibold">
                  {holdingVouchers.map((v) => v.code).join(', ')}
                </span>
                . Hệ thống chỉ cho phép một phiếu chi nháp cho mỗi hóa đơn — nên tạo mới sẽ không
                thành công. Ngài nên mở phiếu nháp đó ra chỉnh sửa.
              </p>
            </div>
          )}

          {isPreviewLoading && (
            <p className="text-content-dark-3 text-sm">Đang tính các khoản sẽ chi...</p>
          )}

          {!!previewError && (
            <p className="text-action-primary-red-default text-sm">
              {extractErrorMessage(previewError, 'Không tải được nội dung phiếu chi')}
            </p>
          )}

          {!isPreviewLoading && !previewError && preview && (
            <>
              <div className="border-border-1 flex items-center justify-between gap-3 rounded-md border p-3">
                <span className="text-content-dark-2 text-sm">
                  Tổng tiền phiếu chi sẽ tạo cho hóa đơn{' '}
                  <span className="font-semibold">{preview.input_invoice_code}</span>
                </span>
                <span className="flex flex-col items-end">
                  <span className="typo-body-xl-semibold text-content-dark-1">
                    {formatCurrencyVND(totalAmount)}
                  </span>
                  <span className="text-content-dark-3 text-xs">
                    Chưa VAT: {formatCurrencyVND(totalNetAmount)} · VAT:{' '}
                    {formatCurrencyVND(totalAmount - totalNetAmount)}
                  </span>
                </span>
              </div>

              <p className="text-content-dark-3 text-xs">
                Số tiền do hệ thống tính từ các khoản hoa hồng / thưởng / giảm trừ{' '}
                <span className="font-medium">đã có tiền về</span> — không nhập tay được, và có thể
                nhỏ hơn số tiền còn lại của hóa đơn.
              </p>

              {preview.items.length > 0 && (
                <div className="border-border-1 overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-background-2">
                      <tr className="text-content-dark-2">
                        <th className="px-3 py-2 text-left font-medium">Dự án</th>
                        <th className="px-3 py-2 text-left font-medium">Mã căn</th>
                        <th className="px-3 py-2 text-right font-medium">Tiền dòng HĐ</th>
                        <th className="px-3 py-2 text-right font-medium">Còn lại của dòng</th>
                        <th className="px-3 py-2 text-right font-medium">Sẽ chi (chưa VAT)</th>
                        <th className="px-3 py-2 text-right font-medium">Sẽ chi (gồm VAT)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.items.map((item) => (
                        <tr key={item.input_invoice_line_id} className="border-border-1 border-t">
                          <td className="px-3 py-2">{item.project_name || '-'}</td>
                          <td className="px-3 py-2">{item.unit_number || '-'}</td>
                          <td className="px-3 py-2 text-right">
                            {formatCurrencyVND(Number(item.line_total_with_vat))}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatCurrencyVND(Number(item.line_remaining_with_vat))}
                          </td>
                          <td className="text-content-dark-3 px-3 py-2 text-right">
                            {formatCurrencyVND(Number(item.net_amount))}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {formatCurrencyVND(Number(item.amount_with_vat))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {preview.skipped.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-content-dark-2 text-sm font-medium">
                    Không đưa vào phiếu chi ({preview.skipped.length} dòng)
                  </p>
                  <ul className="flex flex-col gap-1">
                    {preview.skipped.map((skipped) => (
                      <li
                        key={skipped.input_invoice_line_id}
                        className="text-content-dark-3 text-xs"
                      >
                        <span className="font-medium">{skipped.deal_code || 'Dòng hóa đơn'}</span>
                        {': '}
                        {PAYMENT_SKIP_REASON_LABEL[skipped.reason] ?? skipped.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {hasNothingToCollect && (
                <p className="text-action-primary-red-default text-sm">
                  Chưa có khoản nào đủ điều kiện chi cho hóa đơn này, nên chưa tạo được phiếu chi.
                </p>
              )}
            </>
          )}

          <FormProvider {...form}>
            <div className="flex flex-col gap-4 pt-2">
              <FormController
                control={form.control}
                register={form.register}
                name="voucher_date"
                Field={TextField}
                fieldProps={{ label: 'Ngày phiếu chi', type: 'date', required: true }}
              />
              <FormController
                control={form.control}
                register={form.register}
                name="payment_method"
                Field={Select}
                fieldProps={{
                  label: 'Phương thức thanh toán',
                  placeholder: 'Chọn phương thức',
                  options: paymentMethodOptions,
                  required: true,
                }}
              />
              {paymentMethod === PaymentMethod.TRANSFER && (
                <FormController
                  control={form.control}
                  register={form.register}
                  name="from_bank_account"
                  Field={Select}
                  fieldProps={{
                    label: 'Tài khoản ngân hàng chi',
                    placeholder: 'Chọn tài khoản',
                    options: bankAccountOptions,
                    enableSearch: true,
                    isClearable: true,
                    required: true,
                  }}
                />
              )}
            </div>
          </FormProvider>
        </div>
      }
      onConfirm={onConfirm}
      confirmText="Tạo phiếu chi"
    />
  )
}

export default CreatePaymentVoucherDialog
