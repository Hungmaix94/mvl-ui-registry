import { useMemo } from 'react'
import { Chip, ColumnDef, Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { type ProposalOvertimeWork } from '@/features/decision-and-proposal/services/proposal-misc-service'
import { ColoredValueVariant } from '@/api/schema.ts'
import { Flex } from '@radix-ui/themes'
import { useProposalStatusMapping } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalStatusMapping'
import { useProposalVerifyStatusMapping } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalVerifyStatusMapping'
import { useProposalRowActions } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalRowActions'
import { formatDate } from '@/utils/date-utils.ts'
import { ProposalType } from '@/constants/api-schema-aliases'

type OvertimeWorkTableProps = {
  data: ProposalOvertimeWork[]
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

const OvertimeWorkTable = ({
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
}: OvertimeWorkTableProps) => {
  const statusMapping = useProposalStatusMapping()
  const verifyStatusMapping = useProposalVerifyStatusMapping()

  // Columns
  const columns: ColumnDef<ProposalOvertimeWork>[] = useMemo(
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
        meta: { width: 'w-[150px]', sortable: true },
      },
      {
        accessorKey: 'created_by',
        header: 'Nhân viên đề xuất',
        cell: ({ getValue }) => {
          const employee = getValue() as ProposalOvertimeWork['created_by']
          return (
            <Flex
              className="text-content-dark-1 gap-2 text-sm"
              title={`Mã: ${employee.code}\nTên: ${employee.fullname}`}
            >
              <span>{employee.code}</span> -<span>{employee.fullname}</span>
            </Flex>
          )
        },
        meta: { width: 'w-[300px]', sortable: false },
      },
      {
        accessorKey: 'created_by.branch.name',
        id: 'branch',
        header: 'Chi nhánh',
        cell: ({ row }) => {
          const value = row.original.created_by?.branch?.name || '-'
          return (
            <span className="text-content-dark-1 text-sm" title={value}>
              {value}
            </span>
          )
        },
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        accessorKey: 'created_by.block.name',
        id: 'block',
        header: 'Khối',
        cell: ({ row }) => {
          const value = row.original.created_by?.block?.name || '-'
          return (
            <span className="text-content-dark-1 text-sm" title={value}>
              {value}
            </span>
          )
        },
        meta: { width: 'w-[120px]', sortable: false },
      },
      {
        accessorKey: 'created_by.department.name',
        id: 'department',
        header: 'Phòng ban',
        cell: ({ row }) => {
          const value = row.original.created_by?.department?.name || '-'
          return (
            <span className="text-content-dark-1 text-sm" title={value}>
              {value}
            </span>
          )
        },
        meta: { width: 'w-[120px]', sortable: false },
      },
      {
        accessorKey: 'created_by.position.name',
        id: 'position',
        header: 'Chức vụ',
        cell: ({ row }) => {
          const value = row.original.created_by?.position?.name || '-'
          return (
            <span className="text-content-dark-1 text-sm" title={value}>
              {value}
            </span>
          )
        },
        meta: { width: 'w-[120px]', sortable: false },
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
        meta: { width: 'w-[140px]', sortable: false },
      },
      {
        accessorKey: 'colored_verify_status',
        header: 'Trạng thái xác nhận',
        cell: ({ getValue }) => {
          const colored = getValue() as { value?: string; variant?: string } | undefined
          if (!colored?.value)
            return <Chip label="-" variant={ColoredValueVariant.GREY} size="small" />

          const displayValue = verifyStatusMapping[colored.value] || colored.value

          return <Chip label={displayValue} variant={colored.variant as any} size="small" />
        },
        meta: { width: 'w-[140px]', sortable: false, align: 'center' },
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
    [statusMapping, verifyStatusMapping]
  )

  const actions = useProposalRowActions<ProposalOvertimeWork>({
    proposalType: ProposalType.overtime_work,
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

export default OvertimeWorkTable
