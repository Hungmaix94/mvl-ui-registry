import { useMemo } from 'react'
import { Chip, ColumnDef, Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { type ProposalJobTransfer } from '@/features/decision-and-proposal/services/proposal-misc-service'
import { ColoredValueVariant } from '@/api/schema.ts'
import { Flex } from '@radix-ui/themes'
import { useProposalStatusMapping } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalStatusMapping'
import { useProposalRowActions } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalRowActions'
import { formatDate } from '@/utils/date-utils.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { ProposalType } from '@/constants/api-schema-aliases'

type JobTransferTableProps = {
  data: ProposalJobTransfer[]
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

const JobTransferTable = ({
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
}: JobTransferTableProps) => {
  const statusMapping = useProposalStatusMapping()

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_JOB_TRANSFER_TRANSFER_STATUS_CHOICES],
  })
  const transferStatusLabels = useMemo(() => {
    const raw = keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_JOB_TRANSFER_TRANSFER_STATUS_CHOICES)
    return raw && typeof raw === 'object' ? raw : {}
  }, [keysMap])

  // Columns
  const columns: ColumnDef<ProposalJobTransfer>[] = useMemo(
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
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        accessorKey: 'created_by',
        header: 'Nhân viên đề xuất',
        cell: ({ getValue }) => {
          const employee = getValue() as ProposalJobTransfer['created_by']
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
        meta: { width: 'w-[140px]', sortable: false },
      },
      {
        accessorKey: 'job_transfer_new_branch',
        header: 'Chi nhánh mới',
        cell: ({ row }) => {
          const display = row.original.job_transfer_new_branch?.name || '-'
          return (
            <span className="text-content-dark-1 text-sm" title={display}>
              {display || '-'}
            </span>
          )
        },
        meta: { width: 'w-[140px]', sortable: false },
      },
      {
        accessorKey: 'job_transfer_new_block',
        header: 'Khối mới',
        cell: ({ row }) => {
          const display = row.original.job_transfer_new_block?.name || '-'
          return (
            <span className="text-content-dark-1 text-sm" title={display}>
              {display || '-'}
            </span>
          )
        },
        meta: { width: 'w-[140px]', sortable: false },
      },
      {
        accessorKey: 'job_transfer_new_department',
        header: 'Phòng ban mới',
        cell: ({ row }) => {
          const display = row.original.job_transfer_new_department?.name || '-'
          return (
            <span className="text-content-dark-1 text-sm" title={display}>
              {display || '-'}
            </span>
          )
        },
        meta: { width: 'w-[130px]', sortable: false },
      },
      {
        accessorKey: 'job_transfer_transfer_status',
        header: 'Trạng thái điều chuyển',
        cell: ({ getValue }) => {
          const value = getValue() as string
          const display = transferStatusLabels[value] || value || '-'
          return (
            <span className="text-content-dark-1 text-sm" title={display}>
              {display}
            </span>
          )
        },
        meta: { width: 'w-[160px]', sortable: false },
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
        meta: { width: 'w-[110px]', align: 'center', sortable: true },
      },
    ],
    [statusMapping, transferStatusLabels]
  )

  const actions = useProposalRowActions<ProposalJobTransfer>({
    proposalType: ProposalType.job_transfer,
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

export default JobTransferTable
