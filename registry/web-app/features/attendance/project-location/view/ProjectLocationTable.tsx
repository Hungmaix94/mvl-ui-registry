import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { type ColumnDef, Table, type TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { APP_PATH } from '@/routes'
import { type AttendanceGeolocation } from '@/features/attendance/services/attendance-geolocation-service'
import { useAbility } from '@/lib/ability'

type ProjectLocationTableProps = {
  data: AttendanceGeolocation[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteProjectLocation?: (projectLocation: AttendanceGeolocation) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const ProjectLocationTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteProjectLocation,
  onClearFilter,
  hasFilter,
}: ProjectLocationTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const columns: ColumnDef<AttendanceGeolocation>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã định vị',
        meta: {
          width: 'flex-1',
          sortable: true,
        },
      },
      {
        accessorKey: 'name',
        header: 'Tên định vị',
        meta: {
          width: 'flex-1',
          sortable: true,
        },
      },
      {
        accessorKey: 'project.name',
        header: 'Dự án',
        meta: {
          width: 'flex-1',
        },
      },
      {
        accessorKey: 'address',
        header: 'Địa chỉ',
        meta: {
          width: 'w-[250px]',
        },
      },
      {
        accessorKey: 'radius_m',
        header: 'Bán kính (m)',
        meta: {
          width: 'flex-1',
        },
      },
    ],
    []
  )

  const actions: TableAction<AttendanceGeolocation>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.PROJECT_LOCATION_DETAIL.replace(':id', String(record.id)), {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('retrieve', 'attendance_geolocation'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.PROJECT_LOCATION_EDIT.replace(':id', String(record.id)), {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('update', 'attendance_geolocation'),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeleteProjectLocation?.(record)
        },
        show: () => ability.can('destroy', 'attendance_geolocation'),
      },
    ],
    [ability, onDeleteProjectLocation, navigate]
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

export default ProjectLocationTable
