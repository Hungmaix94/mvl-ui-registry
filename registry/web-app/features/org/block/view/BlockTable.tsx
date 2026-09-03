import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { type ColumnDef, Table, type TableAction, Chip } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { APP_PATH } from '@/routes'
import { type Block } from '@/features/org/services/block-service'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { useAbility } from '@/lib/ability.ts'

type BlockTableProps = {
  data: Block[]
  isLoading?: boolean
  error?: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteBlock?: (block: Block) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const BlockTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteBlock,
  onClearFilter,
  hasFilter,
}: BlockTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMap } = useAppConstant({ module: 'hrm', keys: [APP_CONSTANT_KEY.BLOCK.TYPE] })
  const blockTypeLabels = useMemo(() => {
    if (keysMap.has(APP_CONSTANT_KEY.BLOCK.TYPE)) {
      return keysMap.get(APP_CONSTANT_KEY.BLOCK.TYPE) || {}
    }
    return { business: 'Kinh doanh', support: 'Hỗ trợ' }
  }, [keysMap])

  const columns: ColumnDef<Block>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã',
        meta: {
          width: 'w-32',
          sortable: true,
        },
      },
      {
        accessorKey: 'name',
        header: 'Tên khối',
        meta: {
          width: 'w-48',
          sortable: true,
        },
      },
      {
        accessorKey: 'block_type',
        header: 'Loại khối',
        cell: ({ row }) => {
          const blockType = row.original.block_type
          const isBusiness = blockType === 'business'
          const label = blockTypeLabels[blockType] || blockType
          return (
            <Chip
              label={label}
              variant={isBusiness ? ColoredValueVariant.BLUE : ColoredValueVariant.GREEN}
              size="small"
            />
          )
        },
        meta: {
          width: 'w-40',
          sortable: true,
        },
      },
      {
        accessorKey: 'branch',
        header: 'Chi nhánh',
        cell: ({ row }) => {
          return (
            <span className="text-content-dark-2 text-sm">{row.original.branch?.name || '-'}</span>
          )
        },
        meta: {
          width: 'w-64',
        },
      },
      {
        accessorKey: 'director',
        header: 'Giám đốc khối',
        cell: ({ row }) => {
          const director = row.original.director
          if (!director) {
            return <span className="text-content-dark-2 text-sm">-</span>
          }
          return (
            <div className="text-content-dark-2 text-sm">
              <div>{director.code || '-'}</div>
              <div className="break-words">{director.fullname || '-'}</div>
            </div>
          )
        },
        meta: {
          width: 'w-56',
        },
      },
    ],
    [blockTypeLabels]
  )

  const actions: TableAction<Block>[] = useMemo(() => {
    const tableActions: TableAction<Block>[] = []

    if (ability.can('retrieve', 'block')) {
      tableActions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.BLOCK_MANAGEMENT_DETAIL.replace(':id', String(record.id))),
      })
    }

    if (ability.can('update', 'block')) {
      tableActions.push({
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(APP_PATH.BLOCK_MANAGEMENT_EDIT.replace(':id', String(record.id))),
      })
    }

    if (ability.can('destroy', 'block')) {
      tableActions.push({
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeleteBlock?.(record)
        },
      })
    }

    return tableActions
  }, [ability, onDeleteBlock, navigate])

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

export default BlockTable
