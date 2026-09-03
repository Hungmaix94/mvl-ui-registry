import {
  Control,
  Controller,
  UseFormSetValue,
  UseFormGetValues,
  UseFormWatch,
} from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Switch } from '@/components/ui'
import Checkbox from '@/components/ui/checkbox/Checkbox'
import { APP_PATH } from '@/routes'
import { IconCheck } from '@/assets/icons'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import type { SalesInvoice } from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import type { InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'
import type { ReceiptVoucherFormValues } from '../../schemas/receipt-voucher-schema'

type Props = {
  control: Control<ReceiptVoucherFormValues>
  setValue: UseFormSetValue<ReceiptVoucherFormValues>
  getValues: UseFormGetValues<ReceiptVoucherFormValues>
  watch: UseFormWatch<ReceiptVoucherFormValues>
  errors: any
  selectedInvoices: SalesInvoice[]
  totalAllocated: number
  getInvoiceValue: (
    invoiceId: number,
    field: 'allocated_amount' | 'allocation_pct'
  ) => string | number
  isLoadingInputInvoices: boolean
  allInputInvoices: InputInvoice[]
  offsetPayables: Record<number | string, boolean>
  offsetInvoices: any[]
  totalPayablesSelected: number
  horizontalOffset: number
}

export function OffsetSection({
  control,
  setValue,
  getValues,
  watch,
  errors,
  selectedInvoices,
  totalAllocated,
  getInvoiceValue,
  isLoadingInputInvoices,
  allInputInvoices,
  offsetPayables,
  offsetInvoices,
  totalPayablesSelected,
  horizontalOffset,
}: Props) {
  const isOffsetOn = watch('offset_on')

  return (
    <div className="flex flex-col gap-5">
      <div className="border-border-1 flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-3">
          <Controller
            name="offset_on"
            control={control}
            render={({ field }) => (
              <Switch
                checked={field.value}
                onChange={(val) => {
                  field.onChange(val)
                  if (!val) {
                    setValue('offset_amount', '')
                    setValue('offset_payables', {})
                  }
                }}
              />
            )}
          />
          <span className="text-sm font-semibold text-gray-800">
            Áp dụng cấn trừ cho phiếu thu này
          </span>
          {errors.offset_amount && (
            <span className="bg-red-10 text-data-red-default rounded px-2 py-0.5 text-xs font-medium">
              {errors.offset_amount.message}
            </span>
          )}
        </div>
        {isOffsetOn && (
          <span className="text-xs text-gray-500">
            Số "trả bằng cấn trừ" sẽ được bù vào phải thu của {selectedInvoices.length} HĐ đã chọn —
            phần còn lại mới cần chuyển khoản.
          </span>
        )}
      </div>

      {isOffsetOn && (
        <div className="animate-in fade-in slide-in-from-top-2 flex flex-col gap-4 duration-300">
          {/* Columns container */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Column 1: Phải thu - HĐ thanh toán đợt này */}
            <div className="border-border-1 flex flex-col gap-3 rounded-lg border bg-gray-50/50 p-4">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5 text-sm text-gray-700">
                  <IconCheck className="text-data-green-default h-4 w-4" /> Phải thu — HĐ thanh toán
                  đợt này
                </span>
                <span className="text-data-green-default text-sm">
                  {formatCurrencyVND(totalAllocated)} đ
                </span>
              </div>

              <div className="flex max-h-[220px] flex-col gap-2 overflow-y-auto pr-1">
                {selectedInvoices.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400">
                    Chưa chọn hóa đơn nào ở bảng trên
                  </div>
                ) : (
                  selectedInvoices.map((inv) => {
                    const allocatedAmt = Number(getInvoiceValue(inv.id, 'allocated_amount') || 0)
                    return (
                      <div
                        key={inv.id}
                        className="border-border-1 border-l-green-60 flex items-center gap-3 rounded-md border border-l-4 bg-white p-3 shadow-sm"
                      >
                        <div className="border-green-30 bg-green-10 text-data-green-default flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-bold">
                          <IconCheck className="h-3 w-3" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-xs font-semibold text-gray-800">
                            {inv.code}
                          </span>
                          <span className="mt-0.5 truncate text-[10px] text-gray-500">
                            {inv.invoice_date ? formatDate(inv.invoice_date) : '—'} ·{' '}
                            {inv.customer_name || '—'}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-gray-700">
                          {formatCurrencyVND(allocatedAmt)} đ
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
              <span className="mt-1 text-[10px] text-gray-400 italic">
                ① Tự động lấy từ bảng "Hóa đơn được thanh toán" ở trên
              </span>
            </div>

            {/* Column 2: Phải trả - HĐ đầu vào của đối tác */}
            <div className="border-border-1 flex flex-col gap-3 rounded-lg border bg-gray-50/50 p-4">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5 text-sm text-gray-700">
                  <span className="text-data-red-default">↗</span> Phải trả — HĐ đầu vào của đối
                  tác
                </span>
                <span className="text-data-red-default text-sm">
                  {formatCurrencyVND(totalPayablesSelected)} đ
                </span>
              </div>

              <div className="flex max-h-[220px] flex-col gap-2 overflow-y-auto pr-1">
                {isLoadingInputInvoices ? (
                  <div className="py-6 text-center text-xs text-gray-400">
                    Đang tải danh sách...
                  </div>
                ) : allInputInvoices.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400">
                    Không có hóa đơn đầu vào nào cho đối tác này
                  </div>
                ) : (
                  allInputInvoices.map((inv) => {
                    const isChecked = !!offsetPayables[inv.id]
                    const invTotal = Number(inv.total_amount_with_vat ?? inv.total_amount ?? 0)
                    const invPaid = Number(inv.paid_amount ?? 0)
                    const invRemaining = Math.max(0, invTotal - invPaid)
                    const currentOffsetInvoice = offsetInvoices.find(
                      (oi) => Number(oi.input_invoice) === Number(inv.id)
                    )
                    const allocatedOffset = Number(currentOffsetInvoice?.allocated_amount || 0)
                    const remainingAfterOffset = Math.max(0, invRemaining - allocatedOffset)
                    return (
                      <div
                        key={inv.id}
                        className={`flex items-center gap-3 rounded-md border p-3 shadow-sm transition-all ${
                          isChecked
                            ? 'border-red-30 border-l-red-60 bg-red-10/30 border-l-4'
                            : 'border-border-1 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(val) => {
                            const payables = getValues('offset_payables') || {}
                            setValue('offset_payables', {
                              ...payables,
                              [inv.id]: !!val,
                            })
                          }}
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <Link
                            to={APP_PATH.INPUT_INVOICE_DETAIL.replace(':id', String(inv.id))}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-action-primary-red-default truncate text-xs font-semibold text-gray-800 hover:underline"
                            title="Xem chi tiết hóa đơn"
                          >
                            {inv.code}
                          </Link>
                          <span className="mt-0.5 truncate text-[10px] text-gray-500">
                            {inv.invoice_date ? formatDate(inv.invoice_date) : '—'}{' '}
                            {inv.notes ? `· ${inv.notes}` : ''}
                          </span>
                          <span className="mt-0.5 text-[10px] text-gray-400">
                            Dư nợ: {formatCurrencyVND(invRemaining)} đ
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="block text-xs font-medium text-gray-700">
                            {formatCurrencyVND(invTotal)} đ
                          </span>
                          {isChecked && (
                            <span className="text-data-blue-default mt-0.5 block text-[10px] font-semibold">
                              Cấn trừ: {formatCurrencyVND(allocatedOffset)} đ
                            </span>
                          )}
                          {isChecked && (
                            <span className="mt-0.5 block text-[10px] text-gray-500">
                              Còn lại: {formatCurrencyVND(remainingAfterOffset)} đ
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <span className="mt-1 text-[10px] text-gray-400 italic">
                ② Tích chọn những HĐ muốn dùng để bù trừ
              </span>
            </div>
          </div>

          {/* Bottom horizontal offset formula bar */}
          <div className="border-irish-30 bg-irish-10/50 mt-2 flex flex-col items-stretch justify-between gap-4 rounded-lg border p-4 md:flex-row md:items-center">
            <div className="grid flex-1 grid-cols-7 items-center gap-2 text-center text-xs font-medium text-gray-600">
              <div className="col-span-2">
                <div className="mb-1 text-[10px] tracking-wider text-gray-400 uppercase">
                  Phải thu (đợt này)
                </div>
                <div className="text-data-green-default text-sm font-semibold">
                  {formatCurrencyVND(totalAllocated)} đ
                </div>
              </div>
              <div className="text-lg font-light text-gray-400">-</div>
              <div className="col-span-2">
                <div className="mb-1 text-[10px] tracking-wider text-gray-400 uppercase">
                  Phải trả (đã chọn)
                </div>
                <div className="text-data-red-default text-sm font-semibold">
                  {formatCurrencyVND(totalPayablesSelected)} đ
                </div>
              </div>
              <div className="text-lg font-light text-gray-400">=</div>
              <div className="col-span-2">
                <div className="mb-1 text-[10px] tracking-wider text-gray-400 uppercase">
                  Cấn trừ ngang
                </div>
                <div className="text-data-blue-default text-sm font-bold">
                  {formatCurrencyVND(horizontalOffset)} đ
                </div>
              </div>
            </div>

            <div className="my-1 hidden w-px self-stretch bg-gray-200 md:block" />

            <div className="flex flex-col items-center justify-center px-4 md:items-end">
              <span className="mb-1 text-[10px] tracking-wider text-gray-400 uppercase">
                Số tiền phải thu
              </span>
              <span className="text-base font-bold text-gray-800">
                {formatCurrencyVND(Math.max(0, totalAllocated - horizontalOffset))} đ
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
