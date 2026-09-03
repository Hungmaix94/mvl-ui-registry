import { useMemo } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'

import { Table } from '@/components/ui'
import { ReferenceCode } from '@/components/commons'
import { APP_PATH } from '@/routes'
import { formatCurrencyVND } from '@/utils'
import { formatSummaryCurrency } from '@/utils/table/summary'
import { formatPctFloor } from '@/utils/common'
import { IconCaretright, IconCaretdown } from '@/assets/icons'
import { formatDate } from '@/utils/date-utils'
import type {
  InvestorInvoiceReportResponse,
  InvestorInvoiceReportRow,
  InvestorInvoiceReportSummary,
} from '@/features/accounting/reports/services/report-service'

type InvestorInvoiceReconciliationReportTableProps = {
  data?: InvestorInvoiceReportResponse
  isLoading?: boolean
  pageSize: number
  currentPageIndex: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
  /**
   * Column totals over the WHOLE filtered set, from the `/summary/` sibling endpoint. This
   * report is server-paginated, so `data` is one page — summing it here would report the
   * page's total as the filter's.
   */
  summary?: InvestorInvoiceReportSummary
  /**
   * Deals behind `summary` (`row_count`) — NOT `summary.invoice_count`, which counts
   * invoices. The table lists one row per deal.
   */
  summaryRowCount?: number
}

/**
 * Every money column here is PRE-VAT off one base ("Doanh thu đối chiếu" =
 * tổng phí + thưởng MVL nhận từ CĐT), and both "theo HĐ" percentages are derived from
 * that same base, so "thành tiền đối chiếu + còn lại" and "% + % còn lại" always tie out.
 * The VAT face of each invoice lives in the expanded sub-table so a row can still be
 * reconciled against the red bill — it must never be netted against these columns.
 */
