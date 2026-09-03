import React, { useMemo, useState } from 'react'
import type { components } from '@/api/schema'
import { ReferenceCode } from './ReferenceCode'

/** Shared by SalesInvoice (receipt vouchers) and InputInvoice (payment vouchers). */
export type InvoiceRef = components['schemas']['InvoiceRef']

export interface InvoiceRefListCellProps {
  invoices?: InvoiceRef[] | null
  /** Builds the detail-page URL for a given invoice id. */
  linkTo: (id: number) => string
  fallback?: string
  /** Invoices per stacked row. */
  perRow?: number
  /** Rows shown before collapsing behind "…". */
  maxRows?: number
}

/**
 * Renders the invoice(s) tied to a voucher list row, stacked `perRow` per line.
 * `external_invoice_no` stays empty until the invoice is issued, so each ref falls
 * back to its internal `code`. Past `maxRows` the remaining rows collapse behind a
 * "…" the accountant clicks to expand (a voucher can settle against many invoices
 * in a multi-tier payout, so the column must not blow out the row height by default).
 */
export const InvoiceRefListCell: React.FC<InvoiceRefListCellProps> = ({
  invoices,
  linkTo,
  fallback = '—',
  perRow = 2,
  maxRows = 3,
}) => {
  const [expanded, setExpanded] = useState(false)

  const rows = useMemo(() => {
    const list = invoices ?? []
    const chunks: InvoiceRef[][] = []
    for (let i = 0; i < list.length; i += perRow) {
      chunks.push(list.slice(i, i + perRow))
    }
    return chunks
  }, [invoices, perRow])

  if (rows.length === 0) {
    return <span className="text-gray-400">{fallback}</span>
  }

  const label = (invoice: InvoiceRef) => invoice.external_invoice_no || invoice.code
  const hasOverflow = rows.length > maxRows
  const visibleRows = expanded ? rows : rows.slice(0, maxRows)
  const hiddenCount = rows.slice(maxRows).reduce((sum, row) => sum + row.length, 0)

  return (
    <div className="flex flex-col gap-1">
      {visibleRows.map((row, rowIndex) => (
        <div
          key={row[0].id}
          role="group"
          aria-label={`Hóa đơn dòng ${rowIndex + 1}`}
          className="flex flex-wrap items-center gap-1.5"
        >
          {row.map((invoice) => (
            <ReferenceCode key={invoice.id} code={label(invoice)} linkTo={linkTo(invoice.id)} />
          ))}
        </div>
      ))}
      {hasOverflow && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? 'Thu gọn danh sách hóa đơn' : `Xem thêm ${hiddenCount} hóa đơn`}
          className="w-fit text-xs text-gray-400 hover:text-gray-600 hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Thu gọn' : '…'}
        </button>
      )}
    </div>
  )
}
