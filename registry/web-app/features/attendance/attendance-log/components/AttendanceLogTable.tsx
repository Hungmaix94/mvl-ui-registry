import { useMemo } from 'react'
import { ColumnDef, Table, Chip } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import type { AttendanceRecord } from '@/features/attendance/services/attendance-record-service'
import { ColoredValueVariant } from '@/api/schema'
import { format, parseISO } from 'date-fns'
import { DATETIME_FORMAT } from '@/constants/date-format'
import { Flex } from '@radix-ui/themes'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { TimesheetLogMethod as AttendanceType } from '@/constants/api-schema-aliases'

function getProjectOrDeviceDisplay(record: AttendanceRecord): string {
  switch (record.attendance_type) {
    case AttendanceType.biometric_device:
      return record.biometric_device?.name ?? '-'
    case AttendanceType.wifi:
      return record.attendance_wifi_device?.name ?? record.attendance_wifi_device?.code ?? '-'
    case AttendanceType.geolocation:
      return (
        record.attendance_geolocation?.project?.name ?? record.attendance_geolocation?.name ?? '-'
      )
    case AttendanceType.other:
      return record.address_text ?? '-'
    default:
      return '-'
  }
}

function getProjectOrDeviceTooltip(record: AttendanceRecord): string {
  switch (record.attendance_type) {
    case AttendanceType.biometric_device: {
      const value = record.biometric_device?.name ?? '-'
      return `Thiết bị: ${value}`
    }
    case AttendanceType.wifi: {
      const value =
        record.attendance_wifi_device?.name ?? record.attendance_wifi_device?.code ?? '-'
      return `Thiết bị WiFi: ${value}`
    }
    case AttendanceType.geolocation: {
      const projectName = record.attendance_geolocation?.project?.name
      const locationName = record.attendance_geolocation?.name ?? '-'
      if (projectName) return `Dự án: ${projectName}`
      return `Địa điểm: ${locationName}`
    }
    case AttendanceType.other: {
      const value = record.address_text ?? '-'
      return `Địa chỉ: ${value}`
    }
    default:
      return '-'
  }
}

type AttendanceLogTableProps = {
  data: AttendanceRecord[]
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

function formatDateTime(timestamp: string | undefined): string {
  if (!timestamp) return '-'
  try {
    return format(parseISO(timestamp), DATETIME_FORMAT)
  } catch {
    return '-'
  }
}

const AttendanceLogTable = ({
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
}: AttendanceLogTableProps) => {
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.ATTENDANCE_RECORD_ATTENDANCE_TYPE_CHOICES,
      APP_CONSTANT_KEY.HRM.ATTENDANCE_RECORD_APPROVE_STATUS,
    ],
  })

  const attendanceTypeLabelMap = useMemo(() => {
    const options =
      keysMapOptions.get(APP_CONSTANT_KEY.HRM.ATTENDANCE_RECORD_ATTENDANCE_TYPE_CHOICES) ?? []
    const map = new Map<string, string>()
    options.forEach((opt: { value: string; label: string }) => {
      map.set(opt.value, opt.label)
    })
    return map
  }, [keysMapOptions])

  const approveStatusLabelMap = useMemo(() => {
    const options = keysMapOptions.get(APP_CONSTANT_KEY.HRM.ATTENDANCE_RECORD_APPROVE_STATUS) ?? []
    const map = new Map<string, string>()
    options.forEach((opt: { value: string; label: string }) => {
      map.set(opt.value, opt.label)
    })
    return map
  }, [keysMapOptions])

  const columns: ColumnDef<AttendanceRecord>[] = useMemo(
    () => [
      {
        accessorKey: 'employee',
        header: 'Nhân viên',
        cell: ({ row }) => {
          const employee = row.original.employee
          const code = employee?.code ?? '-'
          const fullname = employee?.fullname ?? '-'
          const branchName = employee?.branch?.name ?? ''
          const blockName = employee?.block?.name ?? ''
          const departmentName = employee?.department?.name ?? ''
          const title = `Mã: ${code}\nTên: ${fullname}\nChi nhánh: ${branchName}\nKhối: ${blockName}\nPhòng ban: ${departmentName}`
          return (
            <Flex direction="column" width="100%" title={title}>
              <div className="text-content-dark-1 text-sm">
                {code}&nbsp;-&nbsp;{fullname}
              </div>
              <Flex justify="start" align="center" wrap="wrap" gap="1">
                <span className="text-content-dark-3 text-xs">{branchName}</span>
                <span className="text-content-dark-3 text-xs">-</span>
                <span className="text-content-dark-3 text-xs">{blockName}</span>
                <span className="text-content-dark-3 text-xs">-</span>
                <span className="text-content-dark-3 text-xs">{departmentName}</span>
              </Flex>
            </Flex>
          )
        },
        meta: { width: '240px', sortable: false },
      },
      {
        accessorKey: 'attendance_type',
        header: 'Phương thức chấm công',
        cell: ({ row }) => {
          const value = row.original.attendance_type
          const label = value ? (attendanceTypeLabelMap.get(value) ?? value) : '-'
          return (
            <span className="text-content-dark-1 text-sm" title={label}>
              {label}
            </span>
          )
        },
        meta: { width: '180px', sortable: false },
      },
      {
        accessorKey: 'timestamp',
        header: 'Thời gian chấm',
        cell: ({ row }) => {
          const value = row.original.timestamp
          const display = formatDateTime(value)
          return (
            <span className="text-content-dark-1 text-sm" title={display}>
              {display}
            </span>
          )
        },
        meta: { width: '140px', sortable: true },
      },
      {
        id: 'project_or_device',
        header: 'Dự Án/Thiết bị',
        cell: ({ row }) => {
          const text = getProjectOrDeviceDisplay(row.original)
          const tooltip = getProjectOrDeviceTooltip(row.original)
          return (
            <span
              className="text-content-dark-1 block max-w-[200px] truncate text-sm"
              title={tooltip}
            >
              {text}
            </span>
          )
        },
        meta: { width: 'flex-1', sortable: false },
      },
      {
        id: 'approve_status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const value = row.original.approve_status
          if (!value) return <span className="text-content-dark-1 text-sm">-</span>
          const label = approveStatusLabelMap.get(value) ?? value

          const coloredStatus = row.original.colored_approve_status
          const variant = coloredStatus?.variant || ColoredValueVariant.GREY

          return <Chip label={label} variant={variant} type="outlined" />
        },
        meta: { width: '140px', sortable: false },
      },
    ],
    [attendanceTypeLabelMap, approveStatusLabelMap]
  )

  if (error) {
    return <TableError />
  }

  return (
    <Table
      data={data}
      columns={columns}
      showSTT
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
      emptyMessage="Không có dữ liệu"
    />
  )
}

export default AttendanceLogTable
