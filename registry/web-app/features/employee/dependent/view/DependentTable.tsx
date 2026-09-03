import { useMemo, useCallback } from 'react'
import { ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import type { EmployeeDependent } from '@/features/employee/services/employee-dependent-service'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '@/utils/date-utils.ts'
import { useAbility } from '@/lib/ability.ts'

type DependentTableProps = {
  data: EmployeeDependent[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteDependent?: (dependent: EmployeeDependent) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const DependentTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  onPaginationChange,
  onSortingChange,
  onDeleteDependent,
  onClearFilter,
  hasFilter = false,
}: DependentTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  // Define columns
  const columns: ColumnDef<EmployeeDependent>[] = useMemo(
    () => [
      {
        accessorKey: 'employee.code',
        header: 'Mã nhân viên',
        cell: ({ getValue }) => {
          const employeeCode = (getValue() || '-') as EmployeeDependent['employee']['code']
          return (
            <span className="text-content-dark-1 text-sm" title={employeeCode}>
              {employeeCode}
            </span>
          )
        },
        meta: {
          width: '130px',
        },
      },
      {
        accessorKey: 'employee.fullname',
        header: 'Tên nhân viên',
        cell: ({ getValue }) => {
          const employeeName = (getValue() || '-') as EmployeeDependent['employee']['fullname']
          return (
            <span className="text-content-dark-1 text-sm" title={employeeName}>
              {employeeName}
            </span>
          )
        },
        meta: {
          width: '140px',
        },
      },
      {
        accessorKey: 'dependent_name',
        header: 'Tên người phụ thuộc',
        cell: ({ getValue }) => {
          const dependentName = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm" title={dependentName || '-'}>
              {dependentName || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[150px]',
          sortable: true,
        },
      },
      {
        accessorKey: 'relationship_display',
        header: 'Mối quan hệ',
        cell: ({ getValue }) => {
          const relationshipDisplay = getValue() as string | undefined
          return (
            <span className="text-content-dark-1 text-sm" title={relationshipDisplay || '-'}>
              {relationshipDisplay || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-auto',
          sortable: true,
        },
      },
      {
        accessorKey: 'effective_date',
        header: 'Ngày hiệu lực',
        cell: ({ getValue }) => {
          const dateValue = getValue() as string | null | undefined
          const formattedDate = formatDate(dateValue)
          return (
            <span className="text-content-dark-1 text-sm" title={formattedDate}>
              {formattedDate}
            </span>
          )
        },
        meta: {
          width: 'w-[120px]',
        },
      },
    ],
    []
  )

  // Navigate with state for back navigation
  const navigateToDetail = useCallback(
    (path: string) => {
      navigate(path, {
        state: { from: window.location.pathname + window.location.search },
      })
    },
    [navigate]
  )

  // Define row actions
  const actions: TableAction<EmployeeDependent>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigateToDetail(APP_PATH.EMPLOYEE_DEPENDENT_DETAIL.replace(':id', String(record.id))),
        show: () => ability.can('retrieve', 'employee_dependent'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigateToDetail(APP_PATH.EMPLOYEE_DEPENDENT_EDIT.replace(':id', String(record.id))),
        show: () => ability.can('update', 'employee_dependent'),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => onDeleteDependent?.(record),
        show: () => ability.can('destroy', 'employee_dependent'),
      },
    ],
    [navigateToDetail, onDeleteDependent, ability]
  )

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      onPaginationChange(pageIndex, newPageSize)
    },
    [onPaginationChange]
  )

  // Handle sorting change
  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      onSortingChange(field, direction)
    },
    [onSortingChange]
  )

  if (error) {
    return <TableError />
  }

  return (
    <Table
      columns={columns}
      data={data}
      isLoading={isLoading}
      showSTT
      showActions
      rowActions={actions}
      enableSorting
      manualSorting
      enablePagination
      manualPagination
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      onPaginationChange={handlePaginationChange}
      onSortingChange={handleSortingChange}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      emptyMessage="Không có dữ liệu người phụ thuộc"
      sttFrozen={false}
    />
  )
}

export default DependentTable
