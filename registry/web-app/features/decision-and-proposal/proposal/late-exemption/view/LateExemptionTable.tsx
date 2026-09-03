import { useMemo } from 'react'
import { Chip, ColumnDef, Table } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { type ProposalLateExemption } from '@/features/decision-and-proposal/services/proposal-misc-service'
import { ColoredValueVariant } from '@/api/schema.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { Flex } from '@radix-ui/themes'
import { useProposalStatusMapping } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalStatusMapping'
import { useProposalRowActions } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalRowActions'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { ProposalType } from '@/constants/api-schema-aliases'

type LateExemptionTableProps = {
  data: ProposalLateExemption[]
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

// Format minutes to display string (e.g., "15 phút/ngày", "1 giờ/ngày", "1 giờ 30 phút/ngày")
function formatMinutesPerDay(minutes: number | null | undefined): string {
  if (!minutes || minutes === 0) return '-'

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours === 0) {
    return `${minutes} phút/ngày`
  } else if (remainingMinutes === 0) {
    return `${hours} giờ/ngày`
  } else {
    return `${hours} giờ ${remainingMinutes} phút/ngày`
  }
}

const LateExemptionTable = ({
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
}: LateExemptionTableProps) => {
  const statusMapping = useProposalStatusMapping()
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.LATE_EXEMPTION_DURATION_TYPE],
  })
  const lateExemptionDurationTypeMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.LATE_EXEMPTION_DURATION_TYPE)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.LATE_EXEMPTION_DURATION_TYPE) as Record<
          string,
          string
        >) || {}
      : {}
  }, [keysMap])

  // Columns
  const columns: ColumnDef<ProposalLateExemption>[] = useMemo(
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
          const employee = getValue() as ProposalLateExemption['created_by']
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
        meta: { width: 'w-[170px]', sortable: false },
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
          const startDate = row.original.late_exemption_start_date
          const endDate = row.original.late_exemption_end_date
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
        accessorKey: 'late_exemption_minutes',
        header: 'Số phút trễ',
        cell: ({ row }) => {
          const display = formatMinutesPerDay(row.original.late_exemption_minutes)
          return (
            <span className="text-content-dark-1 text-sm" title={display}>
              {display || '-'}
            </span>
          )
        },
        meta: { width: 'w-[120px]', sortable: false },
      },
      {
        accessorKey: 'late_exemption_duration_type',
        header: 'Loại miễn trừ trễ',
        cell: ({ row }) => {
          const durationType = row.original.late_exemption_duration_type
          const label = durationType
            ? lateExemptionDurationTypeMapping[durationType] || durationType
            : '-'
          return (
            <span className="text-content-dark-1 text-sm" title={label}>
              {label}
            </span>
          )
        },
        meta: { width: 'w-[130px]', sortable: false },
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
    [statusMapping, lateExemptionDurationTypeMapping]
  )

  const actions = useProposalRowActions<ProposalLateExemption>({
    proposalType: ProposalType.late_exemption,
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

export default LateExemptionTable
