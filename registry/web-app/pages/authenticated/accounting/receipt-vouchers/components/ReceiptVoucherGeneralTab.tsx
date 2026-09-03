import { Chip } from '@/components/ui'
import { ReferenceCode } from '@/components/commons'
import { IconFile } from '@/assets/icons'
import DisplayField from '@/components/commons/DisplayField'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND } from '@/utils/common'
import { ColoredValueVariant } from '@/api/schema'
import { ReceiptVoucherStatusBadge } from '@/features/accounting/receipt-vouchers/components/ReceiptVoucherStatusBadge'
import { ReceiptVoucherStatus } from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'
import { APP_PATH } from '@/routes'
import { type SalesInvoice } from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import { useAccountingPeriod } from '@/features/accounting/accounting-periods/services/accounting-period-service'

const PAYER_TYPE_VARIANTS: Record<string, ColoredValueVariant> = {
  INVESTOR: ColoredValueVariant.BLUE,
  EXCHANGE: ColoredValueVariant.PURPLE,
  COLLABORATOR: ColoredValueVariant.ORANGE,
  OTHER: ColoredValueVariant.GREY,
}

interface ReceiptVoucherGeneralTabProps {
  record: any
  salesInvoicesMap: Record<number, SalesInvoice>
  paymentMethodChoices: Record<string, string> | null
  payerTypeChoices: Record<string, string> | null
}

