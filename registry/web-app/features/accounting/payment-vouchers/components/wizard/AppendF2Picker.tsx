import { Button } from '@/components/ui'
import { formatCurrencyVND } from '@/utils/common'
import type { F2InvoiceRow, F2UnitRow } from './CollectF2Panel'

/** This picker stays at invoice grain (it is a compact dialog), so a multi-unit invoice
 *  shows its units as one comma list rather than the wizard's per-unit rows. */
function uniqueLabels(row: F2InvoiceRow, key: 'projectName' | 'unitNumber'): string {
  const seen: string[] = []
  for (const unit of row.units) {
    const label = (unit[key as keyof F2UnitRow] as string) || ''
    if (label && !seen.includes(label)) seen.push(label)
  }
  return seen.join(', ') || '—'
}

type Props = {
  /** Null until the accountant has asked what is still collectible. */
  candidates: F2InvoiceRow[] | null
  selectedIds: number[]
  isLoading: boolean
  isAppending: boolean
  onOpen: () => void
  onToggle: (id: number) => void
  onToggleAll: () => void
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Pick which of the exchange's remaining invoices to add to this voucher.
 *
 * "Thu thập thêm" used to append every payable invoice at once. That is the wrong default
 * twice over: the create flow already asks the accountant to tick invoices, so the append
 * behaved differently from the collect it continues, and a voucher that swallowed ten
 * invoices when two were wanted could only be fixed by removing them one by one.
 */
export function AppendF2Picker({
  candidates,
  selectedIds,
  isLoading,
  isAppending,
  onOpen,
  onToggle,
  onToggleAll,
  onConfirm,
  onCancel,
}: Props) {
  if (candidates === null) {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="text-content-dark-3 text-[13px]">
          Sàn còn hóa đơn chưa chi thì gom nốt vào chính phiếu này, không phải lập phiếu mới.
        </p>
        <Button
          type="button"
          variant="secondary-border"
          size="small"
          onClick={onOpen}
          disabled={isLoading}
        >
          {isLoading ? 'Đang tìm…' : 'Thu thập thêm'}
        </Button>
      </div>
    )
  }

  if (candidates.length === 0) {
    return (
      <div className="border-border-1 flex items-center justify-between gap-4 rounded-lg border p-3">
        <p className="text-content-dark-3 text-[13px]">
          Sàn này không còn khoản hoa hồng nào chưa nằm trên phiếu chi.
        </p>
        <Button type="button" variant="text" size="small" onClick={onCancel}>
          Đóng
        </Button>
      </div>
    )
  }

  const selected = new Set(selectedIds)
  const allSelected = candidates.every((row) => selected.has(row.id))
  const total = candidates
    .filter((row) => selected.has(row.id))
    .reduce((sum, row) => sum + row.amount, 0)
  const netTotal = candidates
    .filter((row) => selected.has(row.id))
    .reduce((sum, row) => sum + row.netAmount, 0)

  return (
    <div className="border-border-1 flex flex-col gap-3 rounded-lg border p-3">
      <p className="text-content-dark-3 text-[13px]">
        Chọn hóa đơn cần gom thêm vào phiếu này. Số tiền tự tính từ hoa hồng đã duyệt.
      </p>

      <div className="border-border-1 overflow-x-auto rounded-md border">
        <table className="w-full min-w-[480px] border-collapse text-left text-sm tabular-nums">
          <thead>
            <tr className="border-border-1 bg-neutral-20 border-b">
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả"
                  checked={allSelected}
                  onChange={onToggleAll}
                />
              </th>
              <th className="text-content-dark-2 px-3 py-2 font-normal">Hóa đơn</th>
              <th className="text-content-dark-2 px-3 py-2 font-normal">Dự án</th>
              <th className="text-content-dark-2 px-3 py-2 font-normal">Mã căn</th>
              <th className="text-content-dark-2 px-3 py-2 text-right font-normal">
                Chi kỳ này (chưa VAT)
              </th>
              <th className="text-content-dark-2 px-3 py-2 text-right font-normal">
                Chi kỳ này (gồm VAT)
              </th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((row) => (
              <tr key={row.id} className="border-border-1 border-b last:border-b-0">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label={`Chọn ${row.code}`}
                    checked={selected.has(row.id)}
                    onChange={() => onToggle(row.id)}
                  />
                </td>
                <td className="px-3 py-2">
                  <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-800">
                    {row.code}
                  </code>
                </td>
                <td className="text-content-dark-3 px-3 py-2 text-xs">
                  {uniqueLabels(row, 'projectName')}
                </td>
                <td className="text-content-dark-3 px-3 py-2 text-xs">
                  {uniqueLabels(row, 'unitNumber')}
                </td>
                <td className="text-content-dark-3 px-3 py-2 text-right">
                  {formatCurrencyVND(row.netAmount)}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900">
                  {formatCurrencyVND(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <span className="text-content-dark-3 mr-auto text-[13px]">
          Đã chọn {selected.size}/{candidates.length} hóa đơn · chưa VAT{' '}
          {formatCurrencyVND(netTotal)} ·{' '}
          <b className="text-data-red-default font-semibold">{formatCurrencyVND(total)} ₫</b>
        </span>
        <Button type="button" variant="text" size="small" onClick={onCancel}>
          Huỷ
        </Button>
        <Button
          type="button"
          variant="secondary-border"
          size="small"
          onClick={onConfirm}
          disabled={isAppending || selected.size === 0}
        >
          {isAppending ? 'Đang gom…' : 'Gộp vào phiếu'}
        </Button>
      </div>
    </div>
  )
}
