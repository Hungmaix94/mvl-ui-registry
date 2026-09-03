import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import type { components } from '@/api/schema.ts'
import { APP_PATH } from '@/routes'
import { formatCurrencyVND } from '@/utils/common.ts'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { useAbility } from '@/lib/ability.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'

type ContractTypeListItem = components['schemas']['ContractTypeList']

type ContractTypeTableProps = {
  data: ContractTypeListItem[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteContractType?: (contractType: ContractTypeListItem) => void
  onClearFilter?: () => void
  hasFilter: boolean
}

const ContractTypeTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteContractType,
  onClearFilter,
  hasFilter,
}: ContractTypeTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_EMPLOYEE_TYPE_CHOICES],
  })
  const employeeTypeLabelMap = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_TYPE_EMPLOYEE_TYPE_CHOICES) || {},
    [keysMap]
  )

  // Define columns according to Figma design
  const columns: ColumnDef<ContractTypeListItem>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã loại hợp đồng',
        meta: {
          width: 'w-[150px]',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const code = getValue() as string | null
          return (
            <span className="text-content-dark-1 text-sm" title={code || ''}>
              {code || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'name',
        header: 'Tên loại hợp đồng',
        meta: {
          width: '250px',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const name = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm" title={name || ''}>
              {name || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'employee_type',
        header: 'Loại nhân viên',
        meta: {
          width: 'w-[150px]',
        },
        cell: ({ row }) => {
          const raw = row.original.employee_type || row.original.colored_employee_type?.value
          const label = raw ? employeeTypeLabelMap[raw] || raw : '-'
          return (
            <span className="text-content-dark-1 text-sm" title={label}>
              {label}
            </span>
          )
        },
      },
      {
        accessorKey: 'duration_display',
        header: 'Thời hạn hợp đồng',
        meta: {
          width: 'w-[150px]',
        },
        cell: ({ getValue }) => {
          const duration = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm" title={duration || ''}>
              {duration || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Ngày tạo',
        meta: {
          width: 'flex-1',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const date = getValue() as string | null
          if (!date) return <span className="text-content-dark-1 text-sm">-</span>
          try {
            const formattedDate = format(new Date(date), DATE_FORMAT)
            return (
              <span className="text-content-dark-1 text-sm" title={formattedDate}>
                {formattedDate}
              </span>
            )
          } catch {
            return <span className="text-content-dark-1 text-sm">-</span>
          }
        },
      },
      {
        accessorKey: 'base_salary',
        header: 'Mức lương cơ bản',
        meta: {
          width: 'w-[150px]',
          align: 'right',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const salary = getValue() as string | null
          if (!salary) return <span className="text-content-dark-1 text-sm">-</span>
          const numValue = parseFloat(salary)
          if (isNaN(numValue)) return <span className="text-content-dark-1 text-sm">-</span>
          const formatted = formatCurrencyVND(numValue)
          return (
            <span className="text-content-right text-sm" title={formatted}>
              {formatted}
            </span>
          )
        },
      },
    ],
    [employeeTypeLabelMap]
  )

  // Define row actions
  const actions: TableAction<ContractTypeListItem>[] = useMemo(
    () => [
      // View detail
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.CONTRACT_TYPE_DETAIL.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('retrieve', 'contract_type'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.CONTRACT_TYPE_EDIT.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('update', 'contract_type'),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeleteContractType?.(record)
        },
        show: () => ability.can('destroy', 'contract_type'),
      },
    ],
    [onDeleteContractType, navigate, ability]
  )

  if (error) {
    return <TableError />
  }

  return (
    <Table
      data={data}
      columns={columns}
      showSTT
      showActions
      rowActions={actions}
      enableSorting
      enablePagination
      manualPagination
      manualSorting
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      className="flex-1"
    />
  )
}

export default ContractTypeTable
