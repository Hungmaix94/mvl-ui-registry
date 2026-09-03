import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { IconCheck, IconStack } from '@/assets/icons'
import type { SalesInvoice } from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

type Props = {
  watch: any
  currentStep: number
  selectedInvoices: SalesInvoice[]
  accountingPeriodLabel?: string | null
}

export function Sidecar({ watch, currentStep, selectedInvoices, accountingPeriodLabel }: Props) {
  const bankAmt = watch('bank_on') ? Number(watch('bank_amount') || 0) : 0
  const cashAmt = watch('cash_on') ? Number(watch('cash_amount') || 0) : 0
  const offsetAmt = watch('offset_on') ? Number(watch('offset_amount') || 0) : 0
  const offsetActive = watch('offset_on')
  const paymentMethod = watch('payment_method')
  const totalReceipt = bankAmt + cashAmt
  const invoices: any[] = watch('invoices') ?? []
  const totalAllocated = invoices.reduce((s, l) => s + Number(l.allocated_amount ?? 0), 0)
  // Chênh lệch thu, không phải "còn thiếu": tiền mặt và mệnh giá tất toán là hai số riêng.
  const remaining = totalReceipt + offsetAmt - totalAllocated
  const isFullyAllocated = totalAllocated > 0

  return (
    <aside className="sticky top-6 flex w-80 flex-col gap-6 self-start">
      <div className="border-border-1 rounded-lg border bg-white p-5 shadow-sm">
        <div className="hd">
          <h4>Tổng số tiền về</h4>
        </div>
        <div className="flex flex-col pt-2">
          <div
            className={`text-[26px] font-bold tracking-tight ${totalReceipt === 0 && !offsetActive ? 'text-data-orange-default' : 'text-data-green-default'}`}
          >
            {formatCurrencyVND(totalReceipt)} ₫
          </div>
          <div className="mt-1 text-[13px] text-gray-500">
            Phiếu{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-gray-800">
              PT-2026-0059
            </code>{' '}
            · {watch('receipt_date') ? formatDate(watch('receipt_date')) : 'Chưa nhập ngày'}
          </div>

          <div className="divide-border-1 mt-4 flex flex-col divide-y divide-dashed">
            <div className="flex items-baseline justify-between py-2 text-[13px]">
              <span className="text-gray-500">Chuyển khoản</span>
              <span className="font-semibold text-gray-900">
                {watch('bank_on') ? formatCurrencyVND(bankAmt) : '—'} ₫
              </span>
            </div>
            <div className="flex items-baseline justify-between py-2 text-[13px]">
              <span className="text-gray-500">Tiền mặt</span>
              <span className="font-semibold text-gray-900">
                {watch('cash_on') ? formatCurrencyVND(cashAmt) : '—'} ₫
              </span>
            </div>
            {offsetActive && (
              <div className="flex items-baseline justify-between py-2 text-[13px]">
                <span className="flex items-center gap-1 text-gray-500">
                  <IconStack className="h-3 w-3" /> Cấn trừ
                </span>
                <span className="font-semibold text-gray-900">
                  {formatCurrencyVND(offsetAmt)} ₫
                </span>
              </div>
            )}
          </div>
          {offsetActive && (
            <div className="bg-red-10 border-red-30 mt-2.5 rounded border p-2.5">
              <div className="text-xs font-semibold text-gray-700">Tổng giá trị xử lý</div>
              <div className="mt-0.5 text-lg font-bold text-gray-900">
                {formatCurrencyVND(totalReceipt + offsetAmt)} ₫
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                = {formatCurrencyVND(totalReceipt)}{' '}
                {paymentMethod === APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYMENT_METHOD.CASH
                  ? 'tiền mặt'
                  : 'chuyển'}{' '}
                + {formatCurrencyVND(offsetAmt)} cấn trừ
              </div>
            </div>
          )}
        </div>
      </div>

      {currentStep >= 2 && (
        <div className="border-border-1 rounded-lg border bg-white p-5 shadow-sm">
          <div className="hd mb-3">
            <h4>Phân bổ</h4>
          </div>
          {(() => {
            const totalSelectedLines = selectedInvoices.reduce(
              (sum, inv) => sum + (inv.lines?.length ?? 0),
              0
            )
            const totalSelectedAmount = selectedInvoices.reduce(
              (sum, inv) => sum + Number(inv.total_amount_with_vat ?? inv.total_amount ?? 0),
              0
            )
            return (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Hóa đơn đã chọn</span>
                  <span className="font-semibold text-gray-900">{selectedInvoices.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Căn đã chọn</span>
                  <span className="font-semibold text-gray-900">{totalSelectedLines}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Tổng tiền HĐ (VAT)</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrencyVND(totalSelectedAmount)} ₫
                  </span>
                </div>
                <div className="border-border-1 my-1 border-t border-dashed" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Mệnh giá tất toán</span>
                  <span
                    className={`font-semibold ${isFullyAllocated ? 'text-data-green-default' : 'text-gray-900'}`}
                  >
                    {formatCurrencyVND(totalAllocated)} ₫
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Chênh lệch thu</span>
                  <span
                    className={`font-semibold ${remaining === 0 ? 'text-data-green-default' : 'text-data-orange-default'}`}
                  >
                    {formatCurrencyVND(remaining)} ₫
                  </span>
                </div>
                {remaining !== 0 && (
                  <div className="bg-red-10 border-red-30 mt-3 rounded border p-2.5 text-xs leading-normal text-red-800">
                    <p className="text-red-80 mb-1 flex items-center gap-1.5 font-semibold">
                      ⚠ Số tiền phân bổ chưa khớp
                    </p>
                    {remaining > 0 ? (
                      <span>
                        Còn dư <b>{formatCurrencyVND(remaining)} ₫</b> chưa phân bổ hết. Vui lòng
                        phân bổ toàn bộ số tiền.
                      </span>
                    ) : (
                      <span>
                        Phân bổ vượt quá <b>{formatCurrencyVND(Math.abs(remaining))} ₫</b> so với
                        tổng tiền thực tế nhận.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {currentStep >= 2 && selectedInvoices.length > 0 && (
        <div className="border-border-1 rounded-lg border bg-white p-5 shadow-sm">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Cập nhật sẽ áp dụng</h4>
          </div>
          {(() => {
            const formInvoices: any[] = watch('invoices') ?? []
            let willBePaid = 0
            let willBePartial = 0
            for (const inv of selectedInvoices) {
              const currentPaid = Number(inv.paid_amount ?? 0)
              const allocated = Number(
                formInvoices.find((fi) => fi.sales_invoice === inv.id)?.allocated_amount ?? 0
              )
              const total = Number(inv.total_amount_with_vat ?? inv.total_amount ?? 0)
              const afterPayment = currentPaid + allocated
              if (total > 0) {
                if (afterPayment >= total) willBePaid++
                else if (afterPayment > 0) willBePartial++
              }
            }
            const commPeriodLabel = accountingPeriodLabel ?? null
            return (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[13px]">
                  <IconCheck className="text-data-green-default h-3.5 w-3.5" />
                  <span className="text-gray-700">
                    <b className="font-semibold">{willBePaid}</b> HĐ
                  </span>
                  <span className="ml-auto">
                    <Chip
                      variant={ColoredValueVariant.GREEN}
                      type="contained"
                      label="Đã thanh toán"
                    />
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="h-3.5 w-3.5 text-center text-gray-400">·</span>
                  <span className="text-gray-700">
                    <b className="font-semibold">{willBePartial}</b> HĐ
                  </span>
                  <span className="ml-auto">
                    <Chip
                      variant={ColoredValueVariant.ORANGE}
                      type="contained"
                      label="Thanh toán 1 phần"
                    />
                  </span>
                </div>
                {commPeriodLabel && (
                  <div className="flex items-center gap-2 text-[13px] text-gray-500">
                    <span className="h-3.5 w-3.5 text-center text-gray-400">·</span>
                    <span>Đưa vào kỳ kế toán</span>
                    <span className="ml-auto">
                      <Chip
                        variant={ColoredValueVariant.BLUE}
                        type="contained"
                        label={commPeriodLabel}
                      />
                    </span>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </aside>
  )
}
