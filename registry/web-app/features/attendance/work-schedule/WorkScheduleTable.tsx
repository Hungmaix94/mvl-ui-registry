import { useMemo } from 'react'

import { Chip, type ColumnDef, Table } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import TableError from '@/components/ui/table/TableError'
import { type WorkSchedule } from '@/services/common-service'

type WorkScheduleTableProps = {
  data: WorkSchedule[]
  isLoading: boolean
  error: Error | null
}

const WorkScheduleTable = ({ data, isLoading, error }: WorkScheduleTableProps) => {
  // Map weekday numbers to Vietnamese day names
  const getWeekdayName = (weekday: number) => {
    const weekdayMap: Record<number, string> = {
      2: 'Thứ 2',
      3: 'Thứ 3',
      4: 'Thứ 4',
      5: 'Thứ 5',
      6: 'Thứ 6',
      7: 'Thứ 7',
      8: 'Chủ nhật',
    }
    return weekdayMap[weekday] || '-'
  }

  const columns: ColumnDef<WorkSchedule>[] = useMemo(
    () => [
      {
        accessorKey: 'weekday',
        header: 'Thứ',
        cell: ({ row }) => getWeekdayName(row.original.weekday),
        meta: {
          width: 'w-28',
        },
      },
      {
        accessorKey: 'branch_name',
        header: 'Chi nhánh',
        cell: ({ row }) => {
          const branchName = row.original.branch_name
          return (
            <span className="text-content-dark-1 text-sm" title={branchName || ''}>
              {branchName || '—'}
            </span>
          )
        },
        meta: {
          width: 'w-40',
        },
      },
      {
        accessorKey: 'branch',
        header: 'Áp dụng toàn hệ thống',
        cell: ({ row }) => {
          const isGlobal = row.original.branch == null
          return (
            <Chip
              label={isGlobal ? 'Có' : 'Không'}
              variant={isGlobal ? ColoredValueVariant.GREEN : ColoredValueVariant.GREY}
              size="small"
            />
          )
        },
        meta: {
          width: 'w-44',
          align: 'center',
        },
      },
      {
        accessorKey: 'morning_time',
        header: 'Buổi sáng',
        cell: ({ row }) => row.original.morning_time,
        meta: {
          width: 'w-32',
        },
      },
      {
        accessorKey: 'noon_time',
        header: 'Buổi trưa',
        cell: ({ row }) => row.original.noon_time,
        meta: {
          width: 'w-32',
        },
      },
      {
        accessorKey: 'afternoon_time',
        header: 'Buổi chiều',
        cell: ({ row }) => row.original.afternoon_time,
        meta: {
          width: 'w-32',
        },
      },
      {
        accessorKey: 'allowed_late_minutes',
        header: 'Được phép đi trễ (phút)',
        cell: ({ row }) =>
          row.original.allowed_late_minutes != null
            ? `${row.original.allowed_late_minutes} phút`
            : '',

        meta: {
          width: 'w-48',
        },
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        cell: ({ row }) => row.original.note,
        meta: {
          width: 'w-64',
        },
      },
    ],
    []
  )

  if (error) {
    return <TableError />
  }

  return (
    <Table
      data={data}
      columns={columns}
      showSTT
      enablePagination={false}
      isLoading={isLoading}
      className="flex-1"
    />
  )
}

export default WorkScheduleTable
