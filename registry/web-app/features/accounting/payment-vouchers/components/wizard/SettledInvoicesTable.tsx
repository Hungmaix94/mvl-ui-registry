import { Button } from '@/components/ui'
import { IconTrash } from '@/assets/icons'
import { formatCurrencyVND } from '@/utils/common'

/** One settlement tier as the edit screen needs to read it. */
export type SettledInvoiceRow = {
  id?: number
  input_invoice_code?: string | null
  unit_number?: string | null
  project_name?: string | null
  deal_code?: string | null
  f2_reconciliation_code?: string | null
  allocated_amount?: string | null
  net_amount?: string | null
  vat_amount?: string | null
}

const amount = (value?: string | null) => Number(value ?? 0)

/**
 * Read-only view of what a collected F2 voucher already pays.
 *
 * Bước 3 used to say only "phiếu này đã gắn sẵn hóa đơn đầu vào" — true, but it left the
 * accountant unable to see which invoices those were or for how much without leaving the
 * screen. The figures are frozen, so this shows them instead of offering inputs.
 */
export function SettledInvoicesTable({
  rows,
  onRemove,
  removingId,
}: {
  rows: SettledInvoiceRow[]
  /** Omit on read-only screens; the edit screen passes it to offer a way back. */
  onRemove?: (row: SettledInvoiceRow) => void
  removingId?: number | null
}) {
  if (rows.length === 0) return null

  const totalNet = rows.reduce((sum, r) => sum + amount(r.net_amount), 0)
  const totalVat = rows.reduce((sum, r) => sum + amount(r.vat_amount), 0)
  const totalGross = rows.reduce((sum, r) => sum + amount(r.allocated_amount), 0)

  return (
    <div className="border-border-1 w-full overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm tabular-nums">
        <thead>
          <tr className="border-border-1 bg-neutral-20 border-b">
            <th className="text-content-dark-2 px-3 py-2.5 font-normal">Hóa đơn</th>
            <th className="text-content-dark-2 px-3 py-2.5 font-normal">Căn</th>
            <th className="text-content-dark-2 px-3 py-2.5 font-normal">Đối chiếu</th>
            <th className="text-content-dark-2 px-3 py-2.5 text-right font-normal">Thành tiền</th>
            <th className="text-content-dark-2 px-3 py-2.5 text-right font-normal">VAT</th>
            <th className="text-content-dark-2 px-3 py-2.5 text-right font-normal">
              Thành tiền (gồm VAT)
            </th>
            {onRemove && <th className="w-12 px-3 py-2.5" aria-label="Gỡ khỏi phiếu" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id ?? index} className="border-border-1 border-b last:border-b-0">
              <td className="px-3 py-2.5">
                <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-800">
                  {row.input_invoice_code || '—'}
                </code>
                {row.project_name && (
                  <div className="text-content-dark-3 mt-0.5 text-xs">{row.project_name}</div>
                )}
              </td>
              <td className="px-3 py-2.5 font-semibold text-gray-900">
                {row.unit_number || '—'}
                {row.deal_code && (
                  <div className="text-content-dark-3 text-xs font-normal">{row.deal_code}</div>
                )}
              </td>
              <td className="text-content-dark-3 px-3 py-2.5 text-xs">
                {row.f2_reconciliation_code || '—'}
              </td>
              <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                {formatCurrencyVND(amount(row.net_amount))}
              </td>
              <td className="text-content-dark-3 px-3 py-2.5 text-right">
                {formatCurrencyVND(amount(row.vat_amount))}
              </td>
              <td className="text-data-red-default px-3 py-2.5 text-right font-semibold">
                {formatCurrencyVND(amount(row.allocated_amount))}
              </td>
              {onRemove && (
                <td className="px-3 py-2.5 text-right">
                  <Button
                    type="button"
                    variant="text"
                    size="small"
                    iconOnly
                    title="Gỡ hóa đơn này khỏi phiếu"
                    disabled={removingId === row.id}
                    onClick={() => onRemove(row)}
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-neutral-20 border-border-1 border-t">
            <td className="px-3 py-2.5 font-semibold text-gray-900" colSpan={3}>
              Tổng cộng
            </td>
            <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
              {formatCurrencyVND(totalNet)}
            </td>
            <td className="text-content-dark-3 px-3 py-2.5 text-right font-semibold">
              {formatCurrencyVND(totalVat)}
            </td>
            <td className="text-data-red-default px-3 py-2.5 text-right font-semibold">
              {formatCurrencyVND(totalGross)}
            </td>
            {onRemove && <td className="px-3 py-2.5" />}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
