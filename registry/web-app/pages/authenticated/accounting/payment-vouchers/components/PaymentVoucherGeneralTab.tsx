import { Chip } from '@/components/ui'
import { ReferenceCode } from '@/components/commons'
import { IconFile } from '@/assets/icons'
import DisplayField from '@/components/commons/DisplayField'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND } from '@/utils/common'
import { ColoredValueVariant } from '@/api/schema'
import { PaymentVoucherStatusBadge } from '@/features/accounting/payment-vouchers/_shares/components/PaymentVoucherStatusBadge'
import PayeeLink from '@/features/accounting/payment-vouchers/_shares/components/PayeeLink'
import { PAYEE_TYPE_VARIANT } from '@/features/accounting/payment-vouchers/constants/payment-voucher-constants'
import type { PaymentVoucher } from '@/features/accounting/payment-vouchers/services/payment-voucher-service'
import { resolvePayee } from '@/features/accounting/payment-vouchers/utils/payment-voucher-utils'
import { APP_PATH } from '@/routes'
import { type InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'
import { InputInvoiceCounterpartyType } from '@/features/accounting/input-invoices/types/input-invoice-types'

export function counterpartyLabel(detail: InputInvoice | undefined): string {
  if (!detail) return '—'
  if (detail.counterparty_type === InputInvoiceCounterpartyType.EXCHANGE) {
    return (
      detail.exchange_detail?.name ||
      detail.exchange_detail?.code ||
      `Sàn #${detail.exchange || '—'}`
    )
  }
  if (detail.counterparty_type === InputInvoiceCounterpartyType.COLLABORATOR) {
    return `Cộng tác viên #${detail.collaborator || '—'}`
  }
  if (detail.counterparty_type === InputInvoiceCounterpartyType.EMPLOYEE) {
    return 'Nhân sự nội bộ'
  }
  return '—'
}

interface PaymentVoucherGeneralTabProps {
  record: PaymentVoucher
  inputInvoicesMap: Record<number, InputInvoice>
  paymentMethodChoices: Record<string, string> | null
  payeeTypeChoices: Record<string, string> | null
}

export const PaymentVoucherGeneralTab = ({
  record,
  inputInvoicesMap,
  paymentMethodChoices,
  payeeTypeChoices,
}: PaymentVoucherGeneralTabProps) => {
  const payee = resolvePayee(record)

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
      {/* Cột trái (Main column) */}
      <div className="flex flex-col gap-6">
        {/* 1. Thông tin phiếu chi */}
        <div className="flex flex-col gap-4">
          <p className="typo-body-xl-semibold text-content-dark-1">Thông tin phiếu chi</p>
          <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <DisplayField
                label="Mã phiếu chi"
                value={
                  <code className="bg-background-3 text-content-dark-2 rounded px-1.5 py-0.5 text-xs">
                    {record.code}
                  </code>
                }
              />
              <DisplayField
                label="Trạng thái"
                value={<PaymentVoucherStatusBadge status={record.status} />}
              />
              <DisplayField
                label="Ngày lập phiếu"
                value={record.voucher_date ? formatDate(record.voucher_date) : '—'}
              />
              <DisplayField
                label="Hình thức thanh toán"
                value={paymentMethodChoices?.[record.payment_method] ?? record.payment_method}
              />
              {record.bank_ref && (
                <DisplayField
                  label="Mã tham chiếu ngân hàng"
                  value={<code className="text-content-dark-2 text-xs">{record.bank_ref}</code>}
                />
              )}
              <DisplayField
                label={
                  record.payee_type
                    ? (payeeTypeChoices?.[record.payee_type] ?? record.payee_type)
                    : 'Đối tượng chi'
                }
                value={
                  <div className="flex flex-wrap items-center gap-2">
                    <PayeeLink record={record}>{payee.name || '—'}</PayeeLink>
                    {record.payee_type && (
                      <Chip
                        label={payeeTypeChoices?.[record.payee_type] ?? record.payee_type}
                        variant={PAYEE_TYPE_VARIANT[record.payee_type] ?? ColoredValueVariant.GREY}
                        size="small"
                      />
                    )}
                    {payee.code && (
                      <PayeeLink record={record}>
                        <code className="text-content-dark-2 text-xs">{payee.code}</code>
                      </PayeeLink>
                    )}
                  </div>
                }
              />
              {record.cancel_reason && (
                <DisplayField label="Lý do hủy" value={record.cancel_reason} />
              )}
              {record.posted_at && (
                <DisplayField label="Ngày ghi sổ" value={formatDate(record.posted_at)} />
              )}
              {record.cancelled_at && (
                <DisplayField label="Ngày huỷ" value={formatDate(record.cancelled_at)} />
              )}
              <DisplayField
                label="Ngày tạo"
                value={record.created_at ? formatDate(record.created_at, 'dd/MM/yyyy HH:mm') : '—'}
              />
              <DisplayField
                label="Ngày cập nhật"
                value={record.updated_at ? formatDate(record.updated_at, 'dd/MM/yyyy HH:mm') : '—'}
              />
            </div>
          </div>
        </div>

        {/* 2. Hóa đơn được thanh toán */}
        <div className="flex flex-col gap-4">
          <p className="typo-body-xl-semibold text-content-dark-1">
            Hóa đơn được thanh toán ({record.invoices?.length || 0})
          </p>
          {record.invoices && record.invoices.length > 0 ? (
            <div className="border-border-1 bg-surface-primary-default w-full overflow-hidden overflow-x-auto rounded-xl border p-0 shadow-sm">
              <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-border-1 border-b">
                    <th className="text-content-dark-2 p-3.5 pl-5 font-semibold">Mã HĐ đầu vào</th>
                    <th className="text-content-dark-2 p-3.5 font-semibold">Số hóa đơn</th>
                    <th className="text-content-dark-2 p-3.5 font-semibold">Ngày lập</th>
                    <th className="text-content-dark-2 p-3.5 font-semibold">Đối tác / Supplier</th>
                    <th className="text-content-dark-2 p-3.5 text-right font-semibold">
                      Tổng tiền HĐ (VND)
                    </th>
                    <th className="text-content-dark-2 p-3.5 pr-5 text-right font-semibold">
                      Số tiền thanh toán (VND)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border-1 divide-y">
                  {record.invoices.map((inv) => {
                    const detail = inputInvoicesMap[inv.input_invoice]
                    return (
                      <tr
                        key={inv.input_invoice}
                        className="border-border-1 border-b transition-colors hover:bg-neutral-50/20"
                      >
                        <td className="text-content-dark-1 p-3.5 pl-5 font-medium">
                          <ReferenceCode
                            code={detail?.code || `HĐ #${inv.input_invoice}`}
                            linkTo={APP_PATH.INPUT_INVOICE_DETAIL.replace(
                              ':id',
                              String(inv.input_invoice)
                            )}
                          />
                        </td>
                        <td className="text-content-dark-2 p-3.5 font-mono text-xs">
                          {detail?.external_invoice_no || '—'}
                        </td>
                        <td className="text-content-dark-2 p-3.5">
                          {detail?.invoice_date ? formatDate(detail.invoice_date) : '—'}
                        </td>
                        <td className="p-3.5">
                          <span className="text-content-dark-1 font-semibold">
                            {counterpartyLabel(detail)}
                          </span>
                        </td>
                        <td className="text-content-dark-1 p-3.5 text-right">
                          {detail?.total_amount_with_vat
                            ? formatCurrencyVND(Number(detail.total_amount_with_vat))
                            : '—'}
                        </td>
                        <td className="text-data-red-default p-3.5 pr-5 text-right font-bold">
                          {inv.allocated_amount
                            ? formatCurrencyVND(Number(inv.allocated_amount))
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border-border-1 bg-surface-primary-default rounded-xl border border-dashed p-10 text-center">
              <span className="text-3xl">📄</span>
              <p className="text-content-dark-3 mt-2 text-sm font-semibold">
                Không có hóa đơn được thanh toán đính kèm phiếu chi này
              </p>
            </div>
          )}
        </div>

        {/* 3. Chứng từ đính kèm */}
        <div className="flex flex-col gap-4">
          <p className="typo-body-xl-semibold text-content-dark-1">Chứng từ đính kèm</p>
          <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
            {record.attachments?.[0] ? (
              <div className="border-border-1 flex w-full max-w-md items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-neutral-50/20">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-background-3 text-content-dark-1 flex items-center justify-center rounded p-2">
                    <IconFile size={20} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span
                      className="text-content-dark-1 truncate text-sm font-semibold"
                      title={record.attachments[0].file_name}
                    >
                      {record.attachments[0].file_name}
                    </span>
                  </div>
                </div>
                <a
                  href={record.attachments[0].view_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-action-primary-blue-default hover:text-action-primary-blue-hover shrink-0 text-sm font-semibold"
                >
                  Xem chứng từ
                </a>
              </div>
            ) : (
              <p className="text-content-dark-3 text-sm">Không có chứng từ đính kèm</p>
            )}
          </div>
        </div>
      </div>

      {/* Cột phải (Side column) */}
      <div className="flex flex-col gap-6">
        {/* 1. Số tiền chi */}
        <div className="flex flex-col gap-4">
          <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
            <div className="text-data-red-default text-xs font-bold tracking-widest uppercase">
              Số tiền chi
            </div>
            <div className="text-data-red-default mt-2 text-3xl font-bold">
              {/* `total_amount_with_vat` is not in the deployed contract yet, so it is read as
                  an optional extra and falls back to the pre-VAT total. */}
              {(() => {
                const amount =
                  (record as { total_amount_with_vat?: string }).total_amount_with_vat ??
                  record.total_amount
                return amount ? `− ${formatCurrencyVND(Number(amount))}` : '—'
              })()}
            </div>
          </div>
        </div>

        {/* 2. Lịch sử */}
        <div className="flex flex-col gap-4">
          <p className="typo-body-xl-semibold text-content-dark-1">Lịch sử</p>
          <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
            <div className="flex flex-col gap-4">
              <div className="flex gap-3 text-sm">
                <div className="bg-content-dark-3 mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                <div className="flex flex-col gap-0.5">
                  <span className="typo-body-base-semibold text-content-dark-1">
                    {formatDate(record.created_at, 'dd/MM/yyyy HH:mm')}
                  </span>
                  <span className="typo-body-base text-content-dark-3">Khởi tạo phiếu</span>
                </div>
              </div>
              {record.posted_at && (
                <div className="flex gap-3 text-sm">
                  <div className="bg-data-green-default mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                  <div className="flex flex-col gap-0.5">
                    <span className="typo-body-base-semibold text-content-dark-1">
                      {formatDate(record.posted_at, 'dd/MM/yyyy HH:mm')}
                    </span>
                    <span className="typo-body-base text-content-dark-3">Ghi sổ phiếu chi</span>
                  </div>
                </div>
              )}
              {record.cancelled_at && (
                <div className="flex gap-3 text-sm">
                  <div className="bg-data-red-default mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                  <div className="flex flex-col gap-0.5">
                    <span className="typo-body-base-semibold text-content-dark-1">
                      {formatDate(record.cancelled_at, 'dd/MM/yyyy HH:mm')}
                    </span>
                    <span className="typo-body-base text-content-dark-3">Huỷ phiếu chi</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
