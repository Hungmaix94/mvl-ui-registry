import { useMemo } from 'react'
import { Chip, ColumnDef, Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { type ProposalMaternityLeave } from '@/features/decision-and-proposal/services/proposal-leave-service'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { Flex } from '@radix-ui/themes'
import { useProposalStatusMapping } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalStatusMapping'
import { useProposalRowActions } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalRowActions'
import { ProposalType } from '@/constants/api-schema-aliases'

type MaternityLeaveTableProps = {
  data: ProposalMaternityLeave[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onClearFilter?: () => void
  hasFilter: boolean
}

const MaternityLeaveTable = ({
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
}: MaternityLeaveTableProps) => {
  const statusMapping = useProposalStatusMapping()

  // Columns
  const columns: ColumnDef<ProposalMaternityLeave>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã đề xuất',
        cell: ({ getValue }) => {
          const code = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm" title={code}>
              {code || '-'}
            </span>
          )
        },
        meta: { width: 'w-[100px]', sortable: true },
      },
      {
        accessorKey: 'created_by',
        header: 'Nhân viên đề xuất',
        cell: ({ getValue }) => {
          const employee = getValue() as ProposalMaternityLeave['created_by']
          return (
            <Flex
              direction="column"
              className="text-content-dark-1 text-sm"
              title={`Mã: ${employee.code}\nTên: ${employee.fullname}`}
            >
              <span>{employee.code}</span>
              <span>{employee.fullname}</span>
            </Flex>
          )
        },
        meta: { width: 'w-[200px]', sortable: false },
      },
      {
        accessorKey: 'created_at',
        header: 'Ngày tạo đề xuất',
        cell: ({ getValue }) => {
          const date = getValue() as string | null | undefined
          const display = date ? formatDate(date) : '-'
          return (
            <span className="text-content-dark-1 text-sm" title={display}>
              {display}
            </span>
          )
        },
        meta: { width: 'w-[120px]', sortable: false },
      },
      {
        accessorKey: 'date_range_display',
        header: 'Ngày bắt đầu - kết thúc',
        cell: ({ row }) => {
          const startDate = row.original.maternity_leave_start_date
          const endDate = row.original.maternity_leave_end_date
          const display =
            startDate && endDate
              ? `${formatDate(startDate)} - ${formatDate(endDate)}`
              : startDate
                ? formatDate(startDate)
                : endDate
                  ? formatDate(endDate)
                  : '-'
          return (
            <span className="text-content-dark-1 text-sm" title={display}>
              {display || '-'}
            </span>
          )
        },
        meta: { width: 'w-[170px]', sortable: false },
      },
      {
        accessorKey: 'maternity_leave_estimated_due_date',
        header: 'Ngày sinh dự kiến',
        cell: ({ row }) => {
          const display = formatDate(row.original.maternity_leave_estimated_due_date)
          return (
            <span className="text-content-dark-1 text-sm" title={display}>
              {display || '-'}
            </span>
          )
        },
        meta: { width: 'w-[120px]', sortable: false },
      },
      {
        accessorKey: 'colored_proposal_status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const colored = getValue() as { value?: string; variant?: string } | undefined
          if (!colored?.value)
            return <Chip label="-" variant={ColoredValueVariant.GREY} size="small" />

          // Map API value to constants display value
          const displayValue = statusMapping[colored.value] || colored.value

          return <Chip label={displayValue} variant={colored.variant as any} size="small" />
        },
        meta: { width: 'w-[110px]', sortable: true, align: 'center' },
      },
    ],
    [statusMapping]
  )

  const actions = useProposalRowActions<ProposalMaternityLeave>({
    proposalType: ProposalType.maternity_leave,
  })

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
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      className="flex-1"
    />
  )
}

export default MaternityLeaveTable
