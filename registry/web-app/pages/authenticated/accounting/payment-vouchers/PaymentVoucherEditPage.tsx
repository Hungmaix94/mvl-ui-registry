import { useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { PageTitle } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useAbility } from '@/lib/ability.ts'
import { isNotFoundError } from '@/utils/error-utils.ts'
import { APP_PATH } from '@/routes'
import toastService from '@/services/toast-service.tsx'
import {
  usePaymentVoucher,
  usePartialUpdatePaymentVoucher,
  type PatchedPaymentVoucherRequest,
} from '@/features/accounting/payment-vouchers/services/payment-voucher-service.ts'
import {
  PaymentMethod,
  PaymentVoucherStatus,
} from '@/features/accounting/payment-vouchers/constants/payment-voucher-constants.ts'
import type { PaymentVoucherWizardValues } from '@/features/accounting/payment-vouchers/schemas/payment-voucher-schema'
import { PaymentVoucherWizard } from '@/features/accounting/payment-vouchers/components/PaymentVoucherWizard'
import { extractErrorMessage } from '@/utils/error-utils'

export default function PaymentVoucherEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ability = useAbility()
  const queryClient = useQueryClient()

  const voucherId = Number(id)

  const { data: voucher, isLoading, error } = usePaymentVoucher(voucherId)
  const partialUpdateMutation = usePartialUpdatePaymentVoucher()

  const isNotFound = !isLoading && !voucher && !error
  const isError = !isLoading && !!error && !isNotFoundError(error)

  // Guard: redirect away if voucher is not in DRAFT status
  useEffect(() => {
    if (!voucher) return
    if (voucher.status !== PaymentVoucherStatus.DRAFT) {
      toastService.warning('Chỉ có thể sửa phiếu chi ở trạng thái Nháp')
      navigate(APP_PATH.PAYMENT_VOUCHER_DETAIL.replace(':id', String(voucherId)), { replace: true })
    }
  }, [voucher, navigate, voucherId])

  const handleCancel = useCallback(() => {
    navigate(APP_PATH.PAYMENT_VOUCHER_DETAIL.replace(':id', String(voucherId)))
  }, [navigate, voucherId])

  const handleSubmit = useCallback(
    async (payload: PatchedPaymentVoucherRequest) => {
      try {
        await partialUpdateMutation.mutateAsync({ id: voucherId, data: payload })
        queryClient.invalidateQueries({
          queryKey: ['accounting', 'payment-vouchers'],
        })
        toastService.success('Cập nhật phiếu chi thành công')
        navigate(APP_PATH.PAYMENT_VOUCHER_DETAIL.replace(':id', String(voucherId)))
      } catch (error) {
        toastService.error(extractErrorMessage(error))
      }
    },
    [partialUpdateMutation, queryClient, navigate, voucherId]
  )

  const isTransfer = voucher?.payment_method === PaymentMethod.TRANSFER
  const isCash = voucher?.payment_method === PaymentMethod.CASH
  const hasOffset =
    voucher?.payment_method === PaymentMethod.OFFSET || !!voucher?.offset_invoices?.length

  // total_amount = phần chuyển khoản/tiền mặt + phần cấn trừ; API không lưu split nên
  // tách lại phần cấn trừ từ tổng allocated của offset_invoices để tránh đếm đôi
  const totalAmount = Number(voucher?.total_amount ?? 0)
  const offsetAllocatedSum = (voucher?.offset_invoices ?? []).reduce(
    (s, l) => s + Number(l.allocated_amount ?? 0),
    0
  )
  const offsetAmount = hasOffset ? offsetAllocatedSum || totalAmount : 0
  const nonOffsetAmount = Math.max(0, totalAmount - offsetAmount)

  // F2 settlement: the gross already sits on the settlement tier and reserves the
  // invoice, so a second allocation through invoices[] is rejected by the API
  // ("a payment voucher must carry a single kind of line"). Do not offer it.
  //
  // Two shapes to recognise. The collect flow now writes the tier at line grain onto
  // `invoices[]`; `commission_invoices` is the legacy invoice-grain shape, still around
  // until the backfill has run everywhere. Checking only the legacy one left every
  // freshly collected voucher on the manual allocation UI — editable amounts, "Gợi ý
  // chia tỷ lệ", and a preloaded allocation that no save could ever accept.
  const settlesInputInvoice =
    (voucher?.invoices ?? []).some((tier) => tier.input_invoice_line) ||
    (voucher?.commission_invoices ?? []).some((tier) => tier.input_invoice_id)

  const initialValues: Partial<PaymentVoucherWizardValues> = voucher
    ? {
        voucher_date: voucher.voucher_date,
        payee_type: voucher.payee_type,
        payee_employee: voucher.payee_employee ?? null,
        payee_collaborator: voucher.payee_collaborator ?? null,
        payee_exchange: voucher.payee_exchange ?? null,
        payee_name: voucher.payee_name ?? '',
        payment_method: voucher.payment_method,
        total_amount: voucher.total_amount,
        accounting_period: voucher.accounting_period ?? undefined,
        // attachment hiện tại giữ nguyên trên server khi không upload file mới (PATCH bỏ qua field rỗng)
        attachment: undefined,
        // Map payment_method back to split fields (mirror receipt voucher wizard)
        bank_on: isTransfer,
        bank_amount: isTransfer ? nonOffsetAmount : undefined,
        from_bank_account: voucher.from_bank_account ?? null,
        bank_ref: voucher.bank_ref ?? undefined,
        cash_on: isCash,
        cash_amount: isCash ? nonOffsetAmount : undefined,
        offset_on: hasOffset,
        offset_amount: hasOffset ? offsetAmount : undefined,
        offset_receivables:
          voucher.offset_invoices?.reduce<Record<number, boolean>>((acc, l) => {
            if (l.sales_invoice) {
              acc[l.sales_invoice] = true
            }
            return acc
          }, {}) || {},
        offset_invoices:
          voucher.offset_invoices?.map((l) => ({
            sales_invoice: l.sales_invoice,
            allocated_amount: l.allocated_amount ? String(l.allocated_amount) : undefined,
          })) || [],
        // A settlement tier is not a manual allocation: seeding it here would put the
        // collected gross into the editable table and send it straight back on save,
        // which the API rejects — and an empty `invoices` payload would delete the
        // tiers outright. Leave the allocation untouched for those vouchers.
        invoices: settlesInputInvoice
          ? undefined
          : voucher.invoices?.map((l) => ({
              input_invoice: l.input_invoice,
              allocated_amount: l.allocated_amount ? String(l.allocated_amount) : undefined,
            })) || [],
        selected_invoice_ids: settlesInputInvoice
          ? []
          : voucher.invoices?.map((l) => l.input_invoice) || [],
      }
    : {}

  return (
    <DetailPageWrapper
      isLoading={isLoading}
      isNotFound={isNotFound}
      isError={isError}
      hasPermission={ability.can('update', 'paymentvoucher')}
    >
      <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
        <PageTitle
          title={voucher?.code ? `Chỉnh sửa phiếu chi — ${voucher.code}` : 'Chỉnh sửa phiếu chi'}
          enableBackButton
        />
        <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
          {voucher && (
            <PaymentVoucherWizard
              initialValues={initialValues}
              isEdit
              status={voucher.status}
              voucherCode={voucher.code}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={partialUpdateMutation.isPending}
              inputInvoiceAllocationLocked={settlesInputInvoice}
              settledInvoices={(voucher.invoices ?? []).filter((t) => t.input_invoice_line)}
              voucherId={settlesInputInvoice ? voucherId : undefined}
              lockedTotalAmount={settlesInputInvoice ? totalAmount : undefined}
              onCollectedMore={() => {
                queryClient.invalidateQueries({ queryKey: ['accounting', 'payment-vouchers'] })
              }}
            />
          )}
        </div>
      </div>
    </DetailPageWrapper>
  )
}