const InvestorInvoiceReconciliationReportTable = ({
  data,
  isLoading,
  pageSize,
  currentPageIndex,
  onPaginationChange,
  summary,
  summaryRowCount,
}: InvestorInvoiceReconciliationReportTableProps) => {
  const tableData = useMemo(() => {
    return data?.results || []
  }, [data])

  // The server paginates (page/page_size); `count` is the unit count across ALL pages, so
  // it — not the current page's length — drives the pager.
  const totalRecords = data?.count ?? 0
  const pageCount = Math.ceil(totalRecords / pageSize) || 1

  const columns = useMemo<ColumnDef<InvestorInvoiceReportRow>[]>(
    () => [
      {
        id: 'expander',
        header: () => null,
        size: 44,
        cell: ({ row }) => {
          const hasInvoices = row.original.invoices && row.original.invoices.length > 0
          if (!hasInvoices) return null
          return (
            <button
              type="button"
              aria-label="Danh sách hóa đơn"
              onClick={(e) => {
                e.stopPropagation()
                row.toggleExpanded()
              }}
              className="p-1 hover:opacity-75"
            >
              {row.getIsExpanded() ? (
                <IconCaretdown className="h-4 w-4" />
              ) : (
                <IconCaretright className="h-4 w-4" />
              )}
            </button>
          )
        },
        meta: { sortable: false, align: 'center' },
      },
      {
        accessorKey: 'unit_number',
        header: 'Mã căn',
        // Links to the deal (chi tiết giao dịch) behind the unit. `deal_id` is the report's
        // own grain so it is always present; guarded anyway so a missing id degrades to a
        // plain code pill instead of a dead link.
        cell: ({ row }) => (
          <ReferenceCode
            code={row.original.unit_number}
            linkTo={
              row.original.deal_id
                ? APP_PATH.DEAL_DETAIL.replace(':id', String(row.original.deal_id))
                : undefined
            }
          />
        ),
        meta: { sortable: false },
      },
      {
        accessorKey: 'project_name',
        header: 'Dự án',
        cell: ({ row }) => row.original.project_name || '-',
        meta: { sortable: false },
      },
      {
        accessorKey: 'fee_calculation_price',
        header: 'Giá tính phí',
        cell: ({ row }) => (
          <span className="">
            {formatCurrencyVND(Number(row.original.fee_calculation_price || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(summary?.summary?.fee_calculation_price),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'reconciliation_amount',
        header: 'Doanh thu đối chiếu',
        cell: ({ row }) => (
          <span className="text-content-dark-1 font-semibold">
            {formatCurrencyVND(Number(row.original.reconciliation_amount || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(summary?.summary?.reconciliation_amount),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'bonus_amount',
        header: 'Thưởng',
        cell: ({ row }) => (
          <span className="text-content-dark-1">
            {formatCurrencyVND(Number(row.original.bonus_amount || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(summary?.summary?.bonus_amount),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'total_reconciliation_pct',
        header: 'Tỷ lệ đã đối chiếu',
        cell: ({ row }) => (
          <span className="text-content-dark-1 font-medium">
            {formatPctFloor(row.original.total_reconciliation_pct)}
          </span>
        ),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'invoiced_reconciliation_pct',
        header: 'Phần trăm đối chiếu (theo HĐ)',
        cell: ({ row }) => (
          <span className="text-content-dark-1 font-medium">
            {formatPctFloor(row.original.invoiced_reconciliation_pct)}
          </span>
        ),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'invoiced_net_amount',
        header: 'Thành tiền đối chiếu (theo HĐ)',
        cell: ({ row }) => (
          <span className="text-content-dark-1 font-medium">
            {formatCurrencyVND(Number(row.original.invoiced_net_amount || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(summary?.summary?.invoiced_net_amount),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'remaining_amount',
        header: 'Còn lại',
        cell: ({ row }) => {
          const remaining = Number(row.original.remaining_amount || 0)
          return (
            <span
              className={
                remaining === 0
                  ? 'text-content-dark-1 font-medium'
                  : 'text-action-primary-red-default font-medium'
              }
            >
              {formatCurrencyVND(remaining)}
            </span>
          )
        },
        footer: () => formatSummaryCurrency(summary?.summary?.remaining_amount),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'remaining_reconciliation_pct',
        header: 'Phần trăm đối chiếu còn lại (theo HĐ)',
        cell: ({ row }) => (
          <span className="text-content-dark-1 font-medium">
            {formatPctFloor(row.original.remaining_reconciliation_pct)}
          </span>
        ),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'total_unrealized_amount',
        header: 'DT chưa về của HĐ đã xuất',
        cell: ({ row }) => (
          <span className="text-action-primary-red-default font-medium">
            {formatCurrencyVND(Number(row.original.total_unrealized_amount || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(summary?.summary?.total_unrealized_amount),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'total_uncollected_revenue',
        header: 'Doanh thu chưa đối chiếu',
        cell: ({ row }) => (
          <span className="text-action-primary-red-default font-semibold">
            {formatCurrencyVND(Number(row.original.total_uncollected_revenue || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(summary?.summary?.total_uncollected_revenue),
        meta: { sortable: false, align: 'right' },
      },
    ],
    [summary]
  )

  const renderRowSubComponent = (row: Row<InvestorInvoiceReportRow>) => {
    const original = row.original
    const invoices = original.invoices ?? []
    const colSpan = row.getVisibleCells().length

    return (
      <tr className="bg-background-2 border-border-1 border-b last:border-b-0">
        <td colSpan={colSpan} className="border-border-1 border-r border-l p-4 align-top">
          <div className="border-border-1 bg-background-1 rounded-md border p-3 shadow-sm">
            <div className="text-content-dark-2 mb-2 text-xs font-semibold">
              Danh sách hóa đơn của căn {original.unit_number}
            </div>
            <div className="overflow-x-auto">
              <table className="border-border-1 w-full min-w-[960px] border-collapse border text-xs">
                <thead>
                  <tr className="bg-background-2 border-border-1 border-b">
                    <th className="text-content-dark-2 border-border-1 border-r px-3 py-2 text-left font-medium whitespace-nowrap">
                      Mã hóa đơn
                    </th>
                    <th className="text-content-dark-2 border-border-1 border-r px-3 py-2 text-left font-medium whitespace-nowrap">
                      Số hóa đơn liên kết
                    </th>
                    <th className="text-content-dark-2 border-border-1 border-r px-3 py-2 text-left font-medium whitespace-nowrap">
                      Ngày xuất hóa đơn
                    </th>
                    <th className="text-content-dark-2 border-border-1 border-r px-3 py-2 text-right font-medium whitespace-nowrap">
                      Số tiền xuất HĐ (chưa VAT)
                    </th>
                    <th className="text-content-dark-2 border-border-1 border-r px-3 py-2 text-right font-medium whitespace-nowrap">
                      Số tiền xuất HĐ (có VAT)
                    </th>
                    <th className="text-content-dark-2 border-border-1 border-r px-3 py-2 text-right font-medium whitespace-nowrap">
                      Đã thu (chưa VAT)
                    </th>
                    <th className="text-content-dark-2 border-border-1 border-r px-3 py-2 text-right font-medium whitespace-nowrap">
                      Tỷ lệ đối chiếu
                    </th>
                    <th className="text-content-dark-2 px-3 py-2 text-right font-medium whitespace-nowrap">
                      DT chưa về tiền
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-content-dark-3 bg-background-1 px-3 py-4 text-center"
                      >
                        Không có hóa đơn
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice, invIdx) => (
                      <tr
                        key={invoice.invoice_id || invIdx}
                        className="border-border-1 bg-background-1 hover:bg-background-2 border-b transition-colors last:border-b-0"
                      >
                        <td className="border-border-1 text-content-dark-1 border-r px-3 py-2 text-left whitespace-nowrap">
                          <ReferenceCode
                            code={invoice.code}
                            linkTo={
                              invoice.invoice_id
                                ? APP_PATH.SALES_INVOICE_DETAIL.replace(
                                    ':id',
                                    String(invoice.invoice_id)
                                  )
                                : undefined
                            }
                          />
                        </td>
                        <td className="border-border-1 text-content-dark-1 border-r px-3 py-2 text-left whitespace-nowrap">
                          {invoice.external_invoice_no || '-'}
                        </td>
                        <td className="border-border-1 text-content-dark-1 border-r px-3 py-2 text-left whitespace-nowrap">
                          {invoice.invoice_date ? formatDate(invoice.invoice_date) : '-'}
                        </td>
                        <td className="border-border-1 text-content-dark-1 border-r px-3 py-2 text-right font-medium whitespace-nowrap">
                          {formatCurrencyVND(Number(invoice.net_amount || 0))}
                        </td>
                        <td className="border-border-1 text-content-dark-3 border-r px-3 py-2 text-right whitespace-nowrap">
                          {formatCurrencyVND(Number(invoice.amount_with_vat || 0))}
                        </td>
                        <td className="border-border-1 text-content-dark-1 border-r px-3 py-2 text-right whitespace-nowrap">
                          {formatCurrencyVND(Number(invoice.paid_amount || 0))}
                        </td>
                        <td className="border-border-1 text-content-dark-1 border-r px-3 py-2 text-right whitespace-nowrap">
                          {formatPctFloor(invoice.reconciliation_pct)}
                        </td>
                        <td className="text-action-primary-red-default px-3 py-2 text-right font-medium whitespace-nowrap">
                          {formatCurrencyVND(Number(invoice.unrealized_amount || 0))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="border-border-1">
      <Table
        data={tableData}
        columns={columns}
        isLoading={isLoading}
        showSTT={false}
        enablePagination={true}
        manualPagination={true}
        totalRecords={totalRecords}
        pageSize={pageSize}
        pageCount={pageCount}
        currentPageIndex={currentPageIndex}
        onPaginationChange={onPaginationChange}
        emptyMessage="Không có dữ liệu"
        renderRowSubComponent={renderRowSubComponent}
        bordered
        disableInnerOverflow={true}
        paginationPosition="static"
        stickyHeader
        showSummaryRow={!!summary}
        summaryRowCount={summaryRowCount}
        className="js-investor-invoice-reconciliation-table"
      />
    </div>
  )
}

export default InvestorInvoiceReconciliationReportTable
