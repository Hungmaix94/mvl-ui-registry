import { useMemo } from 'react'
import { Flex } from '@radix-ui/themes'
import { ColumnDef, Table } from '@/components/ui'
import type { DailyTimesheetEntry } from '@/features/attendance/services/timesheet-service'
import { TIME_FORMAT, DATE_FORMAT } from '@/constants/date-format'
import { formatDate } from '@/utils/date-utils'
import { cn } from '@/utils'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { DailyTimesheetStatus } from '@/constants/api-schema-aliases'
type DailyTimesheetTableProps = {
  data: DailyTimesheetEntry[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const STATUS_CLASSNAME_CONFIG: Record<DailyTimesheetStatus, string> = {
  on_time: 'bg-green-10 text-data-green-default',
  not_on_time: 'bg-data-yellow-disabled text-data-yellow-hover',
  single_punch: 'bg-data-yellow-disabled text-data-yellow-hover',
  absent: 'bg-red-10 text-data-red-default',
  not_checked_in: 'bg-neutral-20 text-neutral-70',
}

// Renders a check-in/out cell: time, the method label (e.g. "Chấm công GPS"),
// and the log location name below it — the project (GPS), the device (vân tay),
// or the WiFi name — taken from `log.location.name`.
const TimeLogCell = ({
  time,
  log,
}: {
  time: string | null
  log: DailyTimesheetEntry['check_in_log']
}) => {
  const text = time ? formatDate(time, TIME_FORMAT) : '-'
  const methodText = log?.display
  const locationName = log?.location?.name

  return (
    <div className="flex flex-col items-center">
      <span
        className="typo-body-base-regular text-content-dark-1"
        title={text !== '-' ? text : undefined}
      >
        {text}
      </span>
      {methodText && (
        <span className="typo-body-xs-regular text-content-dark-3" title={methodText}>
          {methodText}
        </span>
      )}
      {locationName && (
        <span className="typo-body-xs-regular text-content-dark-2" title={locationName}>
          {locationName}
        </span>
      )}
    </div>
  )
}

const DailyTimesheetTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onClearFilter,
  hasFilter,
}: DailyTimesheetTableProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.TIMESHEET_ENTRY_STATUS_CHOICES],
  })

  const timesheetStatusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.TIMESHEET_ENTRY_STATUS_CHOICES)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.TIMESHEET_ENTRY_STATUS_CHOICES) as Record<
          string,
          string
        > | null) || {}
      : {}
  }, [keysMap])

  const columns: ColumnDef<DailyTimesheetEntry>[] = useMemo(
    () => [
      {
        accessorKey: 'employee',
        header: 'Nhân viên',
        cell: ({ row }) => {
          const employee = row.original.employee
          const fullname = employee?.fullname || '-'
          const code = employee?.code || '-'
          const branch = employee?.branch?.name || '-'
          const block = employee?.block?.name || '-'
          const department = employee?.department?.name || '-'

          const hasOrgInfo = branch !== '-' || block !== '-' || department !== '-'

          return (
            <div className="flex flex-col gap-1">
              <span className="typo-body-base-semibold text-content-dark-1">{fullname}</span>
              <span className="typo-body-sm text-content-dark-3">Mã: {code}</span>
              {hasOrgInfo && (
                <Flex direction="column" className="typo-body-xs-regular text-content-dark-3">
                  <span>• Chi nhánh: {branch}</span>
                  <span>• Khối: {block}</span>
                  <span>• Phòng ban: {department}</span>
                </Flex>
              )}
            </div>
          )
        },
        meta: {
          width: 'w-56',
          sortable: false,
          frozen: true,
        },
      },
      {
        accessorKey: 'date',
        header: 'Ngày chấm công',
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined | null
          const text = value ? formatDate(value, DATE_FORMAT) : '-'
          return (
            <span
              className="typo-body-base-regular text-content-dark-1 block text-center"
              title={text !== '-' ? text : undefined}
            >
              {text}
            </span>
          )
        },
        meta: {
          width: '150px',
          align: 'center',
          sortable: false,
        },
      },
      {
        accessorKey: 'start_time',
        header: 'Giờ vào',
        cell: ({ row }) => (
          <TimeLogCell time={row.original.start_time} log={row.original.check_in_log} />
        ),
        meta: {
          width: '120px',
          align: 'center',
          sortable: true,
        },
      },
      {
        accessorKey: 'end_time',
        header: 'Giờ ra',
        cell: ({ row }) => (
          <TimeLogCell time={row.original.end_time} log={row.original.check_out_log} />
        ),
        meta: {
          width: '120px',
          align: 'center',
          sortable: true,
        },
      },
      {
        id: 'absence_reason',
        header: 'Lý do nghỉ',
        cell: ({ row }) => {
          const morning = row.original.morning_absent_reason_label || ''
          const afternoon = row.original.afternoon_absent_reason_label || ''

          let text = '-'

          if (morning && afternoon && morning !== afternoon) {
            text = `Sáng: ${morning}; Chiều: ${afternoon}`
          } else if (morning || afternoon) {
            const reason = morning || afternoon
            text = reason
          }

          return (
            <span
              className="typo-body-base-regular text-content-dark-1 block truncate"
              title={text !== '-' ? text : undefined}
            >
              {text}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
          align: 'left',
          sortable: false,
        },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const status = row.original.status

          if (!status) {
            return <span className="typo-body-base-regular text-content-dark-1">-</span>
          }

          const label = timesheetStatusMapping[status] || (status as string) || '-'
          const statusClassName = STATUS_CLASSNAME_CONFIG[status]

          if (!statusClassName) {
            return <span className="typo-body-base-regular text-content-dark-1">{label}</span>
          }

          return (
            <span
              className={cn(
                'typo-body-sm-medium inline-flex items-center rounded-full px-2 py-1',
                statusClassName
              )}
            >
              {label}
            </span>
          )
        },
        meta: {
          width: '200px',
          align: 'center',
          sortable: true,
        },
      },
    ],
    [timesheetStatusMapping]
  )

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-content-dark-3">Có lỗi xảy ra khi tải dữ liệu</span>
      </div>
    )
  }

  return (
    <Table
      data={data}
      columns={columns}
      showSTT
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
      disableInnerOverflow={true}
      paginationPosition="static"
    />
  )
}

export default DailyTimesheetTable
