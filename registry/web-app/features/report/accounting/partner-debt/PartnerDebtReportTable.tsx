import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'

import { Table } from '@/components/ui'
import { cn, formatCurrencyVND } from '@/utils'
import { formatSummaryCurrency, sumRows } from '@/utils/table/summary'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import type {
  PartnerDebtResponse,
  PartnerDebtRow,
} from '@/features/accounting/reports/services/report-service'

const FALLBACK_PAYER_TYPE_LABELS: Record<string, string> = {
  INVESTOR: 'Chủ đầu tư',
  EXCHANGE: 'Sàn liên kết',
}

type PartnerDebtReportTableProps = {
  data?: PartnerDebtResponse
  isLoading?: boolean
  pageSize: number
  currentPageIndex: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
}

/**
 * Regen 2026-07-27 — BE tách mỗi chỉ tiêu thành `{ period, cumulative }`
 * (phát sinh trong kỳ / dư cuối kỳ) thay cho một chuỗi decimal duy nhất.
 * Cột "công nợ" lấy `cumulative` (số còn nợ tại cuối kỳ) — nếu nghiệp vụ muốn
 * số phát sinh trong kỳ thì đổi sang `period`.
 */
type PartnerDebtMetric = { period: string; cumulative: string }

const metricValue = (metric?: PartnerDebtMetric | string | number | null) => {
  if (metric === null || metric === undefined) return 0
  if (typeof metric === 'object') {
    const val = metric.cumulative ?? metric.period
    return Number(val || 0)
  }
  return Number(metric || 0)
}

const moneyCell = (metric?: PartnerDebtMetric | string | number | null) => (
  <span className="font-medium text-gray-900">{formatCurrencyVND(metricValue(metric))}</span>
)

const balanceCell = (metric?: PartnerDebtMetric) => {
  const val = Number(metricValue(metric) || 0)
  return (
    <span
      className={cn(
        'font-semibold',
        val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : 'text-gray-900'
      )}
    >
      {formatCurrencyVND(val)}
    </span>
  )
}

const PartnerDebtReportTable = ({
  data,
  isLoading,
  pageSize,
  currentPageIndex,
  onPaginationChange,
}: PartnerDebtReportTableProps) => {
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE_CHOICES],
  })

  const payerTypeLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE_CHOICES
  ) as Record<string, string> | null

  const getPayerTypeLabel = (value: string | null | undefined): string => {
    if (!value) return '—'
    return payerTypeLabels?.[value] ?? FALLBACK_PAYER_TYPE_LABELS[value] ?? value
  }

  const tableData = useMemo(() => {
    return data?.results || []
  }, [data])

  const totalRecords = tableData.length
  const pageCount = Math.ceil(totalRecords / pageSize) || 1

  // The endpoint is not paginated, so `tableData` is the whole filtered set. Metrics are
  // objects; reuse `metricValue` so the summary reads the same field the cells do.
  const totals = useMemo(
    () => ({
      receivable: sumRows(tableData, (row) => metricValue(row.receivable)),
      payable: sumRows(tableData, (row) => metricValue(row.payable)),
      balance: sumRows(tableData, (row) => metricValue(row.balance)),
    }),
    [tableData]
  )

  const columns = useMemo<ColumnDef<PartnerDebtRow>[]>(
    () => [
      {
        accessorKey: 'partner_name',
        header: 'Đối tác',
        cell: ({ row }) => (
          <span className="font-semibold text-gray-900">{row.original.partner_name || '-'}</span>
        ),
        meta: { sortable: false },
      },
      {
        accessorKey: 'partner_type',
        header: 'Loại đối tác',
        cell: ({ row }) => getPayerTypeLabel(row.original.partner_type),
        meta: { sortable: false },
      },
      {
        accessorKey: 'contact',
        header: 'Liên hệ',
        cell: ({ row }) => row.original.contact || '-',
        meta: { sortable: false },
      },
      {
        id: 'receivable',
        header: 'Phải thu',
        cell: ({ row }) => moneyCell(row.original.receivable),
        footer: () => formatSummaryCurrency(totals.receivable),
        meta: { sortable: false, align: 'right' },
      },
      {
        id: 'payable',
        header: 'Phải trả',
        cell: ({ row }) => moneyCell(row.original.payable),
        footer: () => formatSummaryCurrency(totals.payable),
        meta: { sortable: false, align: 'right' },
      },
      {
        id: 'balance',
        header: 'Công nợ ròng',
        cell: ({ row }) => balanceCell(row.original.balance),
        footer: () => formatSummaryCurrency(totals.balance),
        meta: { sortable: false, align: 'right' },
      },
    ],
    [payerTypeLabels, totals]
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

export default PartnerDebtReportTable
