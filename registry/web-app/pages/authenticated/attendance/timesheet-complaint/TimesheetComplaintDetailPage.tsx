import { useMemo, useCallback, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Flex, Separator } from '@radix-ui/themes'
import { IconEye, IconCheck, IconX } from '@/assets/icons'

import { PageTitle, Button } from '@/components/ui'
import { Separator as UISeparator } from '@radix-ui/themes'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import {
  useProposalTimesheetEntryComplaint,
  useApproveProposalTimesheetEntryComplaint,
  useRejectProposalTimesheetEntryComplaint,
} from '@/features/decision-and-proposal/services/proposal-misc-service'
import { isNotFoundError, extractErrorMessage } from '@/utils/error-utils'
import { formatDate } from '@/utils/date-utils'
import ComplaintInfoSection from '@/features/attendance/timesheet-complaint/components/ComplaintInfoSection.tsx'
import ComplaintEmployeeInfoSection from '@/features/attendance/timesheet-complaint/components/ComplaintEmployeeInfoSection.tsx'
import ComplaintApproverInfoTable from '@/features/attendance/timesheet-complaint/components/ComplaintApproverInfoTable.tsx'
import ComplaintVerifierInfoTable from '@/features/attendance/timesheet-complaint/components/ComplaintVerifierInfoTable.tsx'
import ComplaintAttachmentSection from '@/features/attendance/timesheet-complaint/components/ComplaintAttachmentSection.tsx'
import VerifierActionDialogContent, {
  type VerifierActionDialogContentRef,
} from '@/features/attendance/timesheet-complaint/components/VerifierActionDialogContent.tsx'
import { APP_PATH } from '@/routes'
import { useDialog } from '@/hooks/useDialog'
import ApproveComplaintDialogContent, {
  type ApproveComplaintDialogContentRef,
} from '@/features/attendance/timesheet/view-details/ApproveComplaintDialogContent'
import RejectComplaintDialogContent, {
  type RejectComplaintDialogContentRef,
} from '@/features/attendance/timesheet/view-details/RejectComplaintDialogContent'
import toastService from '@/services/toast-service'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { useAbility } from '@/lib/ability'
import { useAuth } from '@/store/auth-store'
import {
  useProposalVerifiers,
  useRejectProposalVerifier,
  useVerifyProposalVerifier,
} from '@/services'
import { ProposalStatus, ProposalVerifierStatus } from '@/constants/api-schema-aliases'

const TimesheetComplaintDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const complaintId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ability = useAbility()
  const { user } = useAuth()

  const {
    data: complaint,
    isLoading: isComplaintLoading,
    error: complaintError,
  } = useProposalTimesheetEntryComplaint(complaintId)

  const approveMutation = useApproveProposalTimesheetEntryComplaint()
  const rejectMutation = useRejectProposalTimesheetEntryComplaint()
  const { displayCustom, setLoading: setDialogLoading } = useDialog()
  const approveContentRef = useRef<ApproveComplaintDialogContentRef | null>(null)
  const rejectContentRef = useRef<RejectComplaintDialogContentRef | null>(null)
  const [loading, setLoading] = useState(false)

  const title = useMemo(() => {
    if (!complaint) {
      return 'Chi tiết xác nhận công'
    }

    const employeeName = complaint.created_by?.fullname || '-'
    return `Xác nhận công nhân viên ${employeeName}`
  }, [complaint])

  const isNotFound = useMemo(() => {
    if (isComplaintLoading) return false
    if (complaintError && isNotFoundError(complaintError)) return true
    return !complaint
  }, [isComplaintLoading, complaintError, complaint])

  const isError = useMemo(() => {
    if (isComplaintLoading || !complaintError) return false
    return !isNotFoundError(complaintError)
  }, [isComplaintLoading, complaintError])

  const hasPermission = true

  const isPending = useMemo(() => {
    return complaint?.colored_proposal_status?.value === ProposalStatus.pending
  }, [complaint?.colored_proposal_status?.value])

  const isApproved = useMemo(() => {
    return complaint?.colored_proposal_status?.value === ProposalStatus.approved
  }, [complaint?.colored_proposal_status?.value])

  // Permission checks for approve/reject actions
  const canApprove = useMemo(() => {
    return isPending && ability.can('approve', 'proposal_timesheet_entry_complaint')
  }, [isPending, ability])

  const canReject = useMemo(() => {
    return isPending && ability.can('reject', 'proposal_timesheet_entry_complaint')
  }, [isPending, ability])

  const canRejectApproved = useMemo(() => {
    return isApproved && ability.can('reject', 'proposal_timesheet_entry_complaint')
  }, [isApproved, ability])

  // Extract entryId from complaint for navigation
  const entryId = useMemo(() => {
    if (!complaint) return null

    return complaint.timesheet_entry_id
  }, [complaint])

  const handleViewTimesheetDetail = useCallback(() => {
    if (entryId) {
      const path = APP_PATH.ATTENDANCE_TIMESHEET_DETAIL.replace(':entryId', String(entryId))
      navigate(path)
    } else {
      toastService.error('Không tìm thấy thông tin ngày công')
    }
  }, [navigate, entryId])

  const handleViewHistory = useCallback(() => {
    navigate(APP_PATH.ATTENDANCE_TIMESHEET_COMPLAINT_HISTORY.replace(':id', String(complaintId)))
  }, [navigate, complaintId])

  const handleReject = useCallback(() => {
    if (!complaint) return

    rejectContentRef.current = null

    const approver = complaint.approved_by
    const approverInfo =
      approver?.fullname && approver?.code
        ? `${approver.fullname} (${approver.code})`
        : approver?.fullname || approver?.code || '-'

    displayCustom({
      title: 'Từ chối xác nhận công',
      content: (
        <div className="flex w-full flex-col gap-4">
          {isApproved && (
            <div className="flex flex-col gap-3">
              <p className="typo-body-base text-content-dark-2">
                Bạn có muốn từ chối xác nhận công{' '}
                <span className="typo-body-base-semibold text-content-dark-1">đã được duyệt</span>{' '}
                của nhân viên?
              </p>
              <div className="border-border-1 bg-background-2 rounded-lg border p-3">
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-x-2">
                    <span className="typo-body-sm text-content-dark-3">Nhân viên:</span>
                    <span className="typo-body-sm-semibold text-content-dark-1">
                      {complaint.created_by?.fullname || '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-x-2">
                    <span className="typo-body-sm text-content-dark-3">Mã nhân viên:</span>
                    <span className="typo-body-sm-semibold text-content-dark-1">
                      {complaint.created_by?.code || '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-x-2">
                    <span className="typo-body-sm text-content-dark-3">Ngày xác nhận:</span>
                    <span className="typo-body-sm-semibold text-content-dark-1">
                      {formatDate(complaint.timesheet_entry_complaint_complaint_date)}
                    </span>
                  </div>
                  {complaint.timesheet_entry_complaint_approved_check_in_time && (
                    <div className="grid grid-cols-[140px_1fr] items-center gap-x-2">
                      <span className="typo-body-sm text-content-dark-3">Giờ vào đã duyệt:</span>
                      <span className="typo-body-sm-semibold text-content-dark-1">
                        {complaint.timesheet_entry_complaint_approved_check_in_time.slice(0, 5)}
                      </span>
                    </div>
                  )}
                  {complaint.timesheet_entry_complaint_approved_check_out_time && (
                    <div className="grid grid-cols-[140px_1fr] items-center gap-x-2">
                      <span className="typo-body-sm text-content-dark-3">Giờ ra đã duyệt:</span>
                      <span className="typo-body-sm-semibold text-content-dark-1">
                        {complaint.timesheet_entry_complaint_approved_check_out_time.slice(0, 5)}
                      </span>
                    </div>
                  )}
                  {approver && (
                    <div className="grid grid-cols-[140px_1fr] items-center gap-x-2">
                      <span className="typo-body-sm text-content-dark-3">Người đã duyệt:</span>
                      <span className="typo-body-sm-semibold text-content-dark-1">
                        {approverInfo}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <RejectComplaintDialogContent
            ref={(ref) => {
              rejectContentRef.current = ref
            }}
            complaint={complaint}
          />
        </div>
      ),
      confirmText: 'Xác nhận',
      cancelText: 'Huỷ',
      size: 'lg',
      loading: rejectMutation.isPending || loading,
      footerFlexJustify: 'end',
      onConfirm: async () => {
        const data = rejectContentRef.current?.getData()
        if (!data) {
          const error = new Error('Validation failed')
          ;(error as any).isValidationError = true
          throw error
        }

        setLoading(true)
        setDialogLoading(true)
        try {
          await rejectMutation.mutateAsync({
            id: complaint.id,
            data: {
              approval_note: data.note,
            },
          })
        } catch (error) {
          console.error('Failed to reject complaint:', error)
          const errorMessage = extractErrorMessage(error)
          toastService.error(errorMessage)
          throw error
        } finally {
          setLoading(false)
          setDialogLoading(false)
        }

        toastService.success('Từ chối xác nhận công thành công')
        // Fire-and-forget invalidations so a refetch error does not block dialog close
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.HRM.PROPOSALS_TIMESHEET_ENTRY_COMPLAINT.DETAIL(complaint.id),
        })
        queryClient.invalidateQueries({
          queryKey: ['hrm', 'proposals', 'list'],
        })
        queryClient.invalidateQueries({
          queryKey: ['hrm', 'proposals', 'timesheet-entry-complaint', 'list'],
        })
      },
      onCancel: () => {},
    })
  }, [complaint, isApproved, rejectMutation, displayCustom, loading, queryClient, setDialogLoading])

  const handleApprove = useCallback(() => {
    if (!complaint) return

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
      loading: approveMutation.isPending || loading,
      footerFlexJustify: 'end',
      onConfirm: async () => {
        const data = approveContentRef.current?.getData()
        if (!data) {
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
          // Invalidate and refetch complaint detail query
          await queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.HRM.PROPOSALS_TIMESHEET_ENTRY_COMPLAINT.DETAIL(complaint.id),
          })
          await queryClient.refetchQueries({
            queryKey: QUERY_KEYS.HRM.PROPOSALS_TIMESHEET_ENTRY_COMPLAINT.DETAIL(complaint.id),
          })
          // Invalidate general proposals list (used in timesheet entry detail page)
          await queryClient.invalidateQueries({
            queryKey: ['hrm', 'proposals', 'list'],
          })
          // Invalidate timesheet entry complaint list (used in timesheet entry detail page)
          await queryClient.invalidateQueries({
            queryKey: ['hrm', 'proposals', 'timesheet-entry-complaint', 'list'],
          })
        } catch (error) {
          console.error('Failed to approve complaint:', error)
          const errorMessage = extractErrorMessage(error)
          toastService.error(errorMessage)
          throw error
        } finally {
          setLoading(false)
        }
      },
    })
  }, [complaint, approveMutation, displayCustom, loading, queryClient])

  // =============================
  // Verifier actions (Xác nhận/Từ chối) similar to manage screen
  // =============================
  const { data: proposalVerifierData } = useProposalVerifiers({
    page_size: 1000,
    proposal: Number(complaintId),
  })

  const proposalVerifiers = useMemo(
    () => proposalVerifierData?.results || [],
    [proposalVerifierData?.results]
  )

  const currentPendingVerifier = useMemo(
    () =>
      proposalVerifiers.find(
        (verifier) =>
          verifier.colored_status.value === ProposalVerifierStatus.pending &&
          verifier.employee.code === user?.employee?.code
      ),
    [proposalVerifiers, user?.employee?.code]
  )

  const verifyProposalVerifierMutation = useVerifyProposalVerifier()
  const rejectProposalVerifierMutation = useRejectProposalVerifier()

  const canVerifyVerifier = useMemo(
    () => ability.can('verify', 'proposal_verifier') && !!currentPendingVerifier,
    [ability, currentPendingVerifier]
  )
  const canRejectVerifier = useMemo(
    () => ability.can('reject', 'proposal_verifier') && !!currentPendingVerifier,
    [ability, currentPendingVerifier]
  )

  const verifierActionRef = useRef<VerifierActionDialogContentRef | null>(null)

  const onVerifierApprove = useCallback(() => {
    if (!currentPendingVerifier?.id || !complaint?.id) return

    verifierActionRef.current = null

    displayCustom({
      title: 'Xác nhận đề xuất',
      content: (
        <VerifierActionDialogContent
          ref={(ref) => {
            verifierActionRef.current = ref
          }}
          isReject={false}
        />
      ),
      confirmText: 'Xác nhận',
      cancelText: 'Huỷ',
      size: 'lg',
      loading: verifyProposalVerifierMutation.isPending,
      footerFlexJustify: 'end',
      onConfirm: async () => {
        const data = verifierActionRef.current?.getData()
        if (!data) {
          const error = new Error('Validation failed')
          ;(error as any).isValidationError = true
          throw error
        }

        try {
          await verifyProposalVerifierMutation.mutateAsync({
            id: currentPendingVerifier.id,
            data: { note: data.note ?? null },
          })
          toastService.success('Xác nhận đề xuất thành công')
          await queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.HRM.PROPOSALS_TIMESHEET_ENTRY_COMPLAINT.DETAIL(complaint.id),
          })
          await queryClient.invalidateQueries({
            queryKey: ['hrm', 'proposal-verifiers'],
          })
          await queryClient.invalidateQueries({ queryKey: ['hrm', 'proposals', 'mine', 'list'] })
          // Invalidate general proposals list (used in timesheet entry detail page)
          await queryClient.invalidateQueries({
            queryKey: ['hrm', 'proposals', 'list'],
          })
          // Invalidate timesheet entry complaint list (used in timesheet entry detail page)
          await queryClient.invalidateQueries({
            queryKey: ['hrm', 'proposals', 'timesheet-entry-complaint', 'list'],
          })
        } catch (error) {
          console.error('Failed to verify proposal:', error)
          const errorMessage = extractErrorMessage(error)
          toastService.error(errorMessage)
          throw error
        }
      },
      onCancel: () => {},
    })
  }, [
    currentPendingVerifier?.id,
    complaint?.id,
    verifyProposalVerifierMutation,
    queryClient,
    displayCustom,
  ])

  const onVerifierReject = useCallback(() => {
    if (!currentPendingVerifier?.id || !complaint?.id) return

    verifierActionRef.current = null

    displayCustom({
      title: 'Từ chối đề xuất',
      content: (
        <VerifierActionDialogContent
          ref={(ref) => {
            verifierActionRef.current = ref
          }}
          isReject={true}
        />
      ),
      confirmText: 'Xác nhận',
      cancelText: 'Huỷ',
      size: 'lg',
      loading: rejectProposalVerifierMutation.isPending,
      footerFlexJustify: 'end',
      onConfirm: async () => {
        const data = verifierActionRef.current?.getData()
        if (!data) {
          const error = new Error('Validation failed')
          ;(error as any).isValidationError = true
          throw error
        }

        try {
          await rejectProposalVerifierMutation.mutateAsync({
            id: currentPendingVerifier.id,
            data: { note: data.note },
          })
          toastService.success('Từ chối đề xuất thành công')
          await queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.HRM.PROPOSALS_TIMESHEET_ENTRY_COMPLAINT.DETAIL(complaint.id),
          })
          await queryClient.invalidateQueries({
            queryKey: ['hrm', 'proposal-verifiers'],
          })
          await queryClient.invalidateQueries({ queryKey: ['hrm', 'proposals', 'mine', 'list'] })
          // Invalidate general proposals list (used in timesheet entry detail page)
          await queryClient.invalidateQueries({
            queryKey: ['hrm', 'proposals', 'list'],
          })
          // Invalidate timesheet entry complaint list (used in timesheet entry detail page)
          await queryClient.invalidateQueries({
            queryKey: ['hrm', 'proposals', 'timesheet-entry-complaint', 'list'],
          })
        } catch (error) {
          console.error('Failed to reject proposal:', error)
          const errorMessage = extractErrorMessage(error)
          toastService.error(errorMessage)
          throw error
        }
      },
      onCancel: () => {},
    })
  }, [
    currentPendingVerifier?.id,
    complaint?.id,
    rejectProposalVerifierMutation,
    queryClient,
    displayCustom,
  ])

  const customActions = useMemo(() => {
    return (
      <>
        <Button
          variant="secondary"
          iconOnly
          size="large"
          leftIcon={<IconEye />}
          onClick={handleViewTimesheetDetail}
          className="bg-data-light-grey-hover p-2"
          title="Xem chi tiết ngày công"
        />
        {(canReject || canApprove) && (
          <>
            <UISeparator orientation="vertical" />
            {canReject && (
              <Button
                variant="secondary"
                iconOnly
                size="large"
                leftIcon={<IconX />}
                onClick={handleReject}
                className="bg-data-red-disabled text-data-red-default p-2"
                title="Từ chối xác nhận công"
              />
            )}
            {canApprove && (
              <Button
                variant="secondary"
                iconOnly
                size="large"
                leftIcon={<IconCheck />}
                onClick={handleApprove}
                className="bg-data-green-disabled text-data-green-default p-2"
                title="Duyệt xác nhận công"
              />
            )}
          </>
        )}
        {canRejectApproved && (
          <>
            <UISeparator orientation="vertical" />
            <Button
              variant="secondary"
              iconOnly
              size="large"
              leftIcon={<IconX />}
              onClick={handleReject}
              className="bg-data-red-disabled text-data-red-default p-2"
              title="Đổi trạng thái sang Từ chối"
            />
          </>
        )}
        {(canRejectVerifier || canVerifyVerifier) && <UISeparator orientation="vertical" />}
        {canRejectVerifier && (
          <Button variant={'secondary'} onClick={onVerifierReject}>
            Từ chối
          </Button>
        )}
        {canVerifyVerifier && <Button onClick={onVerifierApprove}>Xác nhận</Button>}
      </>
    )
  }, [
    canApprove,
    canReject,
    canRejectApproved,
    canRejectVerifier,
    canVerifyVerifier,
    handleViewTimesheetDetail,
    handleApprove,
    handleReject,
    onVerifierApprove,
    onVerifierReject,
  ])

  return (
    <>
      <PageTitle
        title={title}
        enableBackButton
        customActions={customActions}
        handleShowHistory={handleViewHistory}
        titleShowHistory="Xem lịch sử thay đổi"
      />
      <Flex direction="column" gap="4" className="px-10 py-8">
        <DetailPageWrapper
          isLoading={isComplaintLoading}
          isNotFound={isNotFound}
          isError={isError}
          hasPermission={hasPermission}
        >
          <Flex direction="column" gap="6">
            <ComplaintEmployeeInfoSection employee={complaint?.created_by} />

            <Separator orientation={'horizontal'} className={'!w-full'} />

            <ComplaintInfoSection complaint={complaint} />

            <Separator orientation={'horizontal'} className={'!w-full'} />

            <ComplaintVerifierInfoTable proposalId={complaint?.id || null} />

            <Separator orientation={'horizontal'} className={'!w-full'} />

            <ComplaintApproverInfoTable complaint={complaint} />

            <Separator orientation={'horizontal'} className={'!w-full'} />

            <ComplaintAttachmentSection complaint={complaint} />
          </Flex>
        </DetailPageWrapper>
      </Flex>
    </>
  )
}

export default TimesheetComplaintDetailPage
