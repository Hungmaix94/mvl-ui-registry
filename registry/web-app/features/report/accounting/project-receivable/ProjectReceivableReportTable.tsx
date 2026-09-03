import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'

import { Table } from '@/components/ui'
import { formatCurrencyVND } from '@/utils'
import { formatSummaryCurrency, sumRowsByKeys } from '@/utils/table/summary'
import { APP_PATH } from '@/routes'
import type {
  ProjectReceivableResponse,
  ProjectReceivableRow,
} from '@/features/accounting/reports/services/report-service'

type ProjectReceivableReportTableProps = {
  data?: ProjectReceivableResponse
  isLoading?: boolean
  pageSize: number
  currentPageIndex: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
}

const ProjectReceivableReportTable = ({
  data,
  isLoading,
  pageSize,
  currentPageIndex,
  onPaginationChange,
}: ProjectReceivableReportTableProps) => {
  const tableData = useMemo(() => {
    return data?.by_project || (data as any)?.data?.by_project || []
  }, [data])

  const totalRecords = tableData.length
  const pageCount = Math.ceil(totalRecords / pageSize) || 1

  // The endpoint is not paginated, so `tableData` is the whole filtered set — these are the
  // filter's totals, not the current page's.
  const totals = useMemo(
    () =>
      sumRowsByKeys(tableData as Record<string, unknown>[], [
        'opening',
        'arising',
        'received',
        'closing',
        'overdue',
        'due',
        'projected',
        'variance',
      ]),
    [tableData]
  )

  const columns = useMemo<ColumnDef<ProjectReceivableRow>[]>(() => {
    const money = (value: string | null | undefined) =>
      value == null ? '-' : formatCurrencyVND(Number(value))

    return [
      {
        accessorKey: 'project_name',
        header: 'Dự án',
        cell: ({ row }) => {
          const projectId = row.original.project_id
          const projectName = row.original.project_name || '-'
          return projectId ? (
            <Link
              to={APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(projectId))}
              className="text-brand-primary-default font-semibold hover:underline"
            >
              {projectName}
            </Link>
          ) : (
            projectName
          )
        },
        meta: { sortable: false },
      },
      {
        accessorKey: 'opening',
        header: 'Đầu kỳ',
        cell: ({ row }) => <span className="text-gray-900">{money(row.original.opening)}</span>,
        footer: () => formatSummaryCurrency(totals.opening),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'arising',
        header: 'Phát sinh trong kỳ',
        cell: ({ row }) => <span className="text-gray-900">{money(row.original.arising)}</span>,
        footer: () => formatSummaryCurrency(totals.arising),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'received',
        header: 'Đã thu',
        cell: ({ row }) => (
          <span className="font-semibold text-green-600">{money(row.original.received)}</span>
        ),
        footer: () => formatSummaryCurrency(totals.received),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'closing',
        header: 'Cuối kỳ',
        cell: ({ row }) => (
          <span className="font-semibold text-red-600">{money(row.original.closing)}</span>
        ),
        footer: () => formatSummaryCurrency(totals.closing),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'overdue',
        header: 'Quá hạn',
        cell: ({ row }) => (
          <span className="font-medium text-red-600">{money(row.original.overdue)}</span>
        ),
        footer: () => formatSummaryCurrency(totals.overdue),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'due',
        header: 'Đến hạn',
        cell: ({ row }) => <span className="text-gray-900">{money(row.original.due)}</span>,
        footer: () => formatSummaryCurrency(totals.due),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'projected',
        header: 'Dự kiến',
        cell: ({ row }) => <span className="text-gray-900">{money(row.original.projected)}</span>,
        footer: () => formatSummaryCurrency(totals.projected),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'variance',
        header: 'Chênh lệch',
        cell: ({ row }) => <span className="text-gray-900">{money(row.original.variance)}</span>,
        footer: () => formatSummaryCurrency(totals.variance),
        meta: { sortable: false, align: 'right' },
      },
    ]
  }, [totals])

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
        emptyMessage="Không có dữ liệu"
        bordered
        // 9 cột tiền nên bảng luôn rộng hơn khung: `Table` chỉ dựng `HorizontalScrollBar`
        // ở nhánh `paginationPosition="static"`, còn viewport của Radix ScrollArea thì
        // giấu thanh cuộn native — để mặc định "fixed" là màn không có thanh kéo ngang nào.
        // `disableInnerOverflow` đi kèm bắt buộc, nếu không sẽ ra hai thanh cuộn chồng nhau.
        disableInnerOverflow={true}
        paginationPosition="static"
        stickyHeader
        showSummaryRow
        summaryRowCount={totalRecords}
      />
    </div>
  )
}

export default ProjectReceivableReportTable
