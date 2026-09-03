import { useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex, Text } from '@radix-ui/themes'

import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { type ColumnDef, Table, type TableAction, Chip } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { APP_PATH } from '@/routes'
import { type AttendanceWifiDevice } from '@/features/attendance/services/attendance-wifi-service'
import { useAbility } from '@/lib/ability.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { AttendanceWifiDeviceState, ColoredValueVariant } from '@/api/schema.ts'

function getBssidsList(row: AttendanceWifiDevice): string[] {
  if (row.bssids?.length) return row.bssids
  const display = (row as AttendanceWifiDevice & { bssids_display?: string }).bssids_display
  if (typeof display === 'string')
    return display
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  return []
}

export type WifiAttendanceDeviceTableProps = {
  data: AttendanceWifiDevice[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteDevice?: (device: AttendanceWifiDevice) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const WifiAttendanceDeviceTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteDevice,
  onClearFilter,
  hasFilter,
}: WifiAttendanceDeviceTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.WIFI_ATTENDANCE_DEVICE_STATE],
  })
  const stateLabels = useMemo(
    () =>
      (keysMap.get(APP_CONSTANT_KEY.HRM.WIFI_ATTENDANCE_DEVICE_STATE) as
        | Record<string, string>
        | undefined) || {},
    [keysMap]
  )

  const columns: ColumnDef<AttendanceWifiDevice>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã wifi chấm công',
        meta: { width: 'w-48' },
      },
      {
        accessorKey: 'name',
        header: 'Tên wifi chấm công',
        meta: { width: 'w-64', sortable: true },
      },
      {
        accessorKey: 'branch.name',
        header: 'Chi nhánh',
        meta: { width: 'w-40' },
      },
      {
        accessorKey: 'block.name',
        header: 'Khối',
        meta: { width: 'w-40' },
      },
      {
        accessorKey: 'bssids_display',
        header: 'BSSID',
        meta: { width: 'w-40' },
        cell: ({ row }) => {
          const list = getBssidsList(row.original)
          if (list.length === 0) return '-'
          return (
            <Flex direction="column" gap="1">
              {list.map((bssid) => (
                <Text key={bssid} as="span" className="text-content-dark-1">
                  {bssid}
                </Text>
              ))}
            </Flex>
          )
        },
      },
      {
        accessorKey: 'state',
        header: 'Trạng thái sử dụng',
        meta: { width: 'w-40' },
        cell: ({ row }) => {
          const state = row.original.state
          const label = (state && stateLabels[state]) || '-'
          const variant =
            state === AttendanceWifiDeviceState.in_use
              ? ColoredValueVariant.GREEN
              : ColoredValueVariant.GREY

          return <Chip label={label} variant={variant} size="small" />
        },
      },
    ],
    [stateLabels]
  )

  const actions: TableAction<AttendanceWifiDevice>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.ATTENDANCE_WIFI_DEVICE_DETAIL.replace(':id', String(record.id)), {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('retrieve', 'wifi_attendance_device'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.ATTENDANCE_WIFI_DEVICE_EDIT.replace(':id', String(record.id)), {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('update', 'wifi_attendance_device'),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => onDeleteDevice?.(record),
        show: () => ability.can('destroy', 'wifi_attendance_device'),
      },
    ],
    [ability, onDeleteDevice, navigate]
  )

  // Sticky header - scroll container is the div at page level (overflow-x-auto + overflow-y-auto)
  useEffect(() => {
    let cleanup: (() => void) | null = null

    const timeoutId = setTimeout(() => {
      const scrollContainer = document.querySelector(
        '[class*="overflow-x-auto"][class*="overflow-y-auto"]'
      ) as HTMLElement
      if (!scrollContainer) return

      const table = scrollContainer.querySelector('table') as HTMLElement
      if (!table) return

      const thead = table.querySelector('thead') as HTMLElement
      if (!thead) return

      const navBar = document.querySelector('[data-name="Header"]') as HTMLElement

      const updateStickyTop = () => {
        if (!scrollContainer || !navBar) return

        const scrollContainerRect = scrollContainer.getBoundingClientRect()
        const navBarRect = navBar.getBoundingClientRect()
        const scrollContainerTop = scrollContainerRect.top
        const navBarBottom = navBarRect.bottom

        let topOffset = 0
        if (scrollContainerTop < navBarBottom) {
          topOffset = Math.max(0, navBarBottom - scrollContainerTop)
        }

        thead.style.top = `${topOffset}px`
      }

      updateStickyTop()

      const scrollHandler = () => {
        updateStickyTop()
      }
      scrollContainer.addEventListener('scroll', scrollHandler)
      window.addEventListener('scroll', scrollHandler)
      window.addEventListener('resize', updateStickyTop)

      cleanup = () => {
        scrollContainer.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('resize', updateStickyTop)
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      if (cleanup) {
        cleanup()
      }
    }
  }, [data])

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
      disableInnerOverflow={true}
      paginationPosition="static"
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

export default WifiAttendanceDeviceTable
