import { useMemo, useCallback, useRef } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { IconCheck, IconX } from '@/assets/icons'
import {
  type ProposalTimesheetEntryComplaint,
  useApproveProposalTimesheetEntryComplaint,
  useRejectProposalTimesheetEntryComplaint,
} from '@/features/decision-and-proposal/services/proposal-misc-service'
import { Flex, Text } from '@radix-ui/themes'
import { Table } from '@/components/ui'
import { format, parseISO } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import TimesheetProposalStatusBadge from './TimesheetProposalStatusBadge.tsx'
import { useDialog } from '@/hooks/useDialog.ts'
import ApproveComplaintDialogContent, {
  type ApproveComplaintDialogContentRef,
} from './ApproveComplaintDialogContent.tsx'
import RejectComplaintDialogContent, {
  type RejectComplaintDialogContentRef,
} from './RejectComplaintDialogContent.tsx'
import { cn } from '@/utils'
import toastService from '@/services/toast-service.tsx'
import { extractErrorMessage } from '@/utils/error-utils'
import { ColoredValueVariant } from '@/api/schema.ts'
import TimesheetProposalVerifierStatusBadge from '@/features/attendance/timesheet/view-details/TimesheetProposalVerifierStatusBadge.tsx'

type TimesheetEntryComplaintTableProps = {
  complaints?: ProposalTimesheetEntryComplaint[]
  isLoading?: boolean
  employeeName?: string
}

function formatComplaintDate(value?: string | null) {
  if (!value) return '-'
  try {
    return format(parseISO(value), DATE_FORMAT)
  } catch {
    return '-'
  }
}

