import {
  Control,
  Controller,
  UseFormGetValues,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form'
import { Switch } from '@/components/ui'
import Checkbox from '@/components/ui/checkbox/Checkbox'
import { IconCheck } from '@/assets/icons'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import type { InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'
import type { PaymentVoucherOffsetCandidate } from '../../services/payment-voucher-service'
import { inputInvoiceCounterpartyName } from '../../utils/payment-voucher-wizard-utils'
import type { PaymentVoucherWizardValues } from '../../schemas/payment-voucher-schema'

type Props = {
  control: Control<PaymentVoucherWizardValues>
  setValue: UseFormSetValue<PaymentVoucherWizardValues>
  getValues: UseFormGetValues<PaymentVoucherWizardValues>
  watch: UseFormWatch<PaymentVoucherWizardValues>
  errors: any
  selectedInvoices: InputInvoice[]
  totalAllocated: number
  getInvoiceValue: (
    invoiceId: number,
    field: 'allocated_amount' | 'allocation_pct'
  ) => string | number
  isLoadingCandidates: boolean
  allCandidates: PaymentVoucherOffsetCandidate[]
  totalReceivablesSelected: number
  offsetMatched: number
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
  isLoadingCandidates,
  allCandidates,
  totalReceivablesSelected,
  offsetMatched,
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
                    setValue('offset_receivables', {})
                  }
                }}
              />
            )}
          />
          <span className="text-sm font-semibold text-gray-800">
            Áp dụng cấn trừ cho phiếu chi này
          </span>
          {errors.offset_amount && (
            <span className="bg-red-10 text-data-red-default rounded px-2 py-0.5 text-xs font-medium">
              {errors.offset_amount.message}
            </span>
          )}
        </div>
        {isOffsetOn && (
          <span className="text-xs text-gray-500">
            Số "trả bằng cấn trừ" sẽ được bù vào phải trả của {selectedInvoices.length} HĐ đã chọn —
            phần còn lại mới cần chi tiền.
          </span>
        )}
      </div>

      {isOffsetOn && (
        <div className="animate-in fade-in slide-in-from-top-2 flex flex-col gap-4 duration-300">
          {/* Columns container */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Column 1: Phải trả - HĐ thanh toán đợt này */}
            <div className="border-border-1 flex flex-col gap-3 rounded-lg border bg-gray-50/50 p-4">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5 text-sm text-gray-700">
                  <span className="text-data-red-default">↗</span> Phải trả — HĐ thanh toán đợt này
                </span>
                <span className="text-data-red-default text-sm">
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
                        className="border-border-1 border-l-red-60 flex items-center gap-3 rounded-md border border-l-4 bg-white p-3 shadow-sm"
                      >
                        <div className="border-red-30 bg-red-10 text-data-red-default flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-bold">
                          <IconCheck className="h-3 w-3" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-xs font-semibold text-gray-800">
                            {inv.code}
                          </span>
                          <span className="mt-0.5 truncate text-[10px] text-gray-500">
                            {inv.invoice_date ? formatDate(inv.invoice_date) : '—'} ·{' '}
                            {inputInvoiceCounterpartyName(inv)}
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

            {/* Column 2: Phải thu - HĐ bán cho đối tác */}
            <div className="border-border-1 flex flex-col gap-3 rounded-lg border bg-gray-50/50 p-4">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5 text-sm text-gray-700">
                  <IconCheck className="text-data-green-default h-4 w-4" /> Phải thu — HĐ bán cho
                  đối tác
                </span>
                <span className="text-data-green-default text-sm">
                  {formatCurrencyVND(totalReceivablesSelected)} đ
                </span>
              </div>

              <div className="flex max-h-[220px] flex-col gap-2 overflow-y-auto pr-1">
                {isLoadingCandidates ? (
                  <div className="py-6 text-center text-xs text-gray-400">
                    Đang tải danh sách...
                  </div>
                ) : allCandidates.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400">
                    Không có hóa đơn bán nào có thể cấn trừ cho đối tác này
                  </div>
                ) : (
                  allCandidates.map((c) => {
                    const isChecked = !!(watch('offset_receivables') || {})[c.invoice_id]
                    const candidateRemaining = Math.max(
                      0,
                      Number((c as any).total_amount_with_vat ?? c.total_amount ?? 0) -
                        Number(c.paid_amount || 0)
                    )
                    return (
                      <div
                        key={c.invoice_id}
                        className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 shadow-sm transition-all ${
                          isChecked
                            ? 'border-green-30 border-l-green-60 bg-green-10/30 border-l-4'
                            : 'border-border-1 bg-white hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          const receivables = getValues('offset_receivables') || {}
                          setValue('offset_receivables', {
                            ...receivables,
                            [c.invoice_id]: !isChecked,
                          })
                        }}
                      >
                        <Checkbox
                          checked={isChecked}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={(val) => {
                            const receivables = getValues('offset_receivables') || {}
                            setValue('offset_receivables', {
                              ...receivables,
                              [c.invoice_id]: !!val,
                            })
                          }}
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-xs font-semibold text-gray-800">
                            {c.invoice_code}
                          </span>
                          <span className="mt-0.5 truncate text-[10px] text-gray-500">
                            {c.invoice_date ? formatDate(c.invoice_date) : '—'} · đã thu{' '}
                            {formatCurrencyVND(Number(c.paid_amount || 0))} đ
                          </span>
                        </div>
                        <span className="text-xs font-medium text-gray-700">
                          {formatCurrencyVND(candidateRemaining)} đ
                        </span>
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
                  Phải trả (đợt này)
                </div>
                <div className="text-data-red-default text-sm font-semibold">
                  {formatCurrencyVND(totalAllocated)} đ
                </div>
              </div>
              <div className="text-lg font-light text-gray-400">-</div>
              <div className="col-span-2">
                <div className="mb-1 text-[10px] tracking-wider text-gray-400 uppercase">
                  Phải thu (đã chọn)
                </div>
                <div className="text-data-green-default text-sm font-semibold">
                  {formatCurrencyVND(totalReceivablesSelected)} đ
                </div>
              </div>
              <div className="text-lg font-light text-gray-400">=</div>
              <div className="col-span-2">
                <div className="mb-1 text-[10px] tracking-wider text-gray-400 uppercase">
                  Cấn trừ ngang
                </div>
                <div className="text-data-blue-default text-sm font-bold">
                  {formatCurrencyVND(offsetMatched)} đ
                </div>
              </div>
            </div>

            <div className="my-1 hidden w-px self-stretch bg-gray-200 md:block" />

            <div className="flex flex-col items-center justify-center px-4 md:items-end">
              <span className="mb-1 text-[10px] tracking-wider text-gray-400 uppercase">
                Còn phải chi
              </span>
              <span className="text-base font-bold text-gray-800">
                {formatCurrencyVND(Math.max(0, totalAllocated - offsetMatched))} đ
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
