import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'

import { Table } from '@/components/ui'
import { formatCurrencyVND } from '@/utils'
import { formatPct } from '@/utils/common'
import { formatSummaryCurrency } from '@/utils/table/summary'
import { APP_PATH } from '@/routes'
import type {
  LadDebtReportResponse,
  LadDebtReportRow,
} from '@/features/accounting/reports/services/report-service'
import { RATE_SOURCE_LABELS } from '@/features/report/accounting/lad-debt/lad-debt-filters'

export type LadDebtByDealTableProps = {
  data?: LadDebtReportResponse
  isLoading?: boolean
}

const LadDebtByDealTable = ({ data, isLoading }: LadDebtByDealTableProps) => {
  const rows = data?.rows ?? []
  const totalRecords = rows.length
  const summary = data?.summary

  const columns = useMemo<ColumnDef<LadDebtReportRow>[]>(() => {
    const money = (value: string | null | undefined) =>
      value == null ? '-' : formatCurrencyVND(Number(value))

    return [
      {
        accessorKey: 'deal_code',
        header: 'Mã giao dịch',
        cell: ({ row }) => (
          <Link
            to={APP_PATH.DEAL_DETAIL.replace(':id', String(row.original.deal_id))}
            className="text-action-primary-red-default font-semibold hover:underline"
          >
            {row.original.deal_code}
          </Link>
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
        accessorKey: 'unit_number',
        header: 'Căn',
        cell: ({ row }) => row.original.unit_number || '-',
        meta: { sortable: false },
      },
      {
        accessorKey: 'rate_source',
        header: 'Nguồn mức phí',
        cell: ({ row }) => RATE_SOURCE_LABELS[row.original.rate_source] ?? row.original.rate_source,
        meta: { sortable: false },
      },
      {
        accessorKey: 'lad_batch_code',
        header: 'Lô áp dụng',
        cell: ({ row }) => row.original.lad_batch_code || '-',
        meta: { sortable: false },
      },
      {
        accessorKey: 'pct_agency_fee',
        header: '% HH đại lý',
        // 10 chữ số: cột BE là numeric(14,10) từ 26/08/2026 và formatPct tự bỏ số 0 thừa,
        // nên chặn ở 2 chỉ làm tỷ lệ phân số hiện khác con số thật đang chi.
        cell: ({ row }) => formatPct(row.original.pct_agency_fee, 10),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'pct_investor_bonus',
        header: '% Thưởng CĐT',
        cell: ({ row }) => formatPct(row.original.pct_investor_bonus, 2),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'pct_shared_bonus',
        header: '% Thưởng chia sẻ',
        cell: ({ row }) => formatPct(row.original.pct_shared_bonus, 2),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'expected_amount',
        header: 'Dự kiến',
        cell: ({ row }) => (
          <span className="text-content-dark-1 font-semibold">
            {money(row.original.expected_amount)}
          </span>
        ),
        footer: () => formatSummaryCurrency(summary?.total_expected),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'received_amount',
        header: 'Đã thu',
        cell: ({ row }) => (
          <span className="text-content-dark-1">{money(row.original.received_amount)}</span>
        ),
        footer: () => formatSummaryCurrency(summary?.total_received),
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
        footer: () => formatSummaryCurrency(summary?.total_outstanding),
        meta: { sortable: false, align: 'right' },
      },
    ]
  }, [summary])

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
        // 11 cột nên bảng luôn rộng hơn khung — cùng lý do đã ghi ở
        // ProjectReceivableReportTable: `Table` chỉ dựng HorizontalScrollBar ở nhánh "static".
        disableInnerOverflow={true}
        paginationPosition="static"
        showSummaryRow
        summaryRowCount={totalRecords}
        stickyHeader
      />
    </div>
  )
}

export default LadDebtByDealTable
