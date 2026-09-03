import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'

import { Table } from '@/components/ui'
import { APP_PATH } from '@/routes'
import { formatPercent } from '@/utils/common'
import { formatCurrencyVND } from '@/utils'
import { formatSummaryCurrency, sumRows } from '@/utils/table/summary'
import type {
  UnitsNotFullyPaidResponse,
  UnitsNotFullyPaidRow,
} from '@/features/accounting/reports/services/report-service'

import { useAbility } from '@/lib/ability'

import { formatMonthPaidCell } from './cell-formatters'
import SaleCell from './SaleCell'

/**
 * Bề rộng từng cột, tính bằng px.
 *
 * `Table` chạy `table-layout: fixed` và ghim `width/minWidth/maxWidth` theo `column.getSize()`,
 * mặc định 150px. Không khai báo thì hai cột danh sách (Sale, Tháng đã chi trả) bị bó ở 150px
 * còn nội dung thì tràn sang cột bên cạnh.
 *
 * Tổng 1280px — cố ý nhỏ hơn bề rộng khung ở màn 1440px (đo được 1315px) để bảng KHÔNG cần
 * cuộn ngang ở breakpoint chính. Quan trọng vì `HorizontalScrollBar` của `Table` không bám
 * được vào container khi bật `disableInnerOverflow`, phần tràn rơi vào viewport của Radix
 * ScrollArea vốn ẩn thanh cuộn native ⇒ cột cuối mất hút mà không có gì báo.
 */
const PERIOD_COLUMN_WIDTH = 110
const PROJECT_COLUMN_WIDTH = 165
const UNIT_COLUMN_WIDTH = 110
const SALE_COLUMN_WIDTH = 290
const UNPAID_PCT_COLUMN_WIDTH = 125
const REMAINING_COLUMN_WIDTH = 145
const NOTE_COLUMN_WIDTH = 150
const MONTH_PAID_COLUMN_WIDTH = 185

type UnitsNotFullyPaidReportTableProps = {
  data?: UnitsNotFullyPaidResponse
  isLoading?: boolean
  pageSize: number
  currentPageIndex: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
}

