import { useMemo, useCallback } from 'react'
import { ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import type { EmployeeRelationship } from '@/features/employee/services/employee-relationship-service'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { useAbility } from '@/lib/ability.ts'

type RelationTableProps = {
  data: EmployeeRelationship[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteRelation?: (relation: EmployeeRelationship) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const RelationTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  onPaginationChange,
  onSortingChange,
  onDeleteRelation,
  onClearFilter,
  hasFilter = false,
}: RelationTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  // Fetch relation type constants
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.EMPLOYEE_RELATIONSHIP.RELATION_TYPE],
  })

  // Get relation type mapping
  const relationTypeMapping = useMemo(() => {
    return keysMap.get(APP_CONSTANT_KEY.EMPLOYEE_RELATIONSHIP.RELATION_TYPE) || {}
  }, [keysMap])

  // Format relation type display text
  const formatRelationType = useCallback(
    (relationType: string | undefined) => {
      if (!relationType) return '-'
      return relationTypeMapping[relationType] || relationType
    },
    [relationTypeMapping]
  )

  // Define columns
  const columns: ColumnDef<EmployeeRelationship>[] = useMemo(
    () => [
      {
        accessorKey: 'employee_code',
        header: 'Mã nhân viên',
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        accessorKey: 'employee_name',
        header: 'Tên nhân viên',
        meta: {
          width: 'w-auto',
        },
      },
      {
        accessorKey: 'relative_name',
        header: 'Tên người thân',
        meta: {
          width: 'w-auto',
          sortable: true,
        },
      },
      {
        accessorKey: 'relation_type',
        header: 'Mối quan hệ',
        cell: ({ getValue }) => {
          const relationType = getValue() as string | undefined
          const displayText = formatRelationType(relationType)
          return (
            <span className="text-content-dark-1 truncate text-sm" title={displayText}>
              {displayText}
            </span>
          )
        },
        meta: {
          width: 'w-[140px]',
        },
      },
      {
        accessorKey: 'date_of_birth',
        header: 'Ngày sinh',
        cell: ({ getValue }) => {
          const dateValue = getValue() as string | null | undefined
          const formattedDate = formatDate(dateValue)
          return (
            <span className="text-content-dark-1 truncate text-sm" title={formattedDate}>
              {formattedDate}
            </span>
          )
        },
        meta: {
          width: 'w-[120px]',
        },
      },
      {
        accessorKey: 'phone',
        header: 'Số điện thoại',
        cell: ({ getValue }) => {
          const phoneValue = getValue() as string | undefined
          return (
            <span className="text-content-dark-1 truncate text-sm" title={phoneValue || '-'}>
              {phoneValue || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[120px]',
        },
      },
    ],
    [formatRelationType]
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
  const actions: TableAction<EmployeeRelationship>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigateToDetail(APP_PATH.EMPLOYEE_RELATION_DETAIL.replace(':id', String(record.id))),
        show: () => ability.can('retrieve', 'employee_relationship'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigateToDetail(APP_PATH.EMPLOYEE_RELATION_EDIT.replace(':id', String(record.id))),
        show: () => ability.can('update', 'employee_relationship'),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => onDeleteRelation?.(record),
        show: () => ability.can('destroy', 'employee_relationship'),
      },
    ],
    [navigateToDetail, onDeleteRelation, ability]
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
      emptyMessage="Không có dữ liệu quan hệ thân nhân"
      sttFrozen={false}
    />
  )
}

export default RelationTable
