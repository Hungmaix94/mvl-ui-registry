import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Table } from '@/components/ui'
import { IconEye } from '@/assets/icons'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND } from '@/utils/common'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import {
  MONTHLY_SUMMARY_ACTION,
  MONTHLY_SUMMARY_SUBJECT,
} from '../constants/commission-permissions'
import type { CommPaymentBatch } from '@/features/accounting/commissions/services/comm-payment-service'
import { EmployeePayoutBatchStatusBadge } from '@/features/accounting/employee-payout-batches/components/EmployeePayoutBatchStatusBadge'
import type { TableAction } from '@/types/table'

type Props = {
  data: CommPaymentBatch[]
  isLoading: boolean
  error?: Error | null
  totalRecords?: number
  pageSize?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
}

export const CommPaymentTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = 25,
  currentPageIndex = 0,
  onPaginationChange,
}: Props) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const columns = useMemo<ColumnDef<CommPaymentBatch>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã đợt chi',
        meta: { width: 'w-[160px]', sortable: true, frozen: true },
      },
      {
        id: 'period',
        header: 'Kỳ tháng',
        cell: ({ row }) => `${String(row.original.month).padStart(2, '0')}/${row.original.year}`,
        meta: { width: 'w-[100px]' },
      },
      {
        accessorKey: 'batch_date',
        header: 'Ngày tạo đợt',
        cell: ({ row }) => (row.original.batch_date ? formatDate(row.original.batch_date) : '-'),
        meta: { width: 'w-[140px]' },
      },
      {
        id: 'count',
        header: 'Số lượng',
        cell: ({ row }) => row.original.lines.length,
        meta: { width: 'w-[100px]', align: 'right' },
      },
      {
        id: 'total_amount',
        header: 'Tổng tiền',
        cell: ({ row }) =>
          row.original.total_amount ? formatCurrencyVND(Number(row.original.total_amount)) : '-',
        meta: { width: 'w-[180px]', align: 'right' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <EmployeePayoutBatchStatusBadge status={row.original.status} />,
        meta: { width: 'w-[150px]' },
      },
    ],
    []
  )

  const actions: TableAction<CommPaymentBatch>[] = useMemo(
    () => [
      {
        label: 'Chi tiết',
        icon: <IconEye size={16} />,
        // Điều hướng sang màn DANH SÁCH lọc theo kỳ (`COMM_EMPLOYEE_PAYROLL`), không phải màn
        // chi tiết một bản ghi — nên route khai `.list` và gate phải theo đúng `.list`.
        show: () => ability.can(MONTHLY_SUMMARY_ACTION.LIST, MONTHLY_SUMMARY_SUBJECT.employees),
        onClick: (record: CommPaymentBatch) => {
          const year = record.year
          const month = record.month
          navigate(
            `${APP_PATH.COMM_EMPLOYEE_PAYROLL}?page=1&page_size=25&year=${year}&month=${month}`
          )
        },
      },
    ],
    [ability, navigate]
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
      tableContainerClassName="rounded-lg shadow-sm"
      data={data}
      columns={columns}
      isLoading={isLoading}
      totalRecords={totalRecords}
      pageSize={pageSize}
      currentPageIndex={currentPageIndex}
      onPaginationChange={onPaginationChange}
      pageCount={totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 0}
      showSTT
      enablePagination
      manualPagination
      showActions
      rowActions={actions}
      onRowClick={(record) =>
        navigate(APP_PATH.EMPLOYEE_PAYOUT_BATCH_DETAIL.replace(':id', String(record.id)))
      }
    />
  )
}
