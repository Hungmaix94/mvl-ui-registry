import { FC, useMemo } from 'react'
import { Table, Chip } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { ColumnDef } from '@tanstack/react-table'
import { TableAction } from '@/types/table'
import { ColoredValueVariant } from '@/api/schema'
import { IconEye } from '@/assets/icons'
import { useNavigate, Link } from 'react-router-dom'
import { Deal } from '@/features/sales/deals/services/deal-service'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { APP_PATH } from '@/routes'
import { formatDate } from '@/utils/date-utils'
import { useAbility } from '@/lib/ability'
import { formatCurrencyVND } from '@/utils/common'
import DealDetailLink from '@/components/commons/DealDetailLink'

interface SaleAllocationTransactionTableProps {
  data: Deal[]
  isLoading?: boolean
  onPageChange?: (page: number, pageSize?: number) => void
  onSortingChange?: (field: string, direction: 'asc' | 'desc' | null) => void
  pageCount?: number
  currentPage?: number
  totalRecords?: number
  pageSize?: number
  error?: unknown
  className?: string
}

const getStatusVariant = (status: string): ColoredValueVariant => {
  switch (status) {
    case 'open':
    case 'active':
      return ColoredValueVariant.BLUE
    case 'completed':
      return ColoredValueVariant.GREEN
    case 'cancelled':
      return ColoredValueVariant.RED
    default:
      return ColoredValueVariant.GREY
  }
}

type ExtendedDepositContract = NonNullable<Deal['deposit_contract']> & {
  deposit_date?: string | null
  signed_at?: string | null
}

type ExtendedDeal = Deal & {
  sales_allocation?: { name?: string } | null
}

const formatMonthYear = (dateStr?: string | null) => {
  if (!dateStr) return '-'
  return formatDate(dateStr, 'MM/yyyy')
}

