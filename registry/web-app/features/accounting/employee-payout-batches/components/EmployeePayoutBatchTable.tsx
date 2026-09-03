import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconTrash } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { PAGE_SIZE } from '@/constants/table'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND } from '@/utils/common'
import { useAbility } from '@/lib/ability'
import type { EmployeeCommissionPayoutBatch } from '@/features/accounting/employee-payout-batches/services/employee-payout-batch-service'
import { formatPayoutWave } from '@/features/accounting/employee-payout-batches/constants'
import { EmployeePayoutBatchStatusBadge } from './EmployeePayoutBatchStatusBadge'
import type { TableAction, ColumnConfig } from '@/types/table'
import { useColumnConfig } from '@/hooks/useColumnConfig.ts'
import { EmployeePayoutBatchStatus as EmployeeCommissionPayoutBatchStatus } from '@/constants/api-schema-aliases'

type Props = {
  data: EmployeeCommissionPayoutBatch[]
  isLoading: boolean
  error?: unknown
  totalRecords?: number
  pageSize?: number
  pageCount?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  isShowTableColumnConfig?: boolean
  onDelete?: (record: EmployeeCommissionPayoutBatch) => void
}

const EmployeePayoutBatchTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = PAGE_SIZE,
  pageCount = 0,
  currentPageIndex = 0,
  onPaginationChange,
  isShowTableColumnConfig,
  onDelete,
}: Props) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const allColumns = useMemo<ColumnDef<EmployeeCommissionPayoutBatch>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã đợt chi',
        meta: { width: 'w-[150px]', sortable: true, frozen: true },
      },
      {
        id: 'period',
        header: 'Kỳ tháng',
        cell: ({ row }) => `${String(row.original.month).padStart(2, '0')}/${row.original.year}`,
        meta: { width: 'w-[100px]', sortable: false },
      },
      {
        id: 'wave',
        header: 'Đợt chi',
        cell: ({ row }) => formatPayoutWave(row.original.wave),
        meta: { width: 'w-[130px]', sortable: false },
      },
      {
        accessorKey: 'batch_date',
        header: 'Ngày tạo đợt',
        cell: ({ row }) => (row.original.batch_date ? formatDate(row.original.batch_date) : '-'),
        meta: { width: 'w-[140px]', sortable: true },
      },
      {
        id: 'total_amount',
        header: 'Tổng tiền',
        cell: ({ row }) =>
          row.original.total_amount ? formatCurrencyVND(Number(row.original.total_amount)) : '-',
        meta: { width: 'w-[160px]', sortable: false, align: 'right' },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <EmployeePayoutBatchStatusBadge
            status={row.original.status as EmployeeCommissionPayoutBatchStatus}
          />
        ),
        meta: { width: 'w-[150px]', sortable: false },
      },
    ],
    []
  )

  const defaultColumnConfig: ColumnConfig[] = useMemo(
    () => [
      { id: 'code', label: 'Mã đợt chi', visible: true, order: 0 },
      { id: 'period', label: 'Kỳ tháng', visible: true, order: 1 },
      { id: 'wave', label: 'Đợt chi', visible: true, order: 2 },
      { id: 'batch_date', label: 'Ngày tạo đợt', visible: true, order: 3 },
      { id: 'total_amount', label: 'Tổng tiền', visible: true, order: 4 },
      { id: 'status', label: 'Trạng thái', visible: true, order: 5 },
    ],
    []
  )

  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(defaultColumnConfig, {
    storageKey: 'accounting-employee-payout-batches',
  })

  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) => allColumns.find((col) => (col as any).accessorKey === c.id || col.id === c.id))
      .filter(Boolean) as ColumnDef<EmployeeCommissionPayoutBatch>[]
  }, [columnConfig, allColumns])

  const actions: TableAction<EmployeeCommissionPayoutBatch>[] = [
    {
      label: 'Chi tiết',
      icon: <IconEye size={16} />,
      show: () => ability.can('retrieve', 'employeepayoutbatch'),
      onClick: (record) => {
        navigate(APP_PATH.EMPLOYEE_PAYOUT_BATCH_DETAIL.replace(':id', record.id.toString()))
      },
    },
    {
      label: 'Xóa đợt chi',
      icon: <IconTrash size={16} />,
      variant: 'danger',
      show: (record) =>
        ability.can('destroy', 'employeepayoutbatch') &&
        (record.status === EmployeeCommissionPayoutBatchStatus.DRAFT ||
          record.status === EmployeeCommissionPayoutBatchStatus.CANCELLED),
      onClick: (record) => {
        if (onDelete) onDelete(record)
      },
    },
  ]

  if (error) {
    return <TableError />
  }

  return (
    <Table
      data={data}
      columns={visibleColumns}
      showActions
      rowActions={actions}
      isLoading={isLoading}
      totalRecords={totalRecords}
      pageSize={pageSize}
      pageCount={pageCount}
      currentPageIndex={currentPageIndex}
      onPaginationChange={onPaginationChange}
      isShowTableColumnConfig={isShowTableColumnConfig}
      columnConfig={columnConfig}
      onColumnConfigApply={handleApply}
      onColumnConfigReset={handleReset}
      manualPagination
      enablePagination
      disableInnerOverflow
      paginationPosition="static"
      stickyHeader
    />
  )
}

export default EmployeePayoutBatchTable
