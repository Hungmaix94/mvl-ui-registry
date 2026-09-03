import { useCallback, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { IconEye } from '@/assets/icons'
import { Flex, Text } from '@radix-ui/themes'
import { Table } from '@/components/ui'
import type {
  Proposal,
  ProposalCombined,
} from '@/features/decision-and-proposal/services/proposal-base-service'
import TimesheetProposalStatusBadge from './TimesheetProposalStatusBadge.tsx'
import { cn } from '@/utils'
import { ColoredValueVariant } from '@/api/schema.ts'
import { useLocation, useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { ProposalType } from '@/constants/api-schema-aliases'

type TimesheetEntryProposalTableProps = {
  proposals?: Proposal[] | ProposalCombined[]
  isLoading?: boolean
}

/**
 * Get proposal detail route path based on proposal type
 */
function getProposalDetailPath(
  proposalType: ProposalType | ProposalType | null,
  proposalId: number
): string | null {
  if (!proposalType || !proposalId) {
    return null
  }

  const pathMap: Record<ProposalType, string> = {
    [ProposalType.unpaid_leave]: APP_PATH.PROPOSAL_UNPAID_LEAVE_DETAIL,
    [ProposalType.paid_leave]: APP_PATH.PROPOSAL_PAID_LEAVE_DETAIL,
    [ProposalType.overtime_work]: APP_PATH.PROPOSAL_OVERTIME_WORK_DETAIL,
    [ProposalType.late_exemption]: APP_PATH.PROPOSAL_LATE_EXEMPTION_DETAIL,
    [ProposalType.maternity_leave]: APP_PATH.PROPOSAL_MATERNITY_LEAVE_DETAIL,
    [ProposalType.post_maternity_benefits]: APP_PATH.PROPOSAL_POST_MATERNITY_BENEFIT_DETAIL,
    [ProposalType.job_transfer]: APP_PATH.PROPOSAL_JOB_TRANSFER_DETAIL,
    [ProposalType.bulk_job_transfer]: APP_PATH.PROPOSAL_BULK_JOB_TRANSFER_DETAIL,
    [ProposalType.asset_allocation]: APP_PATH.PROPOSAL_ASSET_ALLOCATION_DETAIL,
    [ProposalType.timesheet_entry_complaint]: APP_PATH.ATTENDANCE_TIMESHEET_COMPLAINT_DETAIL,
    [ProposalType.device_change]: APP_PATH.PROPOSAL_DEVICE_CHANGE_DETAIL,
    [ProposalType.return_to_work]: APP_PATH.PROPOSAL_RETURN_TO_WORK_DETAIL,
    [ProposalType.statutory_paid_leave]: APP_PATH.PROPOSAL_STATUTORY_LEAVE_DETAIL,
  }

  const path = pathMap[proposalType]
  if (!path) {
    return null
  }

  // Replace :id with actual proposal id
  const detailPath = path.replace(':id', proposalId.toString())

  // For timesheet_entry_complaint, add query param
  if (proposalType === ProposalType.timesheet_entry_complaint) {
    return `${detailPath}?proposal_type=${proposalType}`
  }

  return detailPath
}

const TimesheetEntryProposalTable = ({
  proposals = [],
  isLoading = false,
}: TimesheetEntryProposalTableProps) => {
  const navigate = useNavigate()
  const location = useLocation()

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_TYPE],
  })

  const proposalTypeLabels = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_TYPE),
    [keysMap]
  )

  const handleViewDetail = useCallback(
    (proposal: Proposal | ProposalCombined) => {
      if (!proposal.id || !proposal.proposal_type) {
        return
      }
      const detailPath = getProposalDetailPath(proposal.proposal_type, proposal.id)
      if (detailPath) {
        navigate(detailPath, {
          state: {
            from: window.location.pathname + window.location.search,
            // Preserve parent's from so back navigation chain works correctly
            parentFrom: location.state?.from,
          },
        })
      }
    },
    [navigate, location.state?.from]
  )

  const columns: ColumnDef<Proposal | ProposalCombined>[] = useMemo(
    () => [
      {
        accessorKey: 'proposal_date',
        header: 'Ngày đề xuất',
        cell: ({ getValue }) => {
          const value = getValue() as string | null | undefined
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={formatDate(value)}>
              {formatDate(value)}
            </span>
          )
        },
        meta: {
          width: '180px',
          align: 'left',
          sortable: false,
        },
      },
      {
        accessorKey: 'proposal_type',
        header: 'Loại đề xuất',
        cell: ({ getValue }) => {
          const value = getValue() as Proposal['proposal_type']
          const label = proposalTypeLabels[value || ''] || value
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={label}>
              {label}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
          align: 'left',
          sortable: false,
        },
      },
      {
        accessorKey: 'colored_proposal_status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const colored = getValue() as { value: string; variant: ColoredValueVariant } | undefined
          return <TimesheetProposalStatusBadge status={colored} />
        },
        meta: {
          width: '240px',
          align: 'center',
          sortable: false,
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const rowData = row.original
          return (
            <Flex justify="center" align="center">
              <button
                type="button"
                onClick={() => handleViewDetail(rowData)}
                className={cn(
                  'flex items-center justify-center gap-2 px-3 py-2 text-sm transition-colors',
                  'hover:bg-data-light-grey-hover',
                  'hover:cursor-pointer',
                  'focus:outline-action-outline-default'
                )}
                title="Xem chi tiết"
                aria-label="Xem chi tiết"
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  <IconEye size={16} />
                </span>
              </button>
            </Flex>
          )
        },
        meta: {
          width: '61px',
          align: 'center',
          sortable: false,
        },
      },
    ],
    [handleViewDetail, proposalTypeLabels]
  )

  return (
    <section className="flex flex-col gap-5">
      <Text className="typo-body-xl-semibold text-content-dark-1">Danh sách đề xuất</Text>
      {Array.isArray(proposals) && proposals.length > 0 && (
        <Table
          data={proposals}
          columns={columns}
          showSTT={false}
          enablePagination={false}
          enableSorting={false}
          enableFiltering={false}
          isLoading={isLoading}
          emptyMessage="Không có đề xuất liên quan"
          className="!px-0 !pb-0"
        />
      )}
    </section>
  )
}

export default TimesheetEntryProposalTable