const SaleAllocationTransactionTable: FC<SaleAllocationTransactionTableProps> = ({
  data,
  isLoading,
  onPageChange,
  onSortingChange,
  pageCount = 1,
  currentPage = 1,
  pageSize = 25,
  totalRecords,
  error,
  className,
}: SaleAllocationTransactionTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMapOptions } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.DEAL.STATUS_CHOICES],
  })

  const statusOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.SALES.DEAL.STATUS_CHOICES) || [],
    [keysMapOptions]
  )

  const columns: ColumnDef<Deal>[] = [
    {
      header: 'Mã GD',
      accessorKey: 'code',
      meta: { sortable: true, align: 'left', width: 'min-w-[180px]' },
      cell: ({ row }) => (
        <DealDetailLink dealId={row.original.id}>
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">
            {(row.getValue('code') as string) || `DEAL-${row.original.id}`}
          </code>
        </DealDetailLink>
      ),
    },
    {
      header: 'Tên dự án',
      accessorKey: 'project',
      meta: { align: 'left', width: 'min-w-[320px]' },
      cell: ({ row }) => {
        const name =
          row.original.project?.name || (row.original as ExtendedDeal).sales_allocation?.name
        if (!name) return '-'
        return row.original.project?.id ? (
          <Link
            to={APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(row.original.project.id))}
            className="text-action-primary-default font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {name}
          </Link>
        ) : (
          <span>{name}</span>
        )
      },
    },
    {
      header: 'Mã căn',
      accessorKey: 'product_inventory',
      meta: { align: 'left', width: 'min-w-[160px]' },
      cell: ({ row }) => row.original.product_inventory?.unit_number || '-',
    },
    {
      header: 'Tháng cọc',
      id: 'deposit_month',
      meta: { align: 'center', width: 'min-w-[140px]' },
      cell: ({ row }) => {
        const dc = row.original.deposit_contract as ExtendedDepositContract | undefined
        const date =
          dc?.contract_date ||
          dc?.deposit_date ||
          dc?.signed_at ||
          row.original.rate_determination_date
        return formatMonthYear(date)
      },
    },
    {
      header: 'Ngày cọc',
      id: 'deposit_date',
      meta: { align: 'center', width: 'min-w-[140px]' },
      cell: ({ row }) => {
        const dc = row.original.deposit_contract as ExtendedDepositContract | undefined
        const date =
          dc?.contract_date ||
          dc?.deposit_date ||
          dc?.signed_at ||
          row.original.rate_determination_date
        return date ? formatDate(date) : '-'
      },
    },
    {
      header: 'Tình trạng',
      accessorKey: 'status',
      meta: { align: 'center', width: 'min-w-[180px]' },
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const label = String(
          statusOptions.find((o) => o.value === status)?.label || status || 'Không xác định'
        )
        return <Chip label={label} variant={getStatusVariant(status)} size="small" />
      },
    },
    {
      header: 'Tháng làm TTGD',
      id: 'transaction_month',
      meta: { align: 'center', width: 'min-w-[180px]' },
      cell: ({ row }) => formatMonthYear(row.original.rate_determination_date),
    },
    {
      header: 'Tiền hàng',
      accessorKey: 'listed_price',
      meta: { align: 'right', width: 'min-w-[200px]' },
      cell: ({ row }) => {
        const val = row.original.listed_price
        return val ? formatCurrencyVND(Number(val)) : '-'
      },
    },
    {
      header: 'Giá trị tính phí tạm tính (Chưa VAT)',
      id: 'provisional_fee',
      meta: { align: 'right', width: 'min-w-[280px]' },
      cell: ({ row }) => {
        const val = row.original.fee_calculation_price
        return val != null ? formatCurrencyVND(Number(val)) : '-'
      },
    },
    {
      header: 'Tỷ lệ doanh thu',
      id: 'pct_revenue',
      meta: { align: 'right', width: 'min-w-[160px]' },
      cell: ({ row }) => {
        const val = row.original.pct_revenue
        return val != null ? `${Number(val)}%` : '-'
      },
    },
    {
      header: 'Thành tiền doanh thu',
      id: 'amt_revenue',
      meta: { align: 'right', width: 'min-w-[200px]' },
      cell: ({ row }) => {
        const val = row.original.revenue_amount
        return val != null ? formatCurrencyVND(Number(val)) : '-'
      },
    },
    {
      header: 'Tỷ lệ đối chiếu',
      id: 'pct_reconciliation',
      meta: { align: 'right', width: 'min-w-[160px]' },
      cell: ({ row }) => {
        const val = row.original.reconciliation_rate || row.original.agency_fee_rate
        return val != null ? `${Number(val)}%` : '-'
      },
    },
    {
      header: 'Thành tiền đối chiếu',
      id: 'amt_reconciliation',
      meta: { align: 'right', width: 'min-w-[200px]' },
      cell: ({ row }) => {
        const val = row.original.reconciliation_amount || row.original.agency_fee_amount
        return val != null ? formatCurrencyVND(Number(val)) : '-'
      },
    },
  ]

  const actions: TableAction<Deal>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        show: () => ability.can('retrieve', 'deal'),
        onClick: (item) => navigate(APP_PATH.DEAL_DETAIL.replace(':id', String(item.id))),
      },
    ],
    [navigate, ability]
  )

  if (error) return <TableError />

  return (
    <Table<Deal>
      bordered={false}
      columns={columns}
      data={data}
      isLoading={isLoading}
      showActions
      rowActions={actions}
      manualPagination
      pageCount={pageCount}
      currentPageIndex={(currentPage || 1) - 1}
      pageSize={pageSize}
      onPaginationChange={(index: number, size?: number) => onPageChange?.(index + 1, size)}
      enableSorting
      manualSorting
      onSortingChange={onSortingChange}
      totalRecords={totalRecords}
      className={className}
    />
  )
}

export default SaleAllocationTransactionTable
