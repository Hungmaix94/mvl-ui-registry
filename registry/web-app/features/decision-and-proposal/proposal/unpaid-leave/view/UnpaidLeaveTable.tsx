import { useMemo } from 'react'
import { Chip, ColumnDef, Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { type ProposalUnpaidLeave } from '@/features/decision-and-proposal/services/proposal-leave-service'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { Flex } from '@radix-ui/themes'
import { useProposalStatusMapping } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalStatusMapping'
import { useProposalRowActions } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalRowActions'
import { ProposalType } from '@/constants/api-schema-aliases'

type UnpaidLeaveTableProps = {
  data: ProposalUnpaidLeave[]
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

const UnpaidLeaveTable = ({
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
}: UnpaidLeaveTableProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [
      APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES,
      APP_CONSTANT_KEY.HRM.PROPOSAL_PAID_LEAVE_SHIFT_CHOICES,
    ],
  })
  const statusMapping = useProposalStatusMapping()

  const getShiftMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_PAID_LEAVE_SHIFT_CHOICES)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_PAID_LEAVE_SHIFT_CHOICES) as Record<
          string,
          string
        >) || {}
      : {}
  }, [keysMap])

  // Columns
  const columns: ColumnDef<ProposalUnpaidLeave>[] = useMemo(
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
        cell: ({ row }) => {
          const employee = row.original.created_by
          const code = employee?.code ?? '-'
          const fullname = employee?.fullname ?? '-'
          const branchName = employee?.branch?.name ?? '-'
          const blockName = employee?.block?.name ?? '-'
          const departmentName = employee?.department?.name ?? '-'
          const title = `Tên: ${fullname}\nMã: ${code}\nChi nhánh: ${branchName}\nKhối: ${blockName}\nPhòng ban: ${departmentName}`
          return (
            <Flex direction="column" width="100%" gap="1" title={title}>
              <span className="text-content-dark-1 typo-body-sm-medium">{fullname}</span>
              <span className="text-content-dark-2 text-sm">Mã: {code}</span>
              <Flex
                direction="column"
                align="start"
                gap="1"
                className="text-content-dark-3 text-xs"
              >
                <span>• Chi nhánh: {branchName}</span>
                <span>• Khối: {blockName}</span>
                <span>• Phòng ban: {departmentName}</span>
              </Flex>
            </Flex>
          )
        },
        meta: { width: '240px', sortable: false },
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
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        accessorKey: 'date_range_display',
        header: 'Ngày bắt đầu - kết thúc',
        cell: ({ row }) => {
          const startDate = row.original.unpaid_leave_start_date
          const endDate = row.original.unpaid_leave_end_date
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
        meta: { width: 'w-[230px]', sortable: false },
      },
      {
        accessorKey: 'unpaid_leave_shift',
        header: 'Buổi',
        cell: ({ getValue }) => {
          const value = getValue() as ProposalUnpaidLeave['unpaid_leave_shift']
          const display = value ? getShiftMapping[value] : '-'
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
        meta: { width: 'w-[110px]', sortable: true },
      },
    ],
    [statusMapping, getShiftMapping]
  )

  const actions = useProposalRowActions<ProposalUnpaidLeave>({
    proposalType: ProposalType.unpaid_leave,
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

export default UnpaidLeaveTable
