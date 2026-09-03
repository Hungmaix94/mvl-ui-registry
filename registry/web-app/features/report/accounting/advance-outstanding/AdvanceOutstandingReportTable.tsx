import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Table, Chip } from '@/components/ui'
import { formatCurrencyVND } from '@/utils'
import { formatSummaryCurrency, sumRowsByKeys } from '@/utils/table/summary'
import { ColoredValueVariant } from '@/api/schema'
import {
  AGING_BUCKET,
  AGING_BUCKET_LABEL,
  type AdvanceOutstandingReportResponse,
  type AdvanceOutstandingRow,
  type AgingBucket,
} from './advance-outstanding-types'

const AGING_BUCKET_VARIANT: Record<AgingBucket, ColoredValueVariant> = {
  [AGING_BUCKET.D0_30]: ColoredValueVariant.GREEN,
  [AGING_BUCKET.D31_60]: ColoredValueVariant.YELLOW,
  [AGING_BUCKET.D61_90]: ColoredValueVariant.ORANGE,
  [AGING_BUCKET.D90_PLUS]: ColoredValueVariant.RED,
}

type AdvanceOutstandingReportTableProps = {
  data?: AdvanceOutstandingReportResponse
  isLoading?: boolean
  pageSize: number
  currentPageIndex: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
}

type SummaryTile = {
  label: string
  value: string
  emphasis?: boolean
}

const AdvanceOutstandingReportTable = ({
  data,
  isLoading,
  pageSize,
  currentPageIndex,
  onPaginationChange,
}: AdvanceOutstandingReportTableProps) => {
  const tableData = useMemo(() => data?.results ?? [], [data])

  // The endpoint is not paginated, so `tableData` is the whole filtered set and summing it
  // here yields the filter's total — not a page total.
  const totals = useMemo(
    () => sumRowsByKeys(tableData, ['paid_amount', 'recovered_amount']),
    [tableData]
  )

  // Header summary. `total_outstanding` is server-computed (never re-derived on the client — it is
  // the reconciled "Số tiền cần hoàn ứng" total). Voucher count and oldest age ARE derived here
  // because the endpoint only returns total + rows (FSD §3.1 summary object is not implemented BE-side);
  // both are plain aggregates over the returned recipient-line list, not money math.
  const summary = useMemo<SummaryTile[]>(() => {
    const totalOutstanding = Number(data?.total_outstanding ?? 0)
    const voucherCount = new Set(tableData.map((row) => row.advance_id)).size
    const oldestAgeDays = tableData.reduce((max, row) => Math.max(max, row.age_days ?? 0), 0)
    return [
      {
        label: 'Tổng cần hoàn ứng',
        value: formatCurrencyVND(totalOutstanding),
        emphasis: true,
      },
      { label: 'Số phiếu chưa hoàn', value: `${voucherCount} phiếu` },
      { label: 'Tuổi nợ cũ nhất', value: `${oldestAgeDays} ngày` },
    ]
  }, [data, tableData, totals])

  const totalRecords = tableData.length
  const pageCount = Math.ceil(totalRecords / pageSize) || 1

  const columns = useMemo<ColumnDef<AdvanceOutstandingRow>[]>(
    () => [
      {
        accessorKey: 'advance_code',
        header: 'Mã tạm ứng',
        cell: ({ row }) => row.original.advance_code || '-',
        meta: { sortable: false },
      },
      {
        id: 'employee_code',
        header: 'Mã NV',
        cell: ({ row }) => row.original.employee_code || '-',
        meta: { sortable: false },
      },
      {
        accessorKey: 'recipient_name',
        header: 'Người nhận',
        cell: ({ row }) => row.original.recipient_name || '-',
        meta: { sortable: false },
      },
      {
        id: 'department',
        header: 'Phòng ban',
        cell: ({ row }) => row.original.department || '-',
        meta: { sortable: false },
      },
      {
        id: 'reason',
        header: 'Lý do tạm ứng',
        cell: ({ row }) => row.original.reason || '-',
        meta: { sortable: false },
      },
      {
        accessorKey: 'deal',
        header: 'Deal',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span>{row.original.deal?.code ?? '-'}</span>
            {row.original.deal_cancelled && (
              <Chip label="Deal đã hủy" variant={ColoredValueVariant.RED} size="small" />
            )}
          </div>
        ),
        meta: { sortable: false },
      },
      {
        accessorKey: 'paid_amount',
        header: 'Đã chi',
        cell: ({ row }) => (
          <span className="text-data-green-default font-semibold">
            {formatCurrencyVND(Number(row.original.paid_amount || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.paid_amount),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'recovered_amount',
        header: 'Đã thu hồi',
        cell: ({ row }) => (
          <span className="text-data-blue-default font-semibold">
            {formatCurrencyVND(Number(row.original.recovered_amount || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.recovered_amount),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'outstanding',
        header: 'Còn lại',
        // Server-computed value — never derive on the client.
        cell: ({ row }) => (
          <span className="text-action-primary-red-default font-bold">
            {formatCurrencyVND(Number(row.original.outstanding || 0))}
          </span>
        ),
        // Reconciled total straight from the endpoint, not a client re-derivation.
        footer: () => formatSummaryCurrency(data?.total_outstanding),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'aging_bucket',
        header: 'Tuổi nợ',
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Chip
              label={
                (AGING_BUCKET_LABEL as Record<string, string>)[row.original.aging_bucket] ??
                row.original.aging_bucket
              }
              variant={
                (AGING_BUCKET_VARIANT as Record<string, ColoredValueVariant>)[
                  row.original.aging_bucket
                ] ?? ColoredValueVariant.GREY
              }
              size="small"
            />
          </div>
        ),
        meta: { sortable: false, align: 'center' },
      },
    ],
    []
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="grid shrink-0 grid-cols-1 gap-4 px-7 sm:grid-cols-3">
        {summary.map((tile) => (
          <div
            key={tile.label}
            className="border-border-1 bg-surface-secondary-1 flex flex-col gap-2 rounded-lg border px-6 py-4"
          >
            <span className="typo-body-sm-regular text-content-dark-3">{tile.label}</span>
            <span
              className={
                tile.emphasis
                  ? 'typo-body-lg-semibold text-action-primary-red-default'
                  : 'typo-body-lg-semibold text-content-dark-1'
              }
            >
              {tile.value}
            </span>
          </div>
        ))}
      </div>

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
        showSummaryRow
        summaryRowCount={totalRecords}
      />
    </div>
  )
}

export default AdvanceOutstandingReportTable
