import { useMemo, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { IconMappin, IconWifihigh, IconIdentificationcard, IconEye } from '@/assets/icons'
import { Flex, Text } from '@radix-ui/themes'
import { Table } from '@/components/ui'
import type { ReactNode } from 'react'
import { cn } from '@/utils'
import { useDialog } from '@/hooks/useDialog.ts'
import CheckinDetailDialogContent from './CheckinDetailDialogContent.tsx'
import {
  useAttendanceRecords,
  type AttendanceRecord,
} from '@/features/attendance/services/attendance-record-service'
import { format, parseISO } from 'date-fns'
import { TIME_FORMAT } from '@/constants/date-format.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { useSearchParams } from 'react-router-dom'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import AttendanceApprovalStatusBadge from '@/features/attendance/other-attendance/components/AttendanceApprovalStatusBadge.tsx'
import { TimesheetLogMethod as AttendanceType } from '@/constants/api-schema-aliases'

type CheckinRow = {
  id: number
  method: AttendanceType
  location: string
  time: string
  imageUrl: string | null
  latitude?: string | null
  longitude?: string | null
  status?: AttendanceRecord['colored_approve_status']
  reason?: string | null
}

type TimesheetEntryCheckinTableProps = {
  employeeId?: number
  date?: string
}

const ATTENDANCE_TYPE_ICON: Record<CheckinRow['method'], ReactNode> = {
  [AttendanceType.geolocation]: <IconMappin size={24} className="text-content-dark-3" />,
  [AttendanceType.wifi]: <IconWifihigh size={24} className="text-content-dark-3" />,
  [AttendanceType.biometric_device]: (
    <IconIdentificationcard size={24} className="text-content-dark-3" />
  ),
  [AttendanceType.other]: <IconIdentificationcard size={24} className="text-content-dark-3" />,
}

/**
 * Get location from attendance record
 */
function getLocation(record: AttendanceRecord): string {
  // For "other" attendance type, read from address_text
  if (record.attendance_type === AttendanceType.other && record.address_text) {
    return record.address_text
  }
  if (record.attendance_geolocation?.name) {
    return record.attendance_geolocation.name
  }
  if (record.attendance_wifi_device?.name) {
    return record.attendance_wifi_device.name
  }
  if (record.biometric_device?.name) {
    return record.biometric_device.name
  }
  return '-'
}

/**
 * Format timestamp to time string
 */
function formatTime(timestamp: string | undefined): string {
  if (!timestamp) return '-'
  try {
    return format(parseISO(timestamp), TIME_FORMAT)
  } catch {
    return '-'
  }
}

/**
 * Get image URL from attendance record
 */
function getImageUrl(record: AttendanceRecord): string | null {
  return record.image?.view_url || null
}

/**
 * Transform AttendanceRecord to CheckinRow
 */
function transformAttendanceRecord(record: AttendanceRecord): CheckinRow {
  return {
    id: record.id,
    method: record.attendance_type,
    location: getLocation(record),
    time: formatTime(record.timestamp),
    imageUrl: getImageUrl(record),
    latitude: record.latitude,
    longitude: record.longitude,
    status: record.colored_approve_status,
    reason: record.description ?? null,
  }
}

const TimesheetEntryCheckinTable = ({ employeeId, date }: TimesheetEntryCheckinTableProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.ATTENDANCE_TYPE],
  })
  const mapAttendanceType = useMemo(
    () =>
      keysMap.has(APP_CONSTANT_KEY.HRM.ATTENDANCE_TYPE)
        ? keysMap.get(APP_CONSTANT_KEY.HRM.ATTENDANCE_TYPE)
        : {},
    [keysMap]
  )

  const { displayCustom } = useDialog()
  const [searchParams] = useSearchParams()

  // Get date from props first, then from URL search params
  const dateValue = useMemo(() => {
    if (date) return date
    const urlDate = searchParams.get('date')
    return urlDate || undefined
  }, [date, searchParams])

  // Format date to API format (yyyy-MM-dd)
  // If date is already in yyyy-MM-dd format (from URL), use it directly
  // Otherwise, format it using formatDateToApi
  const formattedDate = useMemo(() => {
    if (!dateValue) return undefined
    // Check if date is already in yyyy-MM-dd format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (dateRegex.test(dateValue)) {
      return dateValue
    }
    return formatDateToApi(dateValue)
  }, [dateValue])

  // Fetch attendance records
  const attendanceParams = useMemo(
    () => ({
      employee: employeeId,
      date: formattedDate,
    }),
    [employeeId, formattedDate]
  )

  const shouldFetch = !!(employeeId && formattedDate)

  const { data: attendanceRecordsResponse, isLoading } = useAttendanceRecords(attendanceParams, {
    enabled: shouldFetch,
  })

  const attendanceRecords = useMemo(
    () => attendanceRecordsResponse?.results || [],
    [attendanceRecordsResponse?.results]
  )

  // Transform attendance records to table rows
  const rows: CheckinRow[] = useMemo(
    () => attendanceRecords.map(transformAttendanceRecord),
    [attendanceRecords]
  )

  const handleViewDetail = useCallback(
    (row: CheckinRow) => {
      displayCustom({
        size: 'xl',
        title: 'Chi tiết chấm công',
        content: (
          <CheckinDetailDialogContent
            location={row.location}
            time={row.time}
            imageUrl={row.imageUrl || ''}
            latitude={row.latitude || null}
            longitude={row.longitude || null}
            reason={row.method === AttendanceType.other ? (row.reason ?? null) : null}
          />
        ),
        hideFooter: true,
        onClose: () => {},
      })
    },
    [displayCustom]
  )

  const columns: ColumnDef<CheckinRow>[] = useMemo(
    () => [
      {
        accessorKey: 'method',
        header: 'Phương thức',
        cell: ({ getValue }) => {
          const method = getValue() as CheckinRow['method']
          return (
            <Flex align="center" justify={'start'} gap="2">
              {ATTENDANCE_TYPE_ICON[method]}
              <span className="typo-body-base-regular text-content-dark-1">
                {mapAttendanceType[method]}
              </span>
            </Flex>
          )
        },
        meta: {
          width: '180px',
          align: 'left',
          sortable: false,
        },
      },
      {
        accessorKey: 'location',
        header: 'Vị trí chấm công',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </span>
          )
        },
        meta: {
          cellClassName: 'flex-1',
          align: 'left',
          sortable: false,
        },
      },
      {
        accessorKey: 'time',
        header: 'Giờ chấm công',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <span className="typo-body-base-regular text-content-dark-1 text-center" title={value}>
              {value}
            </span>
          )
        },
        meta: {
          width: '160px',
          align: 'center',
          sortable: false,
        },
      },
      {
        id: 'reason',
        header: 'Lý do',
        cell: ({ row }) => {
          const isOther = row.original.method === AttendanceType.other
          const text = isOther && row.original.reason?.trim() ? row.original.reason : '-'
          return (
            <span
              className="typo-body-base-regular text-content-dark-1 block max-w-[200px] truncate"
              title={text !== '-' ? text : undefined}
            >
              {text}
            </span>
          )
        },
        meta: {
          width: '120px',
          align: 'left',
          sortable: false,
        },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          return (
            <div className="flex items-center justify-center">
              <AttendanceApprovalStatusBadge status={row.original.status} />
            </div>
          )
        },
        meta: {
          width: '150px',
          align: 'center',
          sortable: false,
        },
      },
      {
        accessorKey: 'imageUrl',
        header: 'Ảnh chấm công',
        cell: ({ getValue }) => {
          const imageUrl = getValue() as string | null
          if (!imageUrl) {
            return (
              <div className="flex items-center justify-center">
                <span className="typo-body-base-regular text-content-dark-3">-</span>
              </div>
            )
          }
          return (
            <div className="flex items-center justify-center">
              <img
                src={imageUrl}
                alt="Ảnh chấm công"
                className="h-[120px] w-[80px] rounded object-cover"
                loading="lazy"
              />
            </div>
          )
        },
        meta: {
          width: 'flex-1',
          align: 'center',
          sortable: false,
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const rowData = row.original
          return (
            <Flex justify="center" align="center">
              <button
                type="button"
                onClick={() => handleViewDetail(rowData)}
                className={cn(
                  'flex items-center justify-center gap-2 px-3 py-2 text-sm transition-colors',
                  'hover:bg-data-light-grey-hover',
                  'hover:cursor-pointer',
                  'focus:outline-action-outline-default'
                )}
                title="Xem chi tiết"
                aria-label="Xem chi tiết"
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  <IconEye size={16} />
                </span>
              </button>
            </Flex>
          )
        },
        meta: {
          width: '106px',
          align: 'center',
          sortable: false,
        },
      },
    ],
    [handleViewDetail, mapAttendanceType]
  )

  return (
    <section className="flex flex-col gap-5">
      <Flex align="center" justify="between">
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin chấm công</Text>
      </Flex>
      {rows && rows.length > 0 && (
        <Table<CheckinRow>
          data={rows}
          columns={columns}
          showSTT={false}
          enablePagination={false}
          enableSorting={false}
          enableFiltering={false}
          isLoading={isLoading}
          emptyMessage="Không có dữ liệu chấm công"
          className="!px-0 !pb-0"
        />
      )}
    </section>
  )
}

export default TimesheetEntryCheckinTable
