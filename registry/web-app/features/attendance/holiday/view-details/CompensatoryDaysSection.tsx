import { useCallback, useMemo } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { ColumnDef } from '@tanstack/react-table'

import { Button, Table, type TableAction } from '@/components/ui'
import {
  useCompensatoryWorkdays,
  type CompensatoryWorkday,
} from '@/features/attendance/services/holiday-service'
import { useAbility } from '@/lib/ability'
import { IconPencilsimple, IconTrash, IconPlus, IconEye } from '@/assets/icons'
import { useCompensatoryDayDelete } from '@/features/attendance/holiday/_shares/hooks/useCompensatoryDayDelete'
import { useCompensatoryDayForm } from '@/features/attendance/holiday/_shares/hooks/useCompensatoryDayForm'
import { useDepartmentsView } from '@/features/attendance/holiday/_shares/hooks/useDepartmentsView'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { formatDate } from '@/utils/date-utils'

interface CompensatoryDaysSectionProps {
  holidayId: number
}

export const CompensatoryDaysSection = ({ holidayId }: CompensatoryDaysSectionProps) => {
  const ability = useAbility()
  const { openDeleteDialog } = useCompensatoryDayDelete(holidayId)
  const { openAddDialog, openEditDialog } = useCompensatoryDayForm(holidayId)
  const { openViewDialog } = useDepartmentsView()

  const { data: workdaysResponse, isLoading } = useCompensatoryWorkdays(holidayId)
  const workdays = workdaysResponse?.results || []

  // Get session labels from app constants
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.COMPENSATORY_WORKDAY_SESSION],
  })
  const sessionLabels: Record<string, string> =
    (keysMap.get(APP_CONSTANT_KEY.HRM.COMPENSATORY_WORKDAY_SESSION) as Record<string, string>) || {}

  const handleAdd = useCallback(() => {
    openAddDialog()
  }, [openAddDialog])

  const handleEdit = useCallback(
    (workday: CompensatoryWorkday) => {
      openEditDialog(workday)
    },
    [openEditDialog]
  )

  const handleDelete = useCallback(
    (workdayId: number) => {
      openDeleteDialog(workdayId)
    },
    [openDeleteDialog]
  )

  const columns: ColumnDef<CompensatoryWorkday>[] = [
    {
      accessorKey: 'date',
      header: 'Ngày bù',
      cell: ({ row }) => formatDate(new Date(row.original.date)),
      meta: {
        width: 'w-[200px]',
      },
    },
    {
      accessorKey: 'for_date',
      header: 'Ngày nghỉ thêm',
      cell: ({ row }) =>
        row.original.for_date ? formatDate(new Date(row.original.for_date)) : '-',
      meta: {
        width: 'w-[200px]',
      },
    },
    {
      accessorKey: 'session',
      header: 'Buổi',
      cell: ({ row }) => sessionLabels[row.original.session || 'full_day'] || '-',
      meta: {
        width: 'w-[150px]',
      },
    },
    {
      accessorKey: 'departments',
      header: 'Đơn vị áp dụng',
      cell: ({ row }) =>
        row.original.departments.length > 0 ? (
          <Flex align="center" gap="2">
            <IconEye
              onClick={() => openViewDialog(row.original.departments || [])}
              className="text-content-dark-2 h-4 w-4 cursor-pointer"
            />
          </Flex>
        ) : (
          <Text className="typo-body-md text-content-dark-2">Áp dụng cho toàn công ty</Text>
        ),
      meta: {
        width: 'w-[200px]',
      },
    },
    {
      accessorKey: 'notes',
      header: 'Ghi chú',
      cell: ({ row }) => row.original.notes || '-',
      meta: {
        width: 'flex-1',
      },
    },
  ]

  const actions = useMemo(
    (): TableAction<CompensatoryWorkday>[] => [
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple />,
        onClick: handleEdit,
        show: () => ability.can('update', 'holiday'),
      },
      {
        label: 'Xóa',
        icon: <IconTrash className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (workday) => workday && workday.id && handleDelete(workday.id),
        show: () => ability.can('destroy', 'holiday'),
      },
    ],
    [handleEdit, handleDelete, ability]
  )

  return (
    <>
      <Flex direction="column" gap="5" className="bg-background-1 rounded-lg">
        <Flex justify="between" align="center">
          <Text className="typo-body-xl-semibold text-content-dark-1">Ngày làm bù</Text>
          {ability.can('create', 'holiday') && (
            <Button variant="secondary" className="bg-neutral-30 h-9 w-9 p-2.5" onClick={handleAdd}>
              <IconPlus className="h-4 w-4" />
            </Button>
          )}
        </Flex>

        {workdays.length > 0 && (
          <Table
            columns={columns}
            data={workdays}
            showSTT={false}
            rowActions={actions}
            showActions
            isLoading={isLoading}
            className="px-0"
            enablePagination={false}
          />
        )}
      </Flex>
    </>
  )
}

export default CompensatoryDaysSection
