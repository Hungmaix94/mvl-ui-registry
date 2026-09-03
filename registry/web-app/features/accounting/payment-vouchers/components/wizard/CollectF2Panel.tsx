import { Text } from '@radix-ui/themes'
import { IconCheck } from '@/assets/icons'
import { PAYMENT_SKIP_REASON_LABEL } from '@/features/accounting/input-invoices/constants/payment-voucher-constants'
import type { F2CollectSkipped } from '@/features/accounting/payment-vouchers/services/payment-voucher-service'
import { formatCurrencyVND } from '@/utils/common'

/** One UNIT of an invoice. `amountWithVat` is the gross that leaves the bank; `netAmount`
 *  is the pre-VAT part of it, i.e. what the payout lines book — the difference is the
 *  input VAT. The two `line*` figures belong to the invoice line itself, not to this
 *  instalment. */
export type F2UnitRow = {
  lineId: number
  unitNumber: string
  projectName: string
  lineTotalWithVat: number
  lineRemainingWithVat: number
  netAmount: number
  amountWithVat: number
}

/** An invoice with the units it was cut for. Selection is per INVOICE — the unit rows are
 *  there to be read, which is why the checkbox and the code span them. */
export type F2InvoiceRow = {
  id: number
  code: string
  units: F2UnitRow[]
  amount: number
  netAmount: number
}

type Props = {
  payeeLabel?: string
  isCollecting: boolean
  hasCollected: boolean
  onCollect: () => void
  rows: F2InvoiceRow[]
  skipped: F2CollectSkipped[]
  selectedIds: number[]
  onToggle: (id: number) => void
  onToggleAll: () => void
  total: number
  netTotal: number
}

/**
 * F2 exchange step: collect approved-unpaid commissions, tick which invoices to pay.
 *
 * The amount per invoice is computed server-side (commission net + input VAT), never typed
 * by hand — the accountant only chooses which invoices go on this voucher. "Lưu phiếu chi"
 * (wizard footer) then builds the DRAFT from the ticked invoices.
 */
export function CollectF2Panel({
  payeeLabel,
  isCollecting,
  hasCollected,
  onCollect,
  rows,
  skipped,
  selectedIds,
  onToggle,
  onToggleAll,
  total,
  netTotal,
}: Props) {
  const selected = new Set(selectedIds)
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const someSelected = rows.some((r) => selected.has(r.id))

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[13px] leading-snug text-gray-600">
          Hệ thống gom mọi hoa hồng F2 của{' '}
          <b className="font-semibold text-gray-800">{payeeLabel}</b> đã duyệt chi (kể cả tồn kỳ
          trước). Chọn hóa đơn cần chi rồi bấm <b>Lưu phiếu chi</b> — số tiền tự tính, không nhập
          tay.
        </div>
        <button
          type="button"
          className="bg-data-green-default hover:bg-data-green-default/90 inline-flex shrink-0 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onCollect}
          disabled={isCollecting}
        >
          {isCollecting
            ? 'Đang thu thập...'
            : hasCollected
              ? 'Thu thập lại'
              : 'Thu thập các khoản hoa hồng duyệt chi kỳ này'}
        </button>
      </div>

      {!hasCollected ? (
        <div className="border-border-1 rounded-lg border border-dashed bg-gray-50/40 px-4 py-6 text-center text-sm text-gray-400">
          Bấm "Thu thập" để hệ thống tổng hợp các khoản hoa hồng F2 đủ điều kiện chi.
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          Chưa có khoản hoa hồng nào đủ điều kiện chi cho sàn này.
        </div>
      ) : (
        <>
          <div className="border-border-1 w-full max-w-full overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-border-1 border-b bg-gray-50 text-xs text-gray-600">
                  <th className="w-10 p-2.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer accent-[var(--color-data-green-default)]"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = !allSelected && someSelected
                      }}
                      onChange={onToggleAll}
                    />
                  </th>
                  <th className="p-2.5 font-semibold">Hóa đơn</th>
                  <th className="p-2.5 font-semibold">Dự án</th>
                  <th className="p-2.5 font-semibold">Mã căn</th>
                  <th className="p-2.5 text-right font-semibold">Tiền dòng HĐ</th>
                  <th className="p-2.5 text-right font-semibold">Còn lại của dòng</th>
                  <th className="p-2.5 text-right font-semibold">Chi kỳ này (chưa VAT)</th>
                  <th className="p-2.5 text-right font-semibold">Chi kỳ này (gồm VAT)</th>
                </tr>
              </thead>
              {/* One <tbody> per invoice: the checkbox and the code span its unit rows, so
                  the grain you tick (invoice) stays visually distinct from the grain you
                  read (unit). */}
              {rows.map((row) => (
                <tbody key={row.id} className="border-border-1 border-t">
                  {row.units.map((unit, index) => (
                    <tr
                      key={unit.lineId}
                      className={`${selected.has(row.id) ? '' : 'opacity-50'} ${index > 0 ? 'border-t border-gray-100' : ''}`}
                    >
                      {index === 0 && (
                        <>
                          <td className="p-2.5 align-top" rowSpan={row.units.length}>
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer accent-[var(--color-data-green-default)]"
                              checked={selected.has(row.id)}
                              onChange={() => onToggle(row.id)}
                            />
                          </td>
                          <td className="p-2.5 align-top font-medium text-gray-800" rowSpan={row.units.length}>
                            {row.code}
                          </td>
                        </>
                      )}
                      <td className="p-2.5 text-gray-600">{unit.projectName || '—'}</td>
                      <td className="p-2.5 text-gray-600">{unit.unitNumber || '—'}</td>
                      <td className="p-2.5 text-right text-gray-500">
                        {formatCurrencyVND(unit.lineTotalWithVat)}
                      </td>
                      <td className="p-2.5 text-right text-gray-500">
                        {formatCurrencyVND(unit.lineRemainingWithVat)}
                      </td>
                      <td className="p-2.5 text-right text-gray-600">
                        {formatCurrencyVND(unit.netAmount)}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-gray-900">
                        {formatCurrencyVND(unit.amountWithVat)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
              <tfoot>
                <tr className="border-border-1 bg-green-10/40 border-t">
                  <td colSpan={6} className="p-2.5 text-right text-sm font-semibold text-gray-700">
                    Tổng chi (chưa VAT / gồm VAT)
                  </td>
                  <td className="p-2.5 text-right text-sm font-semibold text-gray-700">
                    {formatCurrencyVND(netTotal)}
                  </td>
                  <td className="text-data-green-default p-2.5 text-right text-base font-bold">
                    {formatCurrencyVND(total)} ₫
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center gap-2 text-[13px] text-gray-500">
            <IconCheck className="text-data-green-default h-4 w-4" />
            Đã chọn {selectedIds.length}/{rows.length} hóa đơn.
          </div>
        </>
      )}

      {skipped.length > 0 && (
        <div className="border-border-1 rounded-lg border bg-gray-50 px-4 py-3">
          <Text size="2" weight="medium" className="text-gray-700">
            Dòng chưa chi được ({skipped.length})
          </Text>
          <ul className="mt-2 flex flex-col gap-1.5">
            {skipped.map((row, index) => (
              <li
                key={`${row.invoice_id ?? 'x'}-${row.input_invoice_line_id ?? index}`}
                className="flex items-start gap-2 text-xs text-gray-600"
              >
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                <span>
                  <strong className="text-gray-800">
                    {row.invoice_code || row.deal_code || `#${row.deal_id ?? '—'}`}
                  </strong>{' '}
                  — {PAYMENT_SKIP_REASON_LABEL[row.reason] ?? row.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
