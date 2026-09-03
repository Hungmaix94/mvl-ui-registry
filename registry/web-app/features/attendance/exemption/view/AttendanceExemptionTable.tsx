import { useMemo } from 'react'
import { Chip, type ColumnDef, Table, type TableAction } from '@/components/ui'
import { IconXcircle } from '@/assets/icons'
import { type AttendanceExemption } from '@/features/attendance/services/attendance-exemption-service'
import TableError from '@/components/ui/table/TableError.tsx'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { useAbility } from '@/lib/ability.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { AttendanceExemptionStatus } from '@/constants/api-schema-aliases'

type AttendanceExemptionTableProps = {
  data: AttendanceExemption[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteAttendanceExemption?: (exemption: AttendanceExemption) => void
  onEditAttendanceExemption?: (exemption: AttendanceExemption) => void
  onDisableAttendanceExemption?: (exemption: AttendanceExemption) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const COLOR_MAP: Record<AttendanceExemptionStatus, ColoredValueVariant> = {
  [AttendanceExemptionStatus.ENABLED]: ColoredValueVariant.GREEN,
  [AttendanceExemptionStatus.DISABLED]: ColoredValueVariant.GREY,
}

const AttendanceExemptionTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  // onDeleteAttendanceExemption,
  // onEditAttendanceExemption,
  onDisableAttendanceExemption,
  onClearFilter,
  hasFilter,
}: AttendanceExemptionTableProps) => {
  const ability = useAbility()

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.ATTENDANCE_EXEMPTION_STATUS],
  })

  const keysStatusMap = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.HRM.ATTENDANCE_EXEMPTION_STATUS) || {},
    [keysMap]
  )

  const columns: ColumnDef<AttendanceExemption>[] = useMemo(
    () => [
      {
        accessorKey: 'employee.code',
        header: 'Mã nhân viên',
        cell: ({ row }) => {
          return (
            <span className="text-content-dark-1 text-sm" title={row.original.employee.code}>
              {row.original.employee.code}
            </span>
          )
        },
        meta: {
          width: 'w-32',
          sortable: true,
        },
      },
      {
        accessorKey: 'employee.fullname',
        header: 'Tên nhân viên',
        cell: ({ row }) => {
          return (
            <span className="text-content-dark-1 text-sm" title={row.original.employee.fullname}>
              {row.original.employee.fullname}
            </span>
          )
        },
        meta: {
          width: 'w-64',
          sortable: true,
        },
      },
      {
        accessorKey: 'employee.position.name',
        header: 'Chức vụ',
        cell: ({ row }) => {
          return (
            <span
              className="text-content-dark-2 text-sm"
              title={row.original.employee.position?.name || '-'}
            >
              {row.original.employee.position?.name || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-48',
        },
      },
      {
        accessorKey: 'effective_date',
        header: 'Ngày hiệu lực',
        cell: ({ row }) => {
          const effectiveDate = row.original.effective_date
          const formattedDate = effectiveDate ? format(new Date(effectiveDate), DATE_FORMAT) : '-'
          return (
            <span className="text-content-dark-2 text-sm" title={formattedDate}>
              {formattedDate}
            </span>
          )
        },
        meta: {
          width: 'w-40',
          sortable: true,
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Ngày tạo',
        cell: ({ row }) => {
          const createdAt = row.original.created_at
          const formattedDate = createdAt ? format(new Date(createdAt), DATE_FORMAT) : '-'
          return (
            <span className="text-content-dark-2 text-sm" title={formattedDate}>
              {formattedDate}
            </span>
          )
        },
        meta: {
          width: 'w-40',
        },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const statusValue = getValue() as AttendanceExemption['status']

          return (
            <>
              <Chip label={keysStatusMap[statusValue]} variant={COLOR_MAP[statusValue]} />
            </>
          )
        },
        meta: {
          width: '120px',
          sortable: true,
        },
      },
    ],
    [keysStatusMap]
  )

  const actions: TableAction<AttendanceExemption>[] = useMemo(
    () => [
      {
        label: 'Vô hiệu hoá',
        icon: <IconXcircle size={16} />,
        onClick: (record) => {
          onDisableAttendanceExemption?.(record)
        },
        show: (record) =>
          ability.can('create', 'attendance_exemption') &&
          record.status === AttendanceExemptionStatus.ENABLED,
      },
    ],
    [ability, onDisableAttendanceExemption]
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
      manualPagination
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

export default AttendanceExemptionTable
