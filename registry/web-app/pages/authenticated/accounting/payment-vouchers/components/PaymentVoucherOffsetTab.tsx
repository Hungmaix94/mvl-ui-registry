import { ReferenceCode } from '@/components/commons'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { APP_PATH } from '@/routes'
import type { PaymentVoucher } from '@/features/accounting/payment-vouchers/services/payment-voucher-service'
import { type SalesInvoice } from '@/features/accounting/sales-invoices/services/sales-invoice-service'

interface PaymentVoucherOffsetTabProps {
  record: PaymentVoucher
  salesInvoicesMap: Record<number, SalesInvoice>
}

export const PaymentVoucherOffsetTab = ({
  record,
  salesInvoicesMap,
}: PaymentVoucherOffsetTabProps) => {
  return (
    <>
      {record.offset_invoices && record.offset_invoices.length > 0 ? (
        <div className="flex flex-col gap-4">
          <p className="typo-body-xl-semibold text-content-dark-1">
            Danh sách hóa đơn cấn trừ ({record.offset_invoices?.length || 0})
          </p>
          <div className="border-border-1 bg-surface-primary-default w-full overflow-hidden overflow-x-auto rounded-xl border p-0 shadow-sm">
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-border-1 border-b">
                  <th className="text-content-dark-2 p-3.5 pl-5 font-semibold">Mã HĐ bán ra</th>
                  <th className="text-content-dark-2 p-3.5 font-semibold">Số hóa đơn</th>
                  <th className="text-content-dark-2 p-3.5 font-semibold">Ngày lập</th>
                  <th className="text-content-dark-2 p-3.5 font-semibold">
                    Khách hàng / Billed party
                  </th>
                  <th className="text-content-dark-2 p-3.5 text-right font-semibold">
                    Tổng tiền HĐ (VND)
                  </th>
                  <th className="text-content-dark-2 p-3.5 pr-5 text-right font-semibold">
                    Số tiền cấn trừ (VND)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border-1 divide-y">
                {record.offset_invoices.map((inv) => {
                  const detail = salesInvoicesMap[inv.sales_invoice]
                  return (
                    <tr
                      key={inv.sales_invoice}
                      className="border-border-1 border-b transition-colors hover:bg-neutral-50/20"
                    >
                      <td className="text-content-dark-1 p-3.5 pl-5 font-medium">
                        <ReferenceCode
                          code={detail?.code || `HĐ #${inv.sales_invoice}`}
                          linkTo={APP_PATH.SALES_INVOICE_DETAIL.replace(
                            ':id',
                            String(inv.sales_invoice)
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
                          {detail?.customer_name || '—'}
                        </span>
                      </td>
                      <td className="text-content-dark-1 p-3.5 text-right">
                        {detail?.total_amount_with_vat
                          ? formatCurrencyVND(Number(detail.total_amount_with_vat))
                          : detail?.total_amount
                            ? formatCurrencyVND(Number(detail.total_amount))
                            : '—'}
                      </td>
                      <td className="text-data-orange-default p-3.5 pr-5 text-right font-bold">
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
        </div>
      ) : (
        <div className="border-border-1 bg-surface-primary-default rounded-xl border border-dashed p-10 text-center">
          <span className="text-3xl">⚖️</span>
          <p className="text-content-dark-3 mt-2 text-sm font-semibold">
            Không có hóa đơn cấn trừ công nợ đính kèm phiếu chi này
          </p>
        </div>
      )}
    </>
  )
}
