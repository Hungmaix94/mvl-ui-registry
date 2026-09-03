import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Table } from '@/components/ui'
import { Badge } from '@radix-ui/themes'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import type { F2PaymentRow } from '../payment-f2.type'

type Props = {
  data: F2PaymentRow[]
  isLoading: boolean
  error?: Error | null
  totalRecords?: number
  pageSize?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
}

const statusMap: Record<string, { label: string; color: any }> = {
  UNPAID: { label: 'Chưa thanh toán', color: 'gray' },
  PARTIAL: { label: 'Thanh toán một phần', color: 'yellow' },
  PAID: { label: 'Đã thanh toán', color: 'green' },
  CANCELLED: { label: 'Đã hủy', color: 'red' },
}

export const F2PaymentListTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = 25,
  currentPageIndex = 0,
  onPaginationChange,
}: Props) => {
  const columns = useMemo<ColumnDef<F2PaymentRow>[]>(
    () => [
      {
        id: 'project',
        header: 'Dự án',
        cell: ({ row }) => (
          <span className="font-medium text-neutral-900">{row.original.project || '—'}</span>
        ),
        meta: { width: 'w-[150px]' },
      },
      {
        id: 'unit_number',
        header: 'Mã căn',
        cell: ({ row }) => {
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-neutral-900">
                {row.original.unit_number || '—'}
              </span>
              {row.original.deal_code && (
                <span className="mt-0.5 text-[11px] text-neutral-500">
                  Deal: {row.original.deal_code}
                </span>
              )}
            </div>
          )
        },
        meta: { width: 'w-[130px]' },
      },
      {
        id: 'commission_period',
        header: 'Kỳ kế toán',
        cell: ({ row }) =>
          `${row.original.commission_period_month}/${row.original.commission_period_year}`,
        meta: { width: 'w-[100px]' },
      },
      {
        id: 'expected_amount',
        header: 'Hoa hồng',
        cell: ({ row }) => formatCurrencyVND(Number(row.original.expected_amount)),
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        id: 'recipient_name',
        header: 'Tên Đại lý',
        cell: ({ row }) => {
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-neutral-900">{row.original.recipient_name}</span>
              <span className="mt-0.5 text-[11px] text-neutral-500">
                Loại: {row.original.recipient_type === 'EXCHANGE' ? 'Sàn F2' : 'Cộng tác viên'}
              </span>
            </div>
          )
        },
        meta: { width: 'w-[180px]' },
      },
      {
        id: 'actual_amount',
        header: 'Đã thanh toán',
        cell: ({ row }) => formatCurrencyVND(Number(row.original.actual_amount)),
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        id: 'balance',
        header: 'Còn lại',
        cell: ({ row }) => (
          <span className="font-semibold text-orange-600">
            {formatCurrencyVND(Number(row.original.balance))}
          </span>
        ),
        meta: { width: 'w-[140px]', align: 'right' },
      },
      {
        id: 'status',
        header: 'Tình trạng',
        cell: ({ row }) => {
          const config = statusMap[row.original.status] || {
            label: row.original.status,
            color: 'gray',
          }
          return <Badge color={config.color}>{config.label}</Badge>
        },
        meta: { width: 'w-[140px]' },
      },
      {
        id: 'due_date',
        header: 'Hạn TT',
        cell: ({ row }) => {
          if (!row.original.due_date) return '—'
          return (
            <div className="flex flex-col gap-1">
              <span>{formatDate(row.original.due_date, 'DD/MM/YYYY')}</span>
              {row.original.days_overdue > 0 && (
                <span className="text-[11px] text-red-500">
                  Quá hạn {row.original.days_overdue} ngày
                </span>
              )}
            </div>
          )
        },
        meta: { width: 'w-[120px]' },
      },
    ],
    []
  )

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        Có lỗi xảy ra khi tải dữ liệu: {(error as any)?.message || 'Unknown error'}
      </div>
    )
  }

  return (
    <Table
      data={data}
      columns={columns}
      isLoading={isLoading}
      totalRecords={totalRecords}
      pageSize={pageSize}
      currentPageIndex={currentPageIndex}
      onPaginationChange={onPaginationChange}
      pageCount={totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 0}
      enablePagination
      manualPagination
    />
  )
}
