import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Table } from '@/components/ui'
import { formatCurrencyVND } from '@/utils'
import { formatSummaryCurrency, sumRows } from '@/utils/table/summary'
import type { F2PaymentListResponse } from '@/features/accounting/reports/services/report-service'

type F2PaymentRow = NonNullable<F2PaymentListResponse['results']>[number]

type ProxyRecipient = {
  type: string
  id: number | null
  code: string | null
  name: string
  amount: number | string
}

// TODO(schema): drop these casts after the next `yarn api:update:local` — BE ships
// total_entitlement / f2_received_amount / redirected_amount / proxy_recipients /
// has_inbound_proxy / project_name / f2_source / f2_source_director_name in report 20.9.
const num = (value: unknown) => Number(value ?? 0)
const entitlementOf = (row: F2PaymentRow) => num((row as any).total_entitlement)
const receivedOf = (row: F2PaymentRow) => num((row as any).f2_received_amount)
const redirectedOf = (row: F2PaymentRow) => num((row as any).redirected_amount)
const proxiesOf = (row: F2PaymentRow): ProxyRecipient[] => (row as any).proxy_recipients ?? []

// `f2_source` mirrors report 20.16b: a director name only exists on a DIRECTOR-sourced
// line, so LINKED/COMPANY fall back to the source label itself.
const F2_SOURCE_LABEL: Record<string, string> = {
  linked: 'Sàn liên kết',
  company: 'Công ty',
  director: 'Giám đốc kinh doanh',
}

const STATUS_LABEL: Record<string, string> = {
  UNPAID: 'Chưa thanh toán',
  PARTIAL: 'Thanh toán một phần',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
}

type F2PaymentReportTableProps = {
  data?: F2PaymentListResponse
  isLoading?: boolean
  pageSize: number
  currentPageIndex: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
}

