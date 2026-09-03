import type { UseFormWatch } from 'react-hook-form'
import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { IconCheck, IconStack } from '@/assets/icons'
import type { InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'
import type { PaymentVoucherWizardValues } from '../../schemas/payment-voucher-schema'

type Props = {
  watch: UseFormWatch<PaymentVoucherWizardValues>
  currentStep: number
  selectedInvoices: InputInvoice[]
  voucherCode?: string
  /** F2 voucher: the money comes from the collect, not from the manual allocation.
   *  The allocation cards read 0 there and their "chưa khớp" warning is always wrong. */
  hideManualAllocation?: boolean
  /** F2 collect (create): the total to show while no payment method has been picked yet. */
  collectTotal?: number
}

const invoiceTotal = (inv: InputInvoice) =>
  Number(inv.total_amount_with_vat ?? inv.total_amount ?? 0)

export function Sidecar({
  watch,
  currentStep,
  selectedInvoices,
  voucherCode,
  hideManualAllocation = false,
  collectTotal,
}: Props) {
  const bankAmt = watch('bank_on') ? Number(watch('bank_amount') || 0) : 0
  const cashAmt = watch('cash_on') ? Number(watch('cash_amount') || 0) : 0
  const offsetAmt = watch('offset_on') ? Number(watch('offset_amount') || 0) : 0
  const offsetActive = watch('offset_on')
  // During the collect the method is not chosen yet, so bank+cash is 0 while the voucher
  // is worth the collected gross — showing 0 next to a 66.304.545 đ table read as a bug.
  const totalPayment =
    collectTotal !== undefined && collectTotal > 0 ? collectTotal : bankAmt + cashAmt
  const invoices = watch('invoices') ?? []
  const totalAllocated = invoices.reduce((s, l) => s + Number(l.allocated_amount ?? 0), 0)
  const remaining = totalPayment + offsetAmt - totalAllocated
  const isFullyAllocated = totalPayment + offsetAmt > 0 && Math.abs(remaining) < 1

  return (
    <aside className="flex w-full flex-col gap-6 self-start xl:sticky xl:top-6 xl:w-80">
      <div className="border-border-1 rounded-lg border bg-white p-5 shadow-sm">
        <div className="hd">
          <h4>Tổng số tiền chi</h4>
        </div>
        <div className="flex flex-col pt-2">
          <div
            className={`text-[26px] font-bold tracking-tight ${totalPayment === 0 && !offsetActive ? 'text-data-orange-default' : 'text-data-red-default'}`}
          >
            {formatCurrencyVND(totalPayment)} ₫
          </div>
          <div className="mt-1 text-[13px] text-gray-500">
            Phiếu{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-gray-800">
              {voucherCode || 'Phiếu chi mới'}
            </code>{' '}
            · {watch('voucher_date') ? formatDate(watch('voucher_date')) : 'Chưa nhập ngày'}
          </div>

          {collectTotal !== undefined && collectTotal > 0 ? (
            <div className="mt-4 text-[13px] text-gray-500">
              Số tiền tính từ hoa hồng đã duyệt. Chọn hình thức chi khi ghi sổ.
            </div>
          ) : (
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
          )}
          {offsetActive && (
            <div className="bg-red-10 border-red-30 mt-2.5 rounded border p-2.5">
              <div className="text-xs font-medium text-gray-500">Tổng giá trị xử lý</div>
              <div className="mt-0.5 text-lg font-bold text-gray-900">
                {formatCurrencyVND(totalPayment - offsetAmt)} ₫
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                = {formatCurrencyVND(totalPayment)} chuyển - {formatCurrencyVND(offsetAmt)} cấn trừ
              </div>
            </div>
          )}
        </div>
      </div>

      {currentStep >= 2 && !hideManualAllocation && (
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
              (sum, inv) => sum + invoiceTotal(inv),
              0
            )
            return (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Hóa đơn đã chọn</span>
                  <span className="font-semibold text-gray-900">{selectedInvoices.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Dòng HĐ đã chọn</span>
                  <span className="font-semibold text-gray-900">{totalSelectedLines}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Tổng tiền HĐ</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrencyVND(totalSelectedAmount)} ₫
                  </span>
                </div>
                <div className="border-border-1 my-1 border-t border-dashed" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Đã phân bổ</span>
                  <span
                    className={`font-semibold ${isFullyAllocated ? 'text-data-green-default' : 'text-gray-900'}`}
                  >
                    {formatCurrencyVND(totalAllocated)} ₫
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Còn lại</span>
                  <span
                    className={`font-semibold ${remaining === 0 ? 'text-data-green-default' : remaining < 0 ? 'text-data-red-default' : 'text-gray-900'}`}
                  >
                    {formatCurrencyVND(remaining)} ₫
                  </span>
                </div>
                {remaining !== 0 && (
                  <div className="bg-red-10 border-red-30 text-red-80 mt-3 rounded border p-2.5 text-xs leading-normal">
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
                        tổng tiền thực chi.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {currentStep >= 2 && !hideManualAllocation && selectedInvoices.length > 0 && (
        <div className="border-border-1 rounded-lg border bg-white p-5 shadow-sm">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Cập nhật sẽ áp dụng</h4>
          </div>
          {(() => {
            const formInvoices = watch('invoices') ?? []
            let willBePaid = 0
            let willBePartial = 0
            for (const inv of selectedInvoices) {
              const currentPaid = Number(inv.paid_amount ?? 0)
              const allocated = Number(
                formInvoices.find((fi) => fi.input_invoice === inv.id)?.allocated_amount ?? 0
              )
              const total = invoiceTotal(inv)
              const afterPayment = currentPaid + allocated
              if (total > 0) {
                if (afterPayment >= total) willBePaid++
                else if (afterPayment > 0) willBePartial++
              }
            }
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
              </div>
            )
          })()}
        </div>
      )}
    </aside>
  )
}