const UnitsNotFullyPaidReportTable = ({
  data,
  isLoading,
  pageSize,
  currentPageIndex,
  onPaginationChange,
}: UnitsNotFullyPaidReportTableProps) => {
  // Server đã gộp về một dòng cho mỗi (kỳ đối chiếu × BĐS) từ CR STT28+46, FE không gộp lại.
  const tableData = useMemo(() => data?.results || [], [data])

  // Tính 1 lần cho cả bảng, không hỏi lại ở từng ô. Nhân viên MV không cần cờ ở đây vì
  // `EmployeeProfileLink` tự gate `employee.retrieve` bên trong.
  const ability = useAbility()
  const canViewCollaborator = ability.can('retrieve', 'collaborator')
  const canViewExchange = ability.can('retrieve', 'exchange')

  const totalRecords = tableData.length
  const pageCount = Math.ceil(totalRecords / pageSize) || 1

  // The endpoint is not paginated, so `tableData` is the whole filtered set. `unpaid_pct` is a
  // ratio and is deliberately left un-summed.
  const remainingTotal = useMemo(
    () => sumRows(tableData, (row) => row.remaining_comm_amount),
    [tableData]
  )

  const columns = useMemo<ColumnDef<UnitsNotFullyPaidRow>[]>(
    () => [
      {
        accessorKey: 'recon_month',
        header: 'Tháng đối chiếu',
        size: PERIOD_COLUMN_WIDTH,
        cell: ({ row }) => {
          const { recon_month, recon_year } = row.original
          if (recon_month && recon_year) {
            return `${String(recon_month).padStart(2, '0')}/${recon_year}`
          }
          return '—'
        },
        meta: { sortable: false },
      },
      {
        accessorKey: 'project_name',
        header: 'Dự án',
        size: PROJECT_COLUMN_WIDTH,
        cell: ({ row }) => {
          const { project_id, project_name } = row.original
          if (project_id && project_name) {
            return (
              <Link
                to={APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(project_id))}
                className="text-action-primary-default font-medium hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {project_name}
              </Link>
            )
          }
          return project_name || '—'
        },
        meta: { sortable: false },
      },
      {
        accessorKey: 'unit_number',
        header: 'Mã căn',
        size: UNIT_COLUMN_WIDTH,
        cell: ({ row }) => {
          const { unit_number, project_id } = row.original
          if (unit_number) {
            const queryParams = new URLSearchParams()
            queryParams.set('search', unit_number)
            if (project_id) {
              queryParams.set('project_id', String(project_id))
            }
            return (
              <Link
                to={`${APP_PATH.PROJECT_PRODUCT_INVENTORIES}?${queryParams.toString()}`}
                className="text-action-primary-default font-mono font-medium hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {unit_number}
              </Link>
            )
          }
          return '—'
        },
        meta: { sortable: false },
      },
      {
        id: 'sales',
        header: 'Sale',
        size: SALE_COLUMN_WIDTH,
        cell: ({ row }) => (
          // `?? []` chứ không đọc thẳng: thiếu key thì `.length` ném lỗi và trắng cả trang báo
          // cáo, trong khi hiển thị "—" là hỏng đúng một ô.
          <SaleCell
            sales={row.original.sales ?? []}
            canViewCollaborator={canViewCollaborator}
            canViewExchange={canViewExchange}
          />
        ),
        meta: { sortable: false },
      },
      {
        accessorKey: 'unpaid_pct',
        header: 'Tỷ lệ chưa thanh toán',
        size: UNPAID_PCT_COLUMN_WIDTH,
        cell: ({ row }) => (
          <span className="font-semibold text-red-600">
            {formatPercent(row.original.unpaid_pct)}
          </span>
        ),
        meta: { sortable: false, align: 'right' },
      },
      {
        id: 'remaining_comm_amount',
        header: 'Số tiền chưa chi',
        size: REMAINING_COLUMN_WIDTH,
        cell: ({ row }) => (
          <span className="font-bold text-red-600">
            {formatCurrencyVND(Number(row.original.remaining_comm_amount ?? 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(remainingTotal),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        size: NOTE_COLUMN_WIDTH,
        cell: ({ row }) => {
          const { note } = row.original
          return (
            <span className="block truncate" title={note || ''}>
              {note || '—'}
            </span>
          )
        },
        meta: { sortable: false },
      },
      {
        id: 'month_paid_details',
        header: 'Tháng đã chi trả',
        size: MONTH_PAID_COLUMN_WIDTH,
        cell: ({ row }) => {
          const monthPaid = formatMonthPaidCell(row.original.month_paid_details ?? [])
          if (!monthPaid) return '—'
          return (
            <span className="block whitespace-normal" title={monthPaid}>
              {monthPaid}
            </span>
          )
        },
        meta: { sortable: false },
      },
    ],
    [remainingTotal, canViewCollaborator, canViewExchange]
  )

  return (
    <div className="border-border-1">
      <Table
        data={tableData}
        columns={columns}
        isLoading={isLoading}
        showSTT={false}
        enablePagination={true}
        manualPagination={false}
        totalRecords={totalRecords}
        pageSize={pageSize}
        pageCount={pageCount}
        currentPageIndex={currentPageIndex}
        onPaginationChange={onPaginationChange}
        emptyMessage="Không có dữ liệu cho các tiêu chí lọc hiện tại"
        bordered
        disableInnerOverflow={true}
        paginationPosition="static"
        stickyHeader
        className="js-units-not-fully-paid-table"
        showSummaryRow
        summaryRowCount={totalRecords}
      />
    </div>
  )
}

export default UnitsNotFullyPaidReportTable