const TimesheetEntryComplaintTable = ({
  complaints,
  isLoading = false,
}: TimesheetEntryComplaintTableProps) => {
  const { displayCustom, setLoading } = useDialog()

  const approveMutation = useApproveProposalTimesheetEntryComplaint()
  const rejectMutation = useRejectProposalTimesheetEntryComplaint()

  const approveContentRef = useRef<ApproveComplaintDialogContentRef>(null)
  const rejectContentRef = useRef<RejectComplaintDialogContentRef>(null)

  const handleReject = useCallback(
    (complaint: ProposalTimesheetEntryComplaint) => {
      // Reset ref for new dialog instance
      rejectContentRef.current = null

      displayCustom({
        title: 'Từ chối xác nhận công',
        content: (
          <RejectComplaintDialogContent
            ref={(ref) => {
              rejectContentRef.current = ref
            }}
            complaint={complaint}
          />
        ),
        confirmText: 'Xác nhận',
        cancelText: 'Huỷ',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        size: 'lg',
        disableBackdropClose: true,
        loading: rejectMutation.isPending,
        footerFlexJustify: 'end',
        onConfirm: async () => {
          const data = rejectContentRef.current?.getData()
          if (!data) {
            // Validation failed, don't close dialog
            const error = new Error('Validation failed')
            ;(error as any).isValidationError = true
            throw error
          }

          setLoading(true)
          try {
            await rejectMutation.mutateAsync({
              id: complaint.id,
              data: { approval_note: data.note },
            })
            toastService.success('Từ chối xác nhận công thành công')
          } catch (error) {
            console.error('Failed to reject complaint:', error)
            const errorMessage = extractErrorMessage(error)
            toastService.error(errorMessage)
            throw error
          } finally {
            setLoading(false)
          }
        },
        onCancel: () => {
          // Dialog will close automatically via onCancel
        },
      })
    },
    [displayCustom, rejectMutation, setLoading]
  )

  const handleApprove = useCallback(
    (complaint: ProposalTimesheetEntryComplaint) => {
      // Reset ref for new dialog instance
      approveContentRef.current = null

      displayCustom({
        title: 'Duyệt xác nhận công',
        content: (
          <ApproveComplaintDialogContent
            ref={(ref) => {
              approveContentRef.current = ref
            }}
            complaint={complaint}
          />
        ),
        confirmText: 'Xác nhận',
        cancelText: 'Huỷ',
        size: 'lg',
        disableBackdropClose: true,
        loading: approveMutation.isPending,
        footerFlexJustify: 'end',
        onConfirm: async () => {
          const data = approveContentRef.current?.getData()
          if (!data) {
            // Validation failed, don't close dialog
            const error = new Error('Validation failed')
            ;(error as any).isValidationError = true
            throw error
          }

          setLoading(true)
          try {
            await approveMutation.mutateAsync({
              id: complaint.id,
              data,
            })
            toastService.success('Duyệt xác nhận công thành công')
          } catch (error) {
            console.error('Failed to approve complaint:', error)
            const errorMessage = extractErrorMessage(error)
            toastService.error(errorMessage)
            throw error
          } finally {
            setLoading(false)
          }
        },
        onCancel: () => {
          // Dialog will close automatically via onCancel
        },
      })
    },
    [displayCustom, approveMutation, setLoading]
  )

  const columns: ColumnDef<ProposalTimesheetEntryComplaint>[] = useMemo(
    () => [
      {
        accessorKey: 'created_at',
        header: 'Ngày tạo xác nhận công',
        cell: ({ getValue }) => {
          const value = getValue() as string | null | undefined
          return (
            <span
              className="typo-body-base-regular text-content-dark-1"
              title={formatComplaintDate(value)}
            >
              {formatComplaintDate(value)}
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
        accessorKey: 'timesheet_entry_complaint_complaint_reason',
        header: 'Lý do',
        cell: ({ getValue }) => {
          const value = getValue() as string | null | undefined
          return (
            <span className="typo-body-base-regular text-content-dark-1" title={value || '-'}>
              {value || '-'}
            </span>
          )
        },
        meta: {
          headerClassName: 'flex-1',
          align: 'left',
          sortable: false,
        },
      },
      {
        accessorKey: 'timesheet_entry_complaint_proposed_check_in_time',
        header: 'Giờ vào/ra\nđề xuất',
        cell: ({ row }) => {
          const checkInTime = row.original.timesheet_entry_complaint_proposed_check_in_time
          const checkOutTime = row.original.timesheet_entry_complaint_proposed_check_out_time
          const title = `Giờ vào: ${checkInTime}\nGiờ ra: ${checkOutTime}`
          return (
            <>
              <Flex
                direction={'column'}
                className="typo-body-base-regular text-content-dark-1 text-center"
                title={title}
              >
                <div>{checkInTime}</div>
                <div>{checkOutTime}</div>
              </Flex>
            </>
          )
        },
        meta: {
          width: '100px',
          align: 'center',
          sortable: false,
        },
      },
      {
        accessorKey: 'timesheet_entry_complaint_approved_check_in_time',
        header: 'Giờ vào/ra được duyệt',
        cell: ({ row }) => {
          const approvedCheckInTime = row.original.timesheet_entry_complaint_approved_check_in_time
          const approvedCheckOutTime =
            row.original.timesheet_entry_complaint_approved_check_out_time
          const title = `Giờ vào được duyệt: ${approvedCheckInTime}\nGiờ ra được duyệt: ${approvedCheckOutTime}`
          return (
            <>
              <Flex
                direction={'column'}
                className="typo-body-base-regular text-content-dark-1 text-center"
                title={title}
              >
                <div>{approvedCheckInTime}</div>
                <div>{approvedCheckOutTime}</div>
              </Flex>
            </>
          )
        },
        meta: {
          width: '160px',
          align: 'center',
          sortable: false,
        },
      },
      {
        accessorKey: 'proposal_verifier.colored_status',
        header: 'Xác nhận của trưởng phòng',
        cell: ({ getValue }) => {
          const colored =
            getValue() as ProposalTimesheetEntryComplaint['proposal_verifier']['colored_status']
          return <TimesheetProposalVerifierStatusBadge status={colored} />
        },
        meta: {
          width: '150px',
          align: 'center',
          sortable: false,
        },
      },
      {
        accessorKey: 'colored_proposal_status',
        header: 'Trạng thái của xác nhận công',
        cell: ({ getValue }) => {
          const colored = getValue() as { value: string; variant: ColoredValueVariant } | undefined
          return <TimesheetProposalStatusBadge status={colored} />
        },
        meta: {
          width: '150px',
          align: 'center',
          sortable: false,
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const complaint = row.original
          const isPending = complaint.colored_proposal_status?.value === 'pending'
          return (
            <div className="flex w-full items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleReject(complaint)}
                disabled={!isPending}
                className={cn(
                  'bg-data-red-disabled text-data-red-default',
                  'hover:bg-data-red-hover hover:text-content-light-1',
                  'rounded',
                  'p-2',
                  'transition-colors',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
                title="Từ chối"
                aria-label="Từ chối"
              >
                <IconX size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleApprove(complaint)}
                disabled={!isPending}
                className={cn(
                  'bg-data-green-disabled text-data-green-default',
                  'hover:bg-data-green-hover hover:text-content-light-1',
                  'rounded',
                  'p-2',
                  'transition-colors',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
                title="Duyệt"
                aria-label="Duyệt"
              >
                <IconCheck size={16} />
              </button>
            </div>
          )
        },
        meta: {
          width: '106px',
          align: 'center',
          sortable: false,
          frozen: true,
        },
      },
    ],
    [handleReject, handleApprove]
  )

  return (
    <section className="flex flex-col gap-5">
      <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin xác nhận công</Text>
      {Array.isArray(complaints) && complaints.length > 0 && (
        <Table<ProposalTimesheetEntryComplaint>
          data={complaints || []}
          columns={columns}
          showSTT={false}
          enablePagination={false}
          enableSorting={false}
          enableFiltering={false}
          isLoading={isLoading}
          emptyMessage="Không có xác nhận công liên quan"
          className="!px-0 !pb-0"
        />
      )}
    </section>
  )
}

export default TimesheetEntryComplaintTable
