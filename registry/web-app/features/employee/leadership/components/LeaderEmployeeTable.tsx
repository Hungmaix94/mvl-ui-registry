import { useMemo, useCallback, useState } from 'react'
import { ColumnDef, IconButton, Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import {
  type LeaderEmployee,
  type GetLeaderEmployeesParams,
  useLeaderEmployees,
} from '@/features/employee/services/employee-service'
import { formatDate } from '@/utils/date-utils'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { useColumnConfig } from '@/hooks/useColumnConfig.ts'
import type { ColumnConfig } from '@/types/table.ts'
import { IconNotepencil } from '@/assets/icons'
import EditLeadershipAppointedDateDialog from '@/features/employee/leadership/components/EditLeadershipAppointedDateDialog'

/**
 * Backend `ordering` lookup for the department column (`GET /api/hrm/employees/leader-list/`).
 * The API orders on the related model's name, not on the FK id.
 */
export const LEADER_DEPARTMENT_ORDERING_FIELD = 'department__name'

// Default column configuration - all columns visible by default
const DEFAULT_COLUMN_CONFIG: ColumnConfig[] = [
  { id: 'code', label: 'Mã nhân viên', visible: true, order: 0 },
  { id: 'fullname', label: 'Họ và tên', visible: true, order: 1 },
  { id: 'start_date', label: 'Ngày làm việc', visible: true, order: 2 },
  { id: 'employee_type', label: 'Loại nhân viên', visible: true, order: 3 },
  { id: 'position', label: 'Chức vụ', visible: true, order: 4 },
  { id: 'branch', label: 'Chi nhánh', visible: true, order: 5 },
  { id: 'block', label: 'Khối', visible: true, order: 6 },
  { id: 'department', label: 'Phòng ban', visible: true, order: 7 },
  { id: 'phone', label: 'SĐT', visible: true, order: 8 },
  { id: 'email', label: 'Mail', visible: true, order: 9 },
  { id: 'date_of_birth', label: 'Ngày sinh', visible: true, order: 10 },
  { id: 'residential_address', label: 'Địa chỉ', visible: true, order: 11 },
  { id: 'citizen_id', label: 'Số CCCD', visible: true, order: 12 },
  { id: 'citizen_id_issued_date', label: 'Ngày cấp CCCD', visible: true, order: 13 },
  { id: 'citizen_id_issued_place', label: 'Nơi cấp CCCD', visible: true, order: 14 },
  { id: 'leadership_appointed_date', label: 'Ngày bổ nhiệm lên BLĐ', visible: true, order: 15 },
]

type LeaderEmployeeTableProps = {
  isShowTableColumnConfig?: boolean
  // URL-driven props
  apiParams?: GetLeaderEmployeesParams
  currentPage: number
  pageSize: number
  onPaginationChange: (pageIndex: number, pageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onClearFilter?: () => void
  hasFilter?: boolean
  isUrlReady?: boolean
}

const LeaderEmployeeTable = ({
  isShowTableColumnConfig,
  apiParams,
  currentPage,
  pageSize,
  onPaginationChange,
  onSortingChange,
  onClearFilter,
  hasFilter = false,
  isUrlReady = false,
}: LeaderEmployeeTableProps) => {
  const ability = useAbility()
  const canViewEmployeeDetail = ability.can('retrieve', 'employee')
  const canEditLeadershipAppointedDate = ability.can('set_leadership_appointed_date', 'employee')

  // Row currently open in the "sửa ngày bổ nhiệm" dialog (5.6 brd.md §2.2.4)
  const [editingEmployee, setEditingEmployee] = useState<LeaderEmployee | null>(null)

  // Fetch employee type labels from server constants
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.EMPLOYEE_EMPLOYEE_TYPE_CHOICES],
  })

  const employeeTypeMap = keysMap.get(APP_CONSTANT_KEY.HRM.EMPLOYEE_EMPLOYEE_TYPE_CHOICES) as
    | Record<string, string>
    | undefined

  // Fetch leadership employees data from API with URL-derived params
  const { data: employeesResponse, isLoading, error } = useLeaderEmployees(apiParams, isUrlReady)

  const { employees, totalRecords, pageCount } = useMemo(() => {
    const totalCount = employeesResponse?.count ?? 0
    return {
      employees: employeesResponse?.results || [],
      totalRecords: totalCount,
      pageCount: totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0,
    }
  }, [employeesResponse?.results, employeesResponse?.count, pageSize])

  // Open employee detail in a new tab (permission-gated)
  const handleOpenEmployeeDetail = useCallback((employeeId: number) => {
    window.open(
      APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(employeeId)),
      '_blank',
      'noopener,noreferrer'
    )
  }, [])

  const allColumnDefs: ColumnDef<LeaderEmployee>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã nhân viên',
        cell: ({ row, getValue }) => {
          const code = getValue() as string

          if (!canViewEmployeeDetail) {
            return (
              <span className="text-content-dark-1 text-sm" title={code || '-'}>
                {code || '-'}
              </span>
            )
          }

          return (
            <span
              className="text-action-primary-red-default cursor-pointer text-sm hover:underline"
              title={`${code || '-'} — Mở chi tiết nhân viên (tab mới)`}
              onClick={() => handleOpenEmployeeDetail(row.original.id)}
            >
              {code || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[130px]',
          sortable: true,
          align: 'center',
        },
      },
      {
        accessorKey: 'fullname',
        header: 'Họ và tên',
        cell: ({ getValue }) => {
          const fullname = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={fullname || '-'}>
              {fullname || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[180px]',
          sortable: true,
        },
      },
      {
        accessorKey: 'start_date',
        header: 'Ngày làm việc',
        cell: ({ getValue }) => {
          const startDate = getValue() as string | null
          return <span className="text-content-dark-1 text-sm">{formatDate(startDate)}</span>
        },
        meta: {
          width: 'w-[130px]',
          sortable: true,
          align: 'center',
        },
      },
      {
        accessorKey: 'employee_type',
        header: 'Loại nhân viên',
        cell: ({ getValue }) => {
          const employeeType = getValue() as string | null
          const label = employeeType ? (employeeTypeMap?.[employeeType] ?? employeeType) : '-'
          return (
            <span className="text-content-dark-1 text-sm break-words" title={label}>
              {label}
            </span>
          )
        },
        meta: {
          width: 'w-[140px]',
        },
      },
      {
        accessorKey: 'position',
        header: 'Chức vụ',
        cell: ({ getValue }) => {
          const position = getValue() as LeaderEmployee['position'] | null
          return (
            <span className="text-content-dark-1 text-sm break-words" title={position?.name || '-'}>
              {position?.name || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'branch',
        header: 'Chi nhánh',
        cell: ({ getValue }) => {
          const branch = getValue() as LeaderEmployee['branch'] | null
          return (
            <span className="text-content-dark-1 text-sm break-words" title={branch?.name || '-'}>
              {branch?.name || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        accessorKey: 'block',
        header: 'Khối',
        cell: ({ getValue }) => {
          const block = getValue() as LeaderEmployee['block'] | null
          return (
            <span className="text-content-dark-1 text-sm break-words" title={block?.name || '-'}>
              {block?.name || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[130px]',
        },
      },
      {
        // The sort field sent to the API is this column `id`, and ordering on a related
        // model needs its BE lookup name (`department__name`) — plain `department` is not a
        // supported ordering field and would be ignored. `accessorKey` stays `department` so
        // the saved column config and `getValue()` keep working.
        id: LEADER_DEPARTMENT_ORDERING_FIELD,
        accessorKey: 'department',
        header: 'Phòng ban',
        // The cell value is an object, so TanStack would default this column to
        // descending-first — the other sortable text columns start ascending, and A→Z is
        // what "xem theo phòng ban" means. Keep the first click ascending.
        sortDescFirst: false,
        cell: ({ getValue }) => {
          const department = getValue() as LeaderEmployee['department'] | null
          return (
            <span
              className="text-content-dark-1 text-sm break-words"
              title={department?.name || '-'}
            >
              {department?.name || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[130px]',
          sortable: true,
        },
      },
      {
        accessorKey: 'phone',
        header: 'SĐT',
        cell: ({ getValue }) => {
          const phone = getValue() as string
          return <span className="text-content-dark-1 text-sm">{phone || '-'}</span>
        },
        meta: {
          width: 'w-[120px]',
          align: 'center',
        },
      },
      {
        accessorKey: 'email',
        header: 'Mail',
        cell: ({ getValue }) => {
          const email = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-all" title={email || '-'}>
              {email || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[200px]',
        },
      },
      {
        accessorKey: 'date_of_birth',
        header: 'Ngày sinh',
        cell: ({ getValue }) => {
          const dateOfBirth = getValue() as string | null
          return <span className="text-content-dark-1 text-sm">{formatDate(dateOfBirth)}</span>
        },
        meta: {
          width: 'w-[120px]',
          align: 'center',
        },
      },
      {
        accessorKey: 'residential_address',
        header: 'Địa chỉ',
        cell: ({ getValue }) => {
          const address = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={address || '-'}>
              {address || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[220px]',
        },
      },
      {
        accessorKey: 'citizen_id',
        header: 'Số CCCD',
        cell: ({ getValue }) => {
          const citizenId = getValue() as string
          return <span className="text-content-dark-1 text-sm">{citizenId || '-'}</span>
        },
        meta: {
          width: 'w-[140px]',
          align: 'center',
        },
      },
      {
        accessorKey: 'citizen_id_issued_date',
        header: 'Ngày cấp CCCD',
        cell: ({ getValue }) => {
          const issuedDate = getValue() as string | null
          return <span className="text-content-dark-1 text-sm">{formatDate(issuedDate)}</span>
        },
        meta: {
          width: 'w-[130px]',
          align: 'center',
        },
      },
      {
        accessorKey: 'citizen_id_issued_place',
        header: 'Nơi cấp CCCD',
        cell: ({ getValue }) => {
          const issuedPlace = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={issuedPlace || '-'}>
              {issuedPlace || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[180px]',
        },
      },
      {
        accessorKey: 'leadership_appointed_date',
        header: 'Ngày bổ nhiệm lên BLĐ',
        cell: ({ row, getValue }) => {
          const appointedDate = getValue() as string | null
          return (
            <span className="text-content-dark-1 flex items-center justify-center gap-1 text-sm">
              {formatDate(appointedDate)}
              {canEditLeadershipAppointedDate && (
                <IconButton
                  variant="text"
                  size="small"
                  title="Sửa ngày bổ nhiệm lên ban lãnh đạo"
                  onClick={() => setEditingEmployee(row.original)}
                >
                  <IconNotepencil size={14} />
                </IconButton>
              )}
            </span>
          )
        },
        meta: {
          width: 'w-[180px]',
          align: 'center',
        },
      },
    ],
    [
      employeeTypeMap,
      canViewEmployeeDetail,
      canEditLeadershipAppointedDate,
      handleOpenEmployeeDetail,
    ]
  )

  // Use column configuration hook
  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(DEFAULT_COLUMN_CONFIG, { storageKey: 'employee-leadership' })

  // Filter and order columns based on config
  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) =>
        allColumnDefs.find((d) => (d as any).id === c.id || (d as any).accessorKey === c.id)
      )
      .filter(Boolean) as ColumnDef<LeaderEmployee>[]
  }, [columnConfig, allColumnDefs])

  // Handle pagination change - delegate to parent
  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      onPaginationChange(pageIndex, newPageSize)
    },
    [onPaginationChange]
  )

  // Handle sorting change - delegate to parent
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
    <>
      <Table
        columns={visibleColumns}
        data={employees}
        isLoading={isLoading}
        onSortingChange={handleSortingChange}
        emptyMessage="Không có dữ liệu nhân sự ban lãnh đạo"
        isShowTableColumnConfig={isShowTableColumnConfig}
        columnConfig={columnConfig}
        onColumnConfigApply={handleApply}
        onColumnConfigReset={handleReset}
        showSTT
        sttFrozen
        enableSorting
        manualSorting
        enablePagination
        manualPagination
        disableInnerOverflow={true}
        pageCount={pageCount}
        pageSize={pageSize}
        totalRecords={totalRecords}
        currentPageIndex={currentPage - 1}
        onPaginationChange={handlePaginationChange}
        onClearFilter={onClearFilter}
        hasFilter={hasFilter}
        paginationPosition="static"
      />

      <EditLeadershipAppointedDateDialog
        isOpen={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        employee={editingEmployee}
      />
    </>
  )
}

export default LeaderEmployeeTable