export const ReceiptVoucherGeneralTab = ({
  record,
  salesInvoicesMap,
  paymentMethodChoices,
  payerTypeChoices,
}: ReceiptVoucherGeneralTabProps) => {
  const { data: accountingPeriod } = useAccountingPeriod(record.accounting_period, {
    enabled: !!record.accounting_period,
  })
  // BE chỉ trả collection_variance ở detail (ở list nó tốn thêm một truy vấn mỗi dòng).
  const variance = Number((record as { collection_variance?: string }).collection_variance ?? 0)

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
      {/* Cột trái (Main column) */}
      <div className="flex flex-col gap-6">
        {/* 1. Thông tin phiếu thu */}
        <div className="flex flex-col gap-4">
          <p className="typo-body-xl-semibold text-content-dark-1">Thông tin phiếu thu</p>
          <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <DisplayField
                label="Mã phiếu thu"
                value={
                  <code className="bg-background-3 text-content-dark-2 rounded px-1.5 py-0.5 text-xs">
                    {record.code}
                  </code>
                }
              />
              <DisplayField
                label="Trạng thái"
                value={<ReceiptVoucherStatusBadge status={record.status as ReceiptVoucherStatus} />}
              />
              <DisplayField
                label="Ngày thu tiền"
                value={record.receipt_date ? formatDate(record.receipt_date) : '—'}
              />
              <DisplayField
                label="Hình thức thanh toán"
                value={paymentMethodChoices?.[record.payment_method] ?? record.payment_method}
              />
              {record.bank_transaction_ref && (
                <DisplayField
                  label="Mã đối chiếu ngân hàng"
                  value={
                    <code className="text-content-dark-2 text-xs">
                      {record.bank_transaction_ref}
                    </code>
                  }
                />
              )}
              {accountingPeriod ? (
                <DisplayField
                  label="Kỳ kế toán"
                  value={`Tháng ${accountingPeriod.month}/${accountingPeriod.year}`}
                />
              ) : null}
              <DisplayField
                label="Người nộp / Đối tác"
                value={
                  <div className="flex items-center gap-2">
                    <span>{record.payer_name || '—'}</span>
                    {record.payer_type && (
                      <Chip
                        label={payerTypeChoices?.[record.payer_type] ?? record.payer_type}
                        variant={PAYER_TYPE_VARIANTS[record.payer_type] ?? ColoredValueVariant.GREY}
                        size="small"
                      />
                    )}
                  </div>
                }
              />
              {/* Tiền mặt và mệnh giá là HAI số. Bên trả chuyển thừa/thiếu vài đồng (ngân hàng
                  làm tròn, hoặc bảng kê của họ làm tròn) thì phiếu vẫn tất toán ĐỦ mệnh giá —
                  nếu để dòng hóa đơn hụt thì tỷ lệ tiền về của căn đó không bao giờ đạt 100%
                  và hoa hồng bị treo. Phần lệch là công nợ vụn, hiện ở đây. */}
              <DisplayField
                label="Tiền thực nhận"
                value={formatCurrencyVND(Number(record.total_amount || 0))}
              />
              <DisplayField
                label="Mệnh giá tất toán"
                value={formatCurrencyVND(Number(record.allocated_total || 0))}
              />
              {variance !== 0 && (
                <DisplayField
                  label="Chênh lệch thu"
                  value={
                    <span className={variance < 0 ? 'text-amber-700' : 'text-blue-700'}>
                      {variance > 0 ? '+' : ''}
                      {formatCurrencyVND(variance)}
                      <span className="ml-1.5 text-xs text-gray-500">
                        {variance < 0 ? '(trả thiếu — công nợ vụn)' : '(trả thừa)'}
                      </span>
                    </span>
                  }
                />
              )}
              {record.notes && <DisplayField label="Ghi chú" value={record.notes} />}
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
                    <th className="text-content-dark-2 p-3.5 pl-5 font-semibold">Mã hóa đơn</th>
                    <th className="text-content-dark-2 p-3.5 font-semibold">Số hóa đơn</th>
                    <th className="text-content-dark-2 p-3.5 font-semibold">Ngày lập</th>
                    <th className="text-content-dark-2 p-3.5 font-semibold">
                      Khách hàng / Billed party
                    </th>
                    <th className="text-content-dark-2 p-3.5 text-right font-semibold">
                      Tiền hàng (VND)
                    </th>
                    <th className="text-content-dark-2 p-3.5 text-right font-semibold">
                      Thuế VAT (VND)
                    </th>
                    <th className="text-content-dark-2 p-3.5 text-right font-semibold">
                      Tổng tiền HĐ (VND)
                    </th>
                    <th className="text-content-dark-2 p-3.5 pr-5 text-right font-semibold">
                      Số tiền thanh toán (VND)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border-1 divide-y">
                  {record.invoices.map((inv: any) => {
                    const detail = salesInvoicesMap[inv.sales_invoice]
                    const amountBeforeTax = Number(detail?.total_amount || 0)
                    const taxAmount = Number(detail?.vat_amount || 0)
                    const totalAmount = Number(detail?.total_amount_with_vat || 0)

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
                          {detail?.total_amount
                            ? formatCurrencyVND(Math.round(amountBeforeTax))
                            : '—'}
                        </td>
                        <td className="text-content-dark-1 p-3.5 text-right">
                          {detail?.vat_amount ? formatCurrencyVND(Math.round(taxAmount)) : '—'}
                        </td>
                        <td className="text-content-dark-1 p-3.5 text-right">
                          {detail?.total_amount_with_vat
                            ? formatCurrencyVND(Math.round(totalAmount))
                            : '—'}
                        </td>
                        <td className="text-data-green-default p-3.5 pr-5 text-right font-bold">
                          {inv.allocated_amount
                            ? formatCurrencyVND(Math.round(Number(inv.allocated_amount)))
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
                Không có hóa đơn được thanh toán đính kèm phiếu thu này
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
                      title={record.attachments[0].file_name || 'Chứng từ đính kèm'}
                    >
                      {record.attachments[0].file_name || 'Chứng từ đính kèm'}
                    </span>
                  </div>
                </div>
                <a
                  href={record.attachments[0].view_url || record.attachments[0].download_url}
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
        {/* 1. Số tiền thu */}
        <div className="flex flex-col gap-4">
          <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
            <div className="text-data-green-default text-xs font-bold tracking-widest uppercase">
              Số tiền thu
            </div>
            <div className="text-data-green-default mt-2 text-3xl font-bold">
              {record.total_amount
                ? `+ ${formatCurrencyVND(Math.round(Number(record.total_amount)))}`
                : '—'}
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
                    <span className="typo-body-base text-content-dark-3">Ghi sổ phiếu thu</span>
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
                    <span className="typo-body-base text-content-dark-3">Huỷ phiếu thu</span>
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
