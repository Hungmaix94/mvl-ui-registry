import { useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes'
import {
  useReceiptVoucher,
  usePartialUpdateReceiptVoucher,
} from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'
import { ReceiptVoucherWizard } from '@/features/accounting/receipt-vouchers/components/ReceiptVoucherWizard'
import { type ReceiptVoucherFormValues } from '@/features/accounting/receipt-vouchers/schemas/receipt-voucher-schema'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'

const ReceiptVoucherEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const receiptVoucherId = id ? Number(id) : 0

  const { data: receiptVoucher, isLoading } = useReceiptVoucher(receiptVoucherId, {
    enabled: !!receiptVoucherId,
  })
  const { mutateAsync: updateReceiptVoucher, isPending: isSubmitting } =
    usePartialUpdateReceiptVoucher()

  // Strict check: Editing is only allowed when status is DRAFT
  useEffect(() => {
    if (receiptVoucher && receiptVoucher.status !== 'DRAFT') {
      toastService.error('Chỉ được phép chỉnh sửa phiếu thu ở trạng thái Bản nháp')
      navigate(APP_PATH.RECEIPT_VOUCHER_DETAIL.replace(':id', String(receiptVoucherId)))
    }
  }, [receiptVoucher, receiptVoucherId, navigate])

  const handleCancel = useCallback(() => {
    navigate(APP_PATH.RECEIPT_VOUCHER_DETAIL.replace(':id', String(receiptVoucherId)))
  }, [navigate, receiptVoucherId])

  const handleSubmit = useCallback(
    async (payload: any) => {
      try {
        await updateReceiptVoucher({ id: receiptVoucherId, data: payload as any })
        queryClient.invalidateQueries({ queryKey: ['accounting', 'receipt-vouchers'] })
        toastService.success('Cập nhật phiếu thu thành công')
        navigate(APP_PATH.RECEIPT_VOUCHER_DETAIL.replace(':id', String(receiptVoucherId)))
      } catch (error) {
        toastService.error(extractErrorMessage(error))
      }
    },
    [updateReceiptVoucher, receiptVoucherId, navigate, queryClient]
  )

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="text-content-dark-4">Đang tải...</div>
      </div>
    )
  }

  const normalizePaymentMethod = (
    method: string | undefined | null
  ): 'TRANSFER' | 'CASH' | 'OFFSET' => {
    if (method === 'CK') return 'TRANSFER' // Legacy value migration
    if (method === 'TRANSFER' || method === 'CASH' || method === 'OFFSET') return method
    return 'TRANSFER' // fallback
  }

  const initialValues: Partial<ReceiptVoucherFormValues> = receiptVoucher
    ? {
        receipt_date: receiptVoucher.receipt_date,
        payer_type: receiptVoucher.payer_type as any,
        payer_investor: receiptVoucher.payer_investor,
        payer_exchange: receiptVoucher.payer_exchange,
        payer_collaborator: receiptVoucher.payer_collaborator,
        payer_name: receiptVoucher.payer_name ?? '',
        payer_tax_code: receiptVoucher.payer_tax_code ?? '',
        payer_account: receiptVoucher.payer_account ?? '',
        payment_method: normalizePaymentMethod(receiptVoucher.payment_method),
        total_amount: receiptVoucher.total_amount,
        to_bank_account: receiptVoucher.to_bank_account ?? null,
        bank_transaction_ref: receiptVoucher.bank_transaction_ref ?? undefined,
        accounting_period: receiptVoucher.accounting_period ?? undefined,
        notes: receiptVoucher.notes,
        attachment: undefined,
        existing_attachment: receiptVoucher.attachments?.[0] ?? null,
        // Map payment_method back to split fields (handle legacy 'CK' as TRANSFER)
        bank_on:
          (receiptVoucher.payment_method as string) === 'TRANSFER' ||
          (receiptVoucher.payment_method as string) === 'CK',
        bank_amount:
          (receiptVoucher.payment_method as string) === 'TRANSFER' ||
          (receiptVoucher.payment_method as string) === 'CK'
            ? receiptVoucher.total_amount
            : undefined,
        cash_on: receiptVoucher.payment_method === 'CASH',
        cash_amount:
          receiptVoucher.payment_method === 'CASH' ? receiptVoucher.total_amount : undefined,
        offset_on:
          receiptVoucher.payment_method === 'OFFSET' || !!receiptVoucher.offset_invoices?.length,
        offset_amount: receiptVoucher.offset_invoices?.length
          ? String(
              receiptVoucher.offset_invoices.reduce(
                (sum, oi) => sum + Number(oi.allocated_amount || 0),
                0
              )
            )
          : undefined,
        offset_payables:
          receiptVoucher.offset_invoices?.reduce<Record<number, boolean>>((acc, l) => {
            if (l.input_invoice) {
              acc[l.input_invoice] = true
            }
            return acc
          }, {}) || {},
        offset_invoices:
          receiptVoucher.offset_invoices?.map((l) => ({
            input_invoice: l.input_invoice,
            allocated_amount: l.allocated_amount ? String(l.allocated_amount) : undefined,
            input_invoice_detail: l.input_invoice_detail,
          })) || [],
        invoices:
          receiptVoucher.invoices?.map((l) => ({
            id: l.id,
            sales_invoice: l.sales_invoice,
            allocated_amount: l.allocated_amount ? String(l.allocated_amount) : undefined,
          })) || [],
      }
    : {}

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle enableBackButton title={`Chỉnh sửa phiếu thu ${receiptVoucher?.code ?? ''}`} />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <ReceiptVoucherWizard
          initialValues={initialValues}
          isEdit
          status={receiptVoucher?.status}
          voucherCode={receiptVoucher?.code}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  )
}

export default ReceiptVoucherEditPage
