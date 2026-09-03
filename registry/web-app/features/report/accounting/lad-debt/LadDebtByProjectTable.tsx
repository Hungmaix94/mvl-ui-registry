import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'

import { Table } from '@/components/ui'
import { formatCurrencyVND } from '@/utils'
import { formatSummaryCurrency, sumRowsByKeys } from '@/utils/table/summary'
import { APP_PATH } from '@/routes'
import type {
  LadDebtProjectReportResponse,
  LadDebtProjectReportRow,
} from '@/features/accounting/reports/services/report-service'

export type LadDebtByProjectTableProps = {
  data?: LadDebtProjectReportResponse
  isLoading?: boolean
}

const LadDebtByProjectTable = ({ data, isLoading }: LadDebtByProjectTableProps) => {
  const rows = data?.rows ?? []
  const totalRecords = rows.length

  // Rollup không trả kèm summary (không có view=deal's `summary`) — tự cộng từ các dòng dự án,
  // đúng bằng SUM của rows đang hiển thị (không phải re-resolve, AC-6).
  const totals = useMemo(
    () =>
      sumRowsByKeys(rows as unknown as Record<string, unknown>[], [
        'expected_amount',
        'received_amount',
        'outstanding_amount',
      ]),
    [rows]
  )

  const columns = useMemo<ColumnDef<LadDebtProjectReportRow>[]>(() => {
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
              className="text-action-primary-red-default font-semibold hover:underline"
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
        accessorKey: 'expected_amount',
        header: 'Dự kiến',
        cell: ({ row }) => (
          <span className="text-content-dark-1 font-semibold">
            {money(row.original.expected_amount)}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.expected_amount),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'received_amount',
        header: 'Đã thu',
        cell: ({ row }) => (
          <span className="text-content-dark-1">{money(row.original.received_amount)}</span>
        ),
        footer: () => formatSummaryCurrency(totals.received_amount),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'outstanding_amount',
        header: 'Còn lại',
        cell: ({ row }) => (
          <span className="text-action-primary-red-default font-semibold">
            {money(row.original.outstanding_amount)}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.outstanding_amount),
        meta: { sortable: false, align: 'right' },
      },
    ]
  }, [totals])

  return (
    <div className="border-border-1">
      <Table
        data={rows}
        columns={columns}
        isLoading={isLoading}
        showSTT={false}
        enablePagination={false}
        manualPagination={true}
        totalRecords={totalRecords}
        emptyMessage="Không có dữ liệu"
        bordered
        showSummaryRow
        summaryRowCount={totalRecords}
        disableInnerOverflow
        paginationPosition="static"
        stickyHeader
      />
    </div>
  )
}

export default LadDebtByProjectTable
