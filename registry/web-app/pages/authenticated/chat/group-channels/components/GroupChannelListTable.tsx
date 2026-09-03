import { useMemo } from 'react'
import { IconPencilsimple, IconTrash, IconUsercirclegear } from '@/assets/icons'
import { Pause, Play } from 'lucide-react'
import { type ColumnDef, Table, type TableAction, Chip } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { EmployeeProfileLink } from '@/components/commons'

import { GroupChannel, ChannelState } from '@/features/chat/types'
import { getChannelStateVariant } from '@/features/chat/utils/channel-state'
import { useAbility } from '@/lib/ability'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { format } from 'date-fns'

type GroupChannelListTableProps = {
  data: GroupChannel[]
  isLoading: boolean
  error?: Error | null
  totalRecords?: number
  pageSize?: number
  currentPageIndex?: number
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  handleCreateNew?: () => void
  handleEdit?: (channel: GroupChannel) => void
  handleDelete?: (channel: GroupChannel) => void
  handleDisable?: (channel: GroupChannel) => void
  handleEnable?: (channel: GroupChannel) => void
  handleManageAdmins?: (channel: GroupChannel) => void
}

const GroupChannelListTable = ({
  data,
  isLoading,
  error,
  totalRecords = 0,
  pageSize = 10,
  currentPageIndex = 1,
  onPaginationChange,

  handleEdit,
  handleDelete,
  handleDisable,
  handleEnable,
  handleManageAdmins,
}: GroupChannelListTableProps) => {
  const ability = useAbility()

  const { keysMap } = useAppConstant({
    module: 'chat',
    keys: [
      APP_CONSTANT_KEY.CHAT.GROUP_CHANNEL.WRITE_POLICY_CHOICES,
      APP_CONSTANT_KEY.CHAT.GROUP_CHANNEL.STATE_CHOICES,
    ],
  })

  const writePolicyMap = keysMap.get(
    APP_CONSTANT_KEY.CHAT.GROUP_CHANNEL.WRITE_POLICY_CHOICES
  ) as Record<string, string>

  const stateMap = keysMap.get(APP_CONSTANT_KEY.CHAT.GROUP_CHANNEL.STATE_CHOICES) as Record<
    string,
    string
  >

  const columns = useMemo<ColumnDef<GroupChannel>[]>(
    () => [
      {
        header: 'Tên nhóm',
        accessorKey: 'name',
        cell: ({ row }) => <div className="font-medium text-gray-900">{row.original.name}</div>,
      },
      {
        header: 'Mô tả',
        accessorKey: 'description',
        cell: ({ row }) => (
          <div className="max-w-[200px] truncate" title={row.original.description}>
            {row.original.description || '-'}
          </div>
        ),
      },
      {
        header: 'Chủ sở hữu',
        accessorKey: 'owner',
        cell: ({ row }) => {
          const owner = row.original.owner
          if (!owner) return '-'
          return (
            <EmployeeProfileLink
              employeeId={owner.id}
              title={`Mã: ${owner.code}\nHọ và tên: ${owner.fullname}`}
              className="flex flex-col text-sm"
            >
              <span>{owner.code}</span>
              <span>{owner.fullname}</span>
            </EmployeeProfileLink>
          )
        },
      },
      {
        header: 'Quản trị viên',
        accessorKey: 'admins',
        cell: ({ row }) => {
          const admins = row.original.admins ?? []
          if (admins.length === 0) return '-'
          const names = admins.map((a) => a.fullname).join(', ')
          return (
            <div className="max-w-[200px] truncate" title={names}>
              {names}
            </div>
          )
        },
      },
      {
        header: 'Trạng thái',
        accessorKey: 'state',
        cell: ({ row }) => {
          const stateStr = row.original.state as string
          return (
            <Chip
              variant={getChannelStateVariant(stateStr)}
              label={stateMap?.[stateStr] || stateStr}
            />
          )
        },
      },
      {
        header: 'Quyền nhắn tin',
        accessorKey: 'write_policy',
        cell: ({ row }) => {
          const policyStr = row.original.write_policy as string
          return writePolicyMap?.[policyStr] || policyStr
        },
      },
      {
        header: 'Ngày tạo',
        accessorKey: 'created_at',
        cell: ({ row }) =>
          row.original.created_at
            ? format(new Date(row.original.created_at), 'dd/MM/yyyy HH:mm')
            : '-',
      },
    ],
    [stateMap, writePolicyMap]
  )

  const rowActions = useMemo<TableAction<GroupChannel>[]>(() => {
    return [
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={18} />,
        onClick: (row) => handleEdit?.(row),
        // show: () => ability.can('update', 'chat_channel'),
        show: () => true,
      },
      {
        label: 'Quản lý Admin',
        icon: <IconUsercirclegear size={18} />,
        onClick: (row) => handleManageAdmins?.(row),
        show: () => true,
      },
      {
        label: 'Tạm dừng',
        icon: <Pause size={18} />,
        onClick: (row) => handleDisable?.(row),
        show: (row) =>
          row.state === ChannelState.ACTIVE /* && ability.can('update', 'chat_channel') */,
      },
      {
        label: 'Kích hoạt',
        icon: <Play size={18} />,
        onClick: (row) => handleEnable?.(row),
        show: (row) =>
          row.state === ChannelState.DISABLED /* && ability.can('update', 'chat_channel') */,
      },
      {
        label: 'Xóa',
        icon: <IconTrash size={18} />,
        onClick: (row) => handleDelete?.(row),
        variant: 'danger',
        // show: () => ability.can('destroy', 'chat_channel'),
        show: () => true,
      },
    ]
  }, [handleEdit, handleManageAdmins, handleDisable, handleEnable, handleDelete, ability])

  if (error) {
    return <TableError message={error.message} />
  }

  return (
    <Table
      columns={columns}
      data={data}
      isLoading={isLoading}
      showActions={true}
      rowActions={rowActions}
      totalRecords={totalRecords}
      pageSize={pageSize}
      currentPageIndex={currentPageIndex}
      onPaginationChange={onPaginationChange}
      manualPagination={true}
      pageCount={Math.ceil(totalRecords / pageSize)}
    />
  )
}

export default GroupChannelListTable