const F2PaymentReportTable = ({
  data,
  isLoading,
  pageSize,
  currentPageIndex,
  onPaginationChange,
}: F2PaymentReportTableProps) => {
  const tableData = useMemo(() => {
    return data?.results || []
  }, [data])

  const totalRecords = tableData.length
  const pageCount = Math.ceil(totalRecords / pageSize) || 1

  // The endpoint is not paginated, so `tableData` is the whole filtered set — these are the
  // filter's totals, not the current page's.
  const totals = useMemo(
    () => ({
      total_entitlement: sumRows(tableData, entitlementOf),
      f2_received_amount: sumRows(tableData, receivedOf),
      redirected_amount: sumRows(tableData, redirectedOf),
      previously_paid: sumRows(tableData, (row) => row.previously_paid),
      total: sumRows(tableData, (row) => row.total),
      tax_withheld: sumRows(tableData, (row) => row.tax_withheld),
      remaining_balance: sumRows(tableData, (row) => row.remaining_balance),
    }),
    [tableData]
  )

  // The whole point of the three money columns: what F2 is entitled to splits into what
  // F2 itself receives plus what someone received on its behalf. BE guarantees this per
  // row (`f2_payment_report_service` asserts it), so a mismatch in the footer means the
  // API is wrong — surface it instead of silently rendering columns that do not add up.
  // `sumRows` returns null for an empty set, which is not a mismatch — coerce first.
  const partitionBroken =
    Math.abs(
      num(totals.total_entitlement) -
        (num(totals.f2_received_amount) + num(totals.redirected_amount))
    ) > 0.5

  const columns = useMemo<ColumnDef<F2PaymentRow>[]>(
    () => [
      {
        accessorKey: 'payee_exchange_code',
        header: 'Mã Sàn F2',
        cell: ({ row }) => row.original.payee_exchange?.code ?? '-',
        meta: { sortable: false },
      },
      {
        accessorKey: 'payee_exchange_name',
        header: 'Tên Sàn / F2',
        cell: ({ row }) =>
          row.original.payee_exchange?.name ?? (row.original as any).exchange_name ?? '-',
        meta: { sortable: false },
      },
      {
        id: 'project_unit',
        header: 'Dự án / Mã căn',
        cell: ({ row }) => {
          // BE returns the project name and the unit code separately (BRD 20.9 §2.2);
          // `project_unit` is the unit code, NOT the pair.
          const project = (row.original as any).project_name ?? ''
          const unit = row.original.project_unit ?? ''
          if (!project && !unit) return '-'
          return project ? `${project}${unit ? ` - ${unit}` : ''}` : unit
        },
        meta: { sortable: false },
      },
      {
        id: 'sales_f2',
        header: 'Sales F2',
        cell: ({ row }) => {
          const director = (row.original as any).f2_source_director_name
          if (director) return director
          const source = (row.original as any).f2_source
          return source ? (F2_SOURCE_LABEL[source] ?? source) : '-'
        },
        meta: { sortable: false },
      },
      {
        id: 'total_entitlement',
        header: 'Tổng HH F2 được hưởng',
        cell: ({ row }) => (
          <span className="font-semibold text-gray-900">
            {formatCurrencyVND(entitlementOf(row.original))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.total_entitlement),
        meta: { sortable: false, align: 'right' },
      },
      {
        id: 'f2_received_amount',
        header: 'HH F2 nhận',
        cell: ({ row }) => (
          <span className="font-semibold text-gray-900">
            {formatCurrencyVND(receivedOf(row.original))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.f2_received_amount),
        meta: { sortable: false, align: 'right' },
      },
      {
        id: 'proxy_recipients',
        header: 'CTV nhận hộ',
        cell: ({ row }) => {
          const proxies = proxiesOf(row.original)
          if (!proxies.length) return '-'
          // One line per person: several CTV can receive on behalf for the same deal and
          // period, and the accountant needs to see who got how much, not just the total.
          return (
            <div className="flex flex-col gap-0.5">
              {proxies.map((proxy) => (
                <span key={`${proxy.type}-${proxy.id}`} className="whitespace-nowrap">
                  {proxy.name}
                  <span className="text-content-dark-3">
                    {' '}
                    ({formatCurrencyVND(Number(proxy.amount ?? 0))})
                  </span>
                </span>
              ))}
            </div>
          )
        },
        footer: () => formatSummaryCurrency(totals.redirected_amount),
        meta: { sortable: false },
      },
      {
        id: 'previously_paid',
        header: 'Đã thanh toán đợt trước',
        cell: ({ row }) => (
          <span className="text-blue-600">
            {formatCurrencyVND(Number(row.original.previously_paid ?? 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.previously_paid),
        meta: { sortable: false, align: 'right' },
      },
      {
        accessorKey: 'total',
        header: 'Đợt này thanh toán',
        cell: ({ row }) => (
          <span className="font-semibold text-green-600">
            {formatCurrencyVND(Number(row.original.total || 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.total),
        meta: { sortable: false, align: 'right' },
      },
      {
        id: 'tax_withheld',
        header: 'Thuế TNCN/VAT giữ lại',
        cell: ({ row }) => (
          <span className="text-red-600">
            {formatCurrencyVND(Number(row.original.tax_withheld ?? 0))}
          </span>
        ),
        footer: () => formatSummaryCurrency(totals.tax_withheld),
        meta: { sortable: false, align: 'right' },
      },
      {
        id: 'remaining_balance',
        header: 'Còn lại phải trả',
        cell: ({ row }) => {
          const inbound = (row.original as any).has_inbound_proxy === true
          return (
            <span
              className="font-bold text-amber-600"
              // This column is account-wide while `HH F2 nhận` is F2-only. They differ
              // exactly when this exchange ALSO receives on someone else's behalf —
              // say so, or it reads as a broken total.
              title={
                inbound
                  ? 'Sàn này còn đứng tên nhận hộ hoa hồng của người khác, nên số còn lại phải trả lớn hơn phần HH F2 của chính sàn.'
                  : undefined
              }
            >
              {formatCurrencyVND(Number(row.original.remaining_balance ?? 0))}
              {inbound ? ' *' : ''}
            </span>
          )
        },
        footer: () => formatSummaryCurrency(totals.remaining_balance),
        meta: { sortable: false, align: 'right' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const status = row.original.status
          return status ? (STATUS_LABEL[status] ?? status) : '-'
        },
        meta: { sortable: false, align: 'center' },
      },
    ],
    [totals]
  )

  return (
    <div className="border-border-1">
      {partitionBroken && (
        <div className="text-action-primary-red-default px-4 py-2 text-sm">
          Tổng &quot;HH F2 nhận&quot; cộng &quot;CTV nhận hộ&quot; không khớp &quot;Tổng HH F2 được
          hưởng&quot;. Số liệu có thể chưa chính xác — vui lòng báo bộ phận kỹ thuật.
        </div>
      )}
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

export default F2PaymentReportTable
