import { useMemo } from 'react'
import { Chip, ColumnDef, Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { type ProposalDeviceChange } from '@/features/decision-and-proposal/services/proposal-misc-service'
import { ColoredValueVariant } from '@/api/schema.ts'
import { Flex } from '@radix-ui/themes'
import { useProposalStatusMapping } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalStatusMapping'
import { useProposalRowActions } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalRowActions'
import { formatDate } from '@/utils/date-utils.ts'
import { ProposalType } from '@/constants/api-schema-aliases'

type DeviceChangeTableProps = {
  data: ProposalDeviceChange[]
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

const DeviceChangeTable = ({
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
}: DeviceChangeTableProps) => {
  const statusMapping = useProposalStatusMapping()

  // Columns
  const columns: ColumnDef<ProposalDeviceChange>[] = useMemo(
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
          const employee = getValue() as ProposalDeviceChange['created_by']
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
        accessorKey: 'colored_proposal_status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const colored = getValue() as ProposalDeviceChange['colored_proposal_status']
          if (!colored?.value) {
            return <Chip label="-" variant={ColoredValueVariant.GREY} size="small" />
          }

          return (
            <Chip
              label={statusMapping[colored.value] || colored.value}
              variant={colored.variant}
              size="small"
            />
          )
        },
        meta: { width: 'w-[110px]', align: 'center', sortable: true },
      },
    ],
    [statusMapping]
  )

  const actions = useProposalRowActions<ProposalDeviceChange>({
    proposalType: ProposalType.device_change,
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

export default DeviceChangeTable
