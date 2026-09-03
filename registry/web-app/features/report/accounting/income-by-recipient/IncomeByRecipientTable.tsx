import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'

import { Table } from '@/components/ui'
import { formatCurrencyVND } from '@/utils'
import { formatSummaryCurrency } from '@/utils/table/summary'
import { APP_PATH } from '@/routes'
import useStickyTableHeader from '@/hooks/useStickyTableHeader'
import type { IncomeByRecipientRow } from '@/features/accounting/reports/services/report-service'

export type IncomeByRecipientTotals = {
  gross: number
  bhxh: number
  pit: number
  net: number
}

/** Scope cho `useStickyTableHeader` — bảng nào header nấy, không bắt nhầm container khác. */
const TABLE_SCOPE_CLASS = 'js-income-by-recipient-table'

type IncomeByRecipientTableProps = {
  /** Chỉ các dòng của TRANG hiện tại — endpoint không phân trang nên trang tự cắt lát. */
  rows: IncomeByRecipientRow[]
  /**
   * Totals over the whole filtered set. The endpoint is not paginated, so the page derives
   * these from every row it received — they are the filter's totals, not a page's.
   */
  totals: IncomeByRecipientTotals
  isLoading?: boolean
  pageSize: number
  /**
   * Tổng số bản ghi của CẢ bộ lọc, không phải số dòng đang hiển thị. Dòng "TỔNG CỘNG" và
   * pagination cùng đọc số này, nếu truyền `rows.length` thì nhãn tổng sẽ đọc ra đúng bằng
   * page size (lỗi CR 86eyj435u).
   */
  totalRecords: number
  pageCount: number
  currentPageIndex: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
}

export default function IncomeByRecipientTable({
  rows,
  totals,
  isLoading,
  pageSize,
  totalRecords,
  pageCount,
  currentPageIndex,
  onPaginationChange,
}: IncomeByRecipientTableProps) {
  // `thead` neo vào `.rt-ScrollAreaViewport` của Radix (không bao giờ cuộn) nên `position: sticky`
  // một mình là vô dụng ở đây — offset phải do JS lái. Re-sync theo `rows` vì đổi trang là thay
  // node `thead`.
  useStickyTableHeader(`.${TABLE_SCOPE_CLASS}`, rows)

  const columns = useMemo<ColumnDef<IncomeByRecipientRow>[]>(
    () => [
      {
        accessorKey: 'recipient_name',
        header: 'Người nhận',
        cell: ({ row }) => {
          const name = row.original.recipient_name
          const recipientId = row.original.recipient_id
          const isEmployee = row.original.recipient_type === 'EMPLOYEE'
          if (!isEmployee) {
            // Collaborator (CTV): no employee detail page — show name with a CTV tag.
            return (
              <span className="inline-flex items-center gap-2">
                {name}
                <span className="text-content-dark-3 bg-neutral-20 rounded px-1.5 py-0.5 text-[10px] font-medium">
                  CTV
                </span>
              </span>
            )
          }
          return recipientId ? (
            <Link
              to={APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(recipientId))}
              className="text-action-primary-default font-medium hover:underline"
            >
              {name}
            </Link>
          ) : (
            name
          )
        },
        meta: { sortable: false },
      },
      {
        accessorKey: 'gross',
        header: 'Tổng tiền',
        cell: ({ row }) => (
          <span className="font-medium">{formatCurrencyVND(Number(row.original.gross || 0))}</span>
        ),
        footer: () => formatSummaryCurrency(totals.gross),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'bhxh',
        header: 'BHXH',
        cell: ({ row }) => (
          <span className="text-red-600">{formatCurrencyVND(Number(row.original.bhxh || 0))}</span>
        ),
        footer: () => <span className="text-red-600">{formatSummaryCurrency(totals.bhxh)}</span>,
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'pit',
        header: 'Thuế TNCN',
        cell: ({ row }) => (
          <span className="text-red-600">{formatCurrencyVND(Number(row.original.pit || 0))}</span>
        ),
        footer: () => <span className="text-red-600">{formatSummaryCurrency(totals.pit)}</span>,
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'net',
        header: 'Tổng tiền nhận',
        cell: ({ row }) => (
          <span className="font-semibold text-green-700">
            {formatCurrencyVND(Number(row.original.net || 0))}
          </span>
        ),
        footer: () => <span className="text-green-700">{formatSummaryCurrency(totals.net)}</span>,
        meta: { sortable: false, align: 'right' },
      },
    ],
    [totals]
  )

  return (
    <Table
      className={TABLE_SCOPE_CLASS}
      data={rows}
      columns={columns}
      isLoading={isLoading}
      showSTT={true}
      // Cột STT phải KHÔNG đông cứng thì `TableFooter` mới gộp được nó vào ô "TỔNG CỘNG"
      // (`canMergeInto` cấm gộp qua cột đông cứng — ô gộp chỉ mang được một offset sticky,
      // vùng ghim của tfoot sẽ rộng hơn thead/tbody và đè lên nội dung khi cuộn ngang).
      sttFrozen={false}
      enablePagination
      manualPagination
      totalRecords={totalRecords}
      pageSize={pageSize}
      pageCount={pageCount}
      currentPageIndex={currentPageIndex}
      onPaginationChange={onPaginationChange}
      // Cặp bắt buộc đi với nhau: scroll do wrapper của page lo, còn `Table` render khối
      // fixed bottom (thanh kéo ngang + pagination) và ĐO nó — chính số đo đó nâng dòng
      // "TỔNG CỘNG" lên trên pagination thay vì để nó nằm đè.
      disableInnerOverflow={true}
      paginationPosition="static"
      emptyMessage="Không có dữ liệu cho kỳ báo cáo này"
      bordered
      showSummaryRow
      summaryRowCount={totalRecords}
      stickyHeader
    />
  )
}
