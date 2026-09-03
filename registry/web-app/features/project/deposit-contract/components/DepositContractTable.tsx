import { FC, useMemo } from 'react'
import { Table, Chip } from '@/components/ui'
import { ReferenceCode } from '@/components/commons'
import TableError from '@/components/ui/table/TableError'
import { ColumnDef } from '@tanstack/react-table'
import { TableAction } from '@/types/table'
import { ColoredValueVariant } from '@/api/schema'
import { IconEye } from '@/assets/icons'
import { useNavigate, Link } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import {
  DepositContract,
  DepositStatus,
} from '@/features/sales/deposit-contracts/services/deposit-contract-service'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

import { useAbility } from '@/lib/ability'

const getApprovalStatusVariant = (status: string): ColoredValueVariant => {
  switch (status) {
    case 'new':
    case 'draft':
      return ColoredValueVariant.BLUE
    case 'pending_admin':
    case 'pending_accountant':
    case 'pending_manager':
    case 'pending_approval':
    case 'pending_confirm':
      return ColoredValueVariant.YELLOW
    case 'approved':
      return ColoredValueVariant.GREEN
    case 'rejected':
    case 'cancelled':
      return ColoredValueVariant.RED
    default:
      return ColoredValueVariant.GREY
  }
}

export interface DepositContractTableProps {
  data: DepositContract[]
  isLoading?: boolean
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  onSortingChange?: (field: string, direction: 'asc' | 'desc' | null) => void
  pageCount?: number
  currentPage?: number
  pageSize?: number
  totalRecords?: number
  error?: unknown
  className?: string
  paginationPosition?: 'fixed' | 'static' | 'inline'
}

const getStatusVariant = (status: string): ColoredValueVariant => {
  switch (status) {
    case DepositStatus.NEW:
      return ColoredValueVariant.BLUE
    case DepositStatus.PENDING_CONFIRM:
    case DepositStatus.PENDING_MANAGER:
    case DepositStatus.PENDING_ACCOUNTANT:
    case DepositStatus.PENDING_APPROVAL:
    case DepositStatus.PENDING_ADMIN_LEAD:
      return ColoredValueVariant.ORANGE
    case DepositStatus.APPROVED:
      return ColoredValueVariant.GREEN
    case DepositStatus.REJECTED:
    case DepositStatus.ABANDONED:
    case DepositStatus.REFUNDED:
      return ColoredValueVariant.RED
    default:
      return ColoredValueVariant.GREY
  }
}

const DepositContractTable: FC<DepositContractTableProps> = ({
  data,
  isLoading,
  onPaginationChange,
  onSortingChange,
  pageCount = 1,
  currentPage = 1,
  pageSize,
  totalRecords,
  error,
  className,
  paginationPosition,
}) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMapOptions } = useAppConstant({
    module: 'sales',
    keys: [
      APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.STATUS_CHOICES,
      APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.APPROVAL_STATUS_CHOICES,
    ],
  })

  const statusOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.STATUS_CHOICES) || [],
    [keysMapOptions]
  )

  const approvalStatusOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.APPROVAL_STATUS_CHOICES) || [],
    [keysMapOptions]
  )

  const columns: ColumnDef<DepositContract>[] = [
    {
      header: 'Mã hợp đồng',
      accessorKey: 'code',
      meta: { sortable: true, width: 'w-44' },
      cell: ({ row }) => (
        <ReferenceCode
          code={row.getValue('code') as string}
          linkTo={APP_PATH.DEPOSIT_CONTRACT_DETAIL.replace(':id', row.original.id.toString())}
        />
      ),
    },
    {
      // Số phiếu nghiệp vụ (vd 2026-940102), khác `code` là mã hệ thống sinh (vd DC-2026-001894).
      // Nhãn thống nhất với màn Chi tiết + form Sửa — xem docs/ai/domain/sales.md.
      //
      // KHÔNG đặt `sortable` ở bảng này: nó truyền `manualSorting` xuống <Table> nên TanStack tắt
      // `getSortedRowModel`, mà `ProductInventoryDetail` lại không truyền `onSortingChange` — nên
      // bấm tiêu đề sẽ không sắp xếp gì và cũng không báo cho ai. (Bảng danh sách HĐ cọc thì ngược
      // lại: sort client-side, nên cột tương ứng bên đó ĐƯỢC để sortable.)
      header: 'Mã phiếu đặt cọc',
      accessorKey: 'contract_number',
      meta: { width: 'w-44' },
      cell: ({ row }) => row.original.contract_number || '-',
    },
    {
      header: 'Khách hàng',
      accessorKey: 'customer',
      cell: ({ row }) => {
        const customer = row.original.customer_detail
        if (customer) {
          return (
            <Link
              to={APP_PATH.CUSTOMER_MANAGER_DETAIL.replace(':id', String(customer.id))}
              className="text-action-primary-default font-medium hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {customer.name}
            </Link>
          )
        }
        return row.original.cust_full_name || row.original.cust_business_name || '-'
      },
    },
    {
      header: 'Tổng giá trị',
      accessorKey: 'listed_price',
      meta: { sortable: true },
      cell: ({ row }) =>
        row.original.listed_price
          ? formatCurrencyVND(parseFloat(row.original.listed_price as string) || 0)
          : '-',
    },
    {
      header: 'Ngày tạo',
      accessorKey: 'created_at',
      meta: { sortable: true },
      cell: ({ row }) =>
        row.original.created_at ? formatDate(row.original.created_at, 'dd/MM/yyyy') : '-',
    },
    {
      header: 'Trạng thái',
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const label = String(
          statusOptions.find((o: any) => o.value === status)?.label || status || 'Không xác định'
        )
        return <Chip label={label} variant={getStatusVariant(status)} size="small" />
      },
    },
    {
      header: 'Trạng thái phê duyệt',
      accessorKey: 'approval_status',
      size: 220,
      meta: { width: 'w-[220px]' },
      cell: ({ row }) => {
        const status = row.original.approval_status as string
        const label = String(
          approvalStatusOptions.find((o: any) => o.value === status)?.label || 'Không xác định'
        )
        return <Chip label={label} variant={getApprovalStatusVariant(status)} size="small" />
      },
    },
  ]

  const actions: TableAction<DepositContract>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        show: () => ability.can('retrieve', 'deposit_contract'),
        onClick: (item) =>
          navigate(APP_PATH.DEPOSIT_CONTRACT_DETAIL.replace(':id', item.id.toString())),
      },
    ],
    [ability, navigate]
  )

  if (error) return <TableError />

  return (
    <Table<DepositContract>
      bordered={false}
      className={className}
      paginationPosition={paginationPosition}
      columns={columns}
      data={data}
      isLoading={isLoading}
      showActions
      rowActions={actions}
      manualPagination
      pageCount={pageCount}
      currentPageIndex={(currentPage || 1) - 1}
      onPaginationChange={onPaginationChange}
      pageSize={pageSize}
      enableSorting
      manualSorting
      onSortingChange={onSortingChange}
      totalRecords={totalRecords}
    />
  )
}

export default DepositContractTable
