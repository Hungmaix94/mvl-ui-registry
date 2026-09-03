import { useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { IconArrowscounterclockwise, IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { type ColumnDef, Table, type TableAction, Chip } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { APP_PATH } from '@/routes'
import { type AttendanceDevice } from '@/features/attendance/services/attendance-device-service'
import { ColoredValueVariant } from '@/api/schema.ts'
import { useAbility } from '@/lib/ability.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'

type AttendanceDeviceTableProps = {
  data: AttendanceDevice[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteDevice?: (device: AttendanceDevice) => void
  onClearFilter?: () => void
  onCheckConnect?: (device: AttendanceDevice) => void
  hasFilter?: boolean
}

const AttendanceDeviceTable = ({
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
  onCheckConnect,
  hasFilter,
}: AttendanceDeviceTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.ATTENDANCE_GEOLOCATION_STATUS,
      APP_CONSTANT_KEY.HRM.WIFI_ATTENDANCE_DEVICE_STATE,
    ],
  })
  const statusLabels = useMemo(
    () =>
      (keysMap.get(APP_CONSTANT_KEY.HRM.WIFI_ATTENDANCE_DEVICE_STATE) as
        | Record<string, string>
        | undefined) || {},
    [keysMap]
  )

  const enableLabels = useMemo(
    () =>
      (keysMap.get(APP_CONSTANT_KEY.HRM.ATTENDANCE_GEOLOCATION_STATUS) as
        | Record<string, string>
        | undefined) || {},
    [keysMap]
  )

  const columns: ColumnDef<AttendanceDevice>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã máy chấm công',
        meta: {
          width: 'w-48',
        },
      },
      {
        accessorKey: 'name',
        header: 'Tên máy chấm công',
        meta: {
          width: 'w-48',
          sortable: true,
        },
      },
      {
        accessorKey: 'block.branch.name',
        header: 'Chi nhánh',
        meta: {
          width: 'w-40',
        },
      },
      {
        accessorKey: 'block.name',
        header: 'Khối',
        meta: {
          width: 'w-40',
        },
      },
      {
        accessorKey: 'is_enabled',
        header: 'Trạng thái sử dụng',
        cell: ({ row }) => {
          const isEnabled = row.original.is_enabled
          const statusKey = isEnabled ? 'in_use' : 'not_in_use'
          const label = statusLabels[statusKey] || '-'
          return (
            <Chip
              label={label}
              variant={isEnabled ? ColoredValueVariant.GREEN : ColoredValueVariant.GREY}
              size="small"
            />
          )
        },
        meta: {
          width: 'w-40',
        },
      },
      {
        accessorKey: 'is_connected',
        header: 'Trạng thái kết nối',
        cell: ({ row }) => {
          const isConnected = row.original.is_connected
          const enableKey = isConnected ? 'active' : 'inactive'
          const label = enableLabels[enableKey] || '-'
          return (
            <Chip
              label={label}
              variant={isConnected ? ColoredValueVariant.GREEN : ColoredValueVariant.RED}
              size="small"
              showDot
            />
          )
        },
        meta: {
          width: '150px',
        },
      },
    ],
    [statusLabels, enableLabels]
  )

  const actions: TableAction<AttendanceDevice>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.ATTENDANCE_DEVICE_DETAIL.replace(':id', String(record.id)), {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('retrieve', 'attendance_device'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.ATTENDANCE_DEVICE_EDIT.replace(':id', String(record.id)), {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('update', 'attendance_device'),
      },
      {
        label: 'Kết nối lại',
        icon: <IconArrowscounterclockwise size={16} />,
        onClick: (record) => {
          onCheckConnect?.(record)
        },
        show: (record) =>
          !record.is_connected && ability.can('check_connection', 'attendance_device'),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeleteDevice?.(record)
        },
        show: () => ability.can('destroy', 'attendance_device'),
      },
    ],
    [ability, onDeleteDevice, navigate, onCheckConnect]
  )

  // Sticky header logic - find scroll container from page level
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
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      disableInnerOverflow={true}
      paginationPosition="static"
      className="flex-1"
    />
  )
}

export default AttendanceDeviceTable
