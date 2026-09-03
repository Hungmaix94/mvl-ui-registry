import { ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { useMemo } from 'react'
import { IconEye } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useAbility } from '@/lib/ability.ts'

// Define data type for user action tracking
type UserActionRecord = {
  id: string
  employeeCode: string
  employeeName: string
  action: string
  targetObject: string
  timestamp: Date
}

type Props = {
  data: UserActionRecord[]
  isLoading: boolean
  error?: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  ordering?: string
  onPaginationChange: (pageIndex: number, pageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onClearAll?: () => void
  hasFilter?: boolean
}

const UserActionTrackingTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onClearAll,
  hasFilter,
}: Props) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMap } = useAppConstant({
    module: 'audit_logging',
    keys: [APP_CONSTANT_KEY.AUDIT_LOG.LOG_ACTION, APP_CONSTANT_KEY.AUDIT_LOG.OBJECT_TYPE],
  })

  const logActionMapping = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.AUDIT_LOG.LOG_ACTION) || {},
    [keysMap]
  )

  const objectTypeMapping = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.AUDIT_LOG.OBJECT_TYPE) || {},
    [keysMap]
  )

  // Define columns
  const columns: ColumnDef<UserActionRecord>[] = useMemo(
    () => [
      {
        accessorKey: 'employeeCode',
        header: 'Mã nhân viên',
        meta: {
          frozen: true,
          width: 'w-32',
        },
      },
      {
        accessorKey: 'employeeName',
        header: 'Họ tên người thực hiện',
        meta: {
          frozen: true,
          width: 'w-48',
        },
      },
      {
        accessorKey: 'action',
        header: 'Hành động',
        cell: ({ getValue }) => {
          const action = getValue() as UserActionRecord['action']
          return <span className="text-sm">{logActionMapping[action] || action}</span>
        },
        meta: {
          width: 'w-40',
        },
      },
      {
        accessorKey: 'targetObject',
        header: 'Đối tượng bị tác động',
        cell: ({ getValue }) => {
          const objectType = getValue() as UserActionRecord['targetObject']
          return <span className="text-sm">{objectTypeMapping[objectType] || objectType}</span>
        },
        meta: {
          width: 'w-48',
        },
      },
      {
        accessorKey: 'timestamp',
        header: 'Thời gian',
        cell: ({ getValue }) => {
          const date = getValue() as Date
          return (
            <span className="text-sm">
              {date.toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )
        },
        meta: {
          width: 'w-40',
          sortable: true,
        },
      },
    ],
    [logActionMapping, objectTypeMapping]
  )

  // Define actions
  const actions: TableAction<UserActionRecord>[] = useMemo(
    () =>
      ability?.can('get_detail', 'audit_logging')
        ? [
            {
              label: 'Xem chi tiết',
              icon: <IconEye size={16} />,
              onClick: (record) => {
                // Preserve current URL (with query params) in location.state for back navigation
                navigate(`${APP_PATH.USER_ACTION_TRACKING_DETAIL.replace(':id', record.id)}`, {
                  state: { from: window.location.pathname + window.location.search },
                })
              },
            },
          ]
        : [],
    [navigate, ability]
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
      manualSorting
      enablePagination
      manualPagination
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      emptyMessage="Không có dữ liệu theo dõi thao tác"
      className="flex-1"
      onClearFilter={onClearAll}
    />
  )
}

export default UserActionTrackingTable
