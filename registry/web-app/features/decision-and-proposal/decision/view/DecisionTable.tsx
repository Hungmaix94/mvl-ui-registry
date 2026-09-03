import { useMemo } from 'react'
import { Chip, ColumnDef, Table, TableAction } from '@/components/ui'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { type Decision } from '@/features/decision-and-proposal/services/decision-service'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { useAbility } from '@/lib/ability.ts'
import TableError from '@/components/ui/table/TableError'

type DecisionTableProps = {
  data: Decision[]
  isLoading?: boolean
  error?: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteDecision?: (record: Decision) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const DecisionTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteDecision,
  onClearFilter,
  hasFilter,
}: DecisionTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.DECISION_SIGNING_STATUS],
  })

  const getSigningStatusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.DECISION_SIGNING_STATUS)
      ? keysMap.get(APP_CONSTANT_KEY.HRM.DECISION_SIGNING_STATUS) || {}
      : {}
  }, [keysMap])

  // Columns
  const columns: ColumnDef<Decision>[] = useMemo(
    () => [
      {
        accessorKey: 'decision_number',
        header: 'Số quyết định',
        meta: { width: 'w-[140px]', sortable: true },
      },
      {
        accessorKey: 'name',
        header: 'Tên quyết định',
        meta: { width: 'w-[240px]', sortable: true },
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined
          return <span title={value || '-'}>{value || '-'}</span>
        },
      },
      {
        accessorKey: 'signer',
        header: 'Người ký',
        cell: ({ getValue }) => {
          const signer = getValue() as { fullname?: string; code?: string } | undefined
          if (!signer) return '-'
          const displayText = signer.fullname || signer.code || '-'
          return <span title={displayText}>{displayText}</span>
        },
        meta: { width: 'w-[180px]', sortable: true },
      },
      {
        accessorKey: 'signing_date',
        header: 'Ngày ký',
        cell: ({ getValue }) => {
          const date = getValue() as string | undefined
          return <span>{date ? formatDate(date, DATE_FORMAT) : '-'}</span>
        },
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        accessorKey: 'effective_date',
        header: 'Ngày hiệu lực',
        cell: ({ getValue }) => {
          const date = getValue() as string | undefined
          return <span>{date ? formatDate(date, DATE_FORMAT) : '-'}</span>
        },
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        accessorKey: 'colored_signing_status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const colored = getValue() as { value?: string; variant?: string } | undefined
          if (!colored?.value)
            return <Chip label="-" variant={ColoredValueVariant.GREY} size="small" />

          // Map API value to constants display value
          const displayValue = getSigningStatusMapping[colored.value] || colored.value

          return <Chip label={displayValue} variant={colored.variant as any} size="small" />
        },
        meta: { width: 'w-[140px]', sortable: true },
      },
    ],
    [getSigningStatusMapping]
  )

  // Row actions
  const actions: TableAction<Decision>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.DECISION_MANAGEMENT_DETAIL.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('retrieve', 'decision'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.DECISION_MANAGEMENT_EDIT.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
        show: () => ability.can('update', 'decision'),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => onDeleteDecision?.(record),
        show: () => ability.can('destroy', 'decision'),
      },
    ],
    [navigate, onDeleteDecision, ability]
  )

  // Parse ordering from URL format to table format
  const handleSortingChange = (field: string, direction: 'asc' | 'desc' | null) => {
    onSortingChange(field, direction)
  }

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
      enablePagination
      manualPagination
      manualSorting
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={handleSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      className="flex-1"
    />
  )
}

export default DecisionTable
