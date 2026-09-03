import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Text } from '@radix-ui/themes'
import { useProposalTimesheetEntryComplaint } from '@/features/decision-and-proposal/services/proposal-misc-service'
import Chip, { ChipVariant } from '@/components/ui/chip/Chip.tsx'
import { ColoredValueVariant } from '@/api/schema.ts'
import { Table } from '@/components/ui'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { ProposalStatus } from '@/constants/api-schema-aliases'

type ComplaintApproverInfoTableProps = {
  complaint?: ReturnType<typeof useProposalTimesheetEntryComplaint>['data']
}

type ApproverRowData = {
  id: string
  fullname: string
  department: string
  position: string
  status: ProposalStatus | null
  approvalDate: string
  note: string
}

const ComplaintApproverInfoTable = ({ complaint }: ComplaintApproverInfoTableProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_STATUS],
  })

  const proposalStatusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.HRM.PROPOSAL_STATUS)
      ? (keysMap.get(APP_CONSTANT_KEY.HRM.PROPOSAL_STATUS) as Record<string, string> | null) || {}
      : {}
  }, [keysMap])

  const approver = complaint?.approved_by
  const proposalStatus = (complaint?.colored_proposal_status?.value || null) as ProposalStatus
  const note = complaint?.approval_note || '-'

  // Format updated_at as approval time (when status is approved or rejected)
  const approvalDate =
    complaint?.updated_at &&
    (proposalStatus === ProposalStatus.approved || proposalStatus === ProposalStatus.rejected)
      ? formatDate(complaint.approved_at)
      : '-'

  // Prepare table data
  const tableData = useMemo<ApproverRowData[]>(() => {
    if (!approver || !proposalStatus || proposalStatus === ProposalStatus.pending) {
      return []
    }

    return [
      {
        id: 'approver-1',
        fullname: approver.fullname || '-',
        department: approver.department?.name || '-',
        position: approver.position?.name || '-',
        status: proposalStatus,
        approvalDate,
        note,
      },
    ]
  }, [approver, proposalStatus, approvalDate, note])

  const statusLabel = useMemo(() => {
    if (!proposalStatus) return '-'
    return proposalStatusMapping[proposalStatus] || '-'
  }, [proposalStatus, proposalStatusMapping])

  const statusVariant: ChipVariant = useMemo(
    () => complaint?.colored_proposal_status?.variant || ColoredValueVariant.GREY,
    [complaint?.colored_proposal_status?.variant]
  )

  const columns: ColumnDef<ApproverRowData>[] = useMemo(
    () => [
      {
        accessorKey: 'fullname',
        header: 'Họ tên',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <Text className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </Text>
          )
        },
        meta: {
          width: 'w-full',
          align: 'left' as const,
        },
      },
      {
        accessorKey: 'department',
        header: 'Phòng ban',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <Text className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </Text>
          )
        },
        meta: {
          width: 'w-full',
          align: 'left' as const,
        },
      },
      {
        accessorKey: 'position',
        header: 'Chức vụ',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <Text className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </Text>
          )
        },
        meta: {
          width: 'w-full',
          align: 'left' as const,
        },
      },
      {
        accessorKey: 'approvalDate',
        header: 'Thời gian',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <Text className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </Text>
          )
        },
        meta: {
          width: 'w-full',
          align: 'center' as const,
        },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const status = getValue() as ProposalStatus | null
          if (!status || statusLabel === '-') {
            return <Text className="typo-body-base-regular text-content-dark-1">-</Text>
          }
          return <Chip label={statusLabel} variant={statusVariant} size="small" type="outlined" />
        },
        meta: {
          width: 'w-full',
          align: 'center' as const,
        },
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        cell: ({ getValue }) => {
          const value = getValue() as string
          return (
            <Text className="typo-body-base-regular text-content-dark-1" title={value}>
              {value}
            </Text>
          )
        },
        meta: {
          width: 'w-full',
          align: 'left' as const,
        },
      },
    ],
    [statusLabel, statusVariant]
  )

  return (
    <section className="flex flex-col gap-5">
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin người duyệt</Text>
      {tableData.length > 0 && (
        <Table
          data={tableData}
          columns={columns}
          showSTT={false}
          showActions={false}
          enablePagination={false}
          enableSorting={false}
          className="!px-0 !pb-0"
          emptyMessage="Không có thông tin người duyệt"
        />
      )}
    </section>
  )
}

export default ComplaintApproverInfoTable
