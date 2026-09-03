import { useMemo } from 'react'
import { Chip, ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { type Customer } from '@/services/sales-service'
import { useAbility } from '@/lib/ability.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { CustomerType as CustomerType } from '@/constants/api-schema-aliases'

type CustomerTableProps = {
  data: Customer[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onDeleteCustomer?: (record: Customer) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const CustomerTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onDeleteCustomer,
  onClearFilter,
  hasFilter,
}: CustomerTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.CUSTOMER.TYPE],
  })

  const customerTypeOptions = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.SALES.CUSTOMER.TYPE)
      ? (keysMap.get(APP_CONSTANT_KEY.SALES.CUSTOMER.TYPE) as Record<string, string> | null) || {}
      : {}
  }, [keysMap])

  const columns: ColumnDef<Customer>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã khách hàng',
        meta: { width: 'w-[150px]' },
      },
      {
        id: 'display_name',
        header: 'Họ tên / Tên công ty',
        cell: ({ row }) => {
          const { customer_type, full_name, business_name } = row.original
          return (customer_type === CustomerType.individual ? full_name : business_name) || '-'
        },
        meta: { width: 'w-[220px]' },
      },
      {
        id: 'display_id_or_tax',
        header: 'CCCD / Mã số thuế',
        cell: ({ row }) => {
          const { customer_type, id_number, business_tax_code } = row.original
          return (customer_type === CustomerType.individual ? id_number : business_tax_code) || '-'
        },
        meta: { width: 'w-[180px]' },
      },
      {
        id: 'display_address',
        header: 'Địa chỉ',
        cell: ({ row }) => {
          const { customer_type, address_detail, business_address } = row.original
          return (
            (customer_type === CustomerType.individual ? address_detail : business_address) || '-'
          )
        },
        meta: { width: 'w-[250px]' },
      },
      {
        accessorKey: 'customer_type',
        header: 'Loại khách hàng',
        cell: ({ getValue }) => {
          const type = getValue() as CustomerType
          const label = customerTypeOptions[type] || type

          return (
            <Chip
              variant={
                type === CustomerType.individual
                  ? ColoredValueVariant.BLUE
                  : ColoredValueVariant.GREEN
              }
              label={label}
            />
          )
        },
        meta: { width: 'w-[150px]' },
      },
    ],
    [customerTypeOptions]
  )

  const rowActions: TableAction<Customer>[] = useMemo(() => {
    const actions: TableAction<Customer>[] = []

    if (ability.can('retrieve', 'customer')) {
      actions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => navigate(`${APP_PATH.CUSTOMER_MANAGER}/${record.id}`),
      })
    }

    if (ability.can('update', 'customer')) {
      actions.push({
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) => navigate(`${APP_PATH.CUSTOMER_MANAGER}/${record.id}/edit`),
      })
    }

    if (ability.can('destroy', 'customer')) {
      actions.push({
        label: 'Xóa',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => onDeleteCustomer?.(record),
      })
    }

    return actions
  }, [ability, navigate, onDeleteCustomer])

  if (error) {
    return <TableError />
  }

  return (
    <Table
      columns={columns}
      data={data}
      isLoading={isLoading}
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1} // table is 0-indexed
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      showSTT
      showActions
      rowActions={rowActions}
      manualPagination
      manualSorting
      disableInnerOverflow
      paginationPosition="static"
      stickyHeader
    />
  )
}

export default CustomerTable
