import {
  ProposalRejectRequest,
  useProposalVerifiers,
  useRejectProposalVerifier,
  useVerifyProposalVerifier,
  useApproveProposal,
  useRejectProposal,
} from '@/services'
import { useCallback, useMemo } from 'react'
import { Button } from '@/components/ui'
import { IconCheck, IconX } from '@/assets/icons'
import { Separator } from '@radix-ui/themes'
import { useQueryClient } from '@tanstack/react-query'
import {
  getProposalApproveRejectTitle,
  getProposalDetailQueryKey,
} from '@/features/decision-and-proposal/proposal/_shares/utils/proposal-type-utils.ts'
import { useProposalTypeLabel } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalTypeLabel.ts'
import { useProposalApproveReject } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalApproveReject.tsx'
import { useProposalVerifyReject } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalVerifyReject.tsx'
import {
  buildProposalApproveContent,
  type MiscApprovePayload,
} from '@/features/decision-and-proposal/proposal/_shares/utils/proposal-approve-content.tsx'
import {
  useApproveProposalOvertimeWork,
  useApproveProposalAssetAllocation,
} from '@/features/decision-and-proposal/services/proposal-misc-service'
import { useAbility } from '@/lib/ability.ts'
import { useProposalDetail } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalDetail'
import { useAuth } from '@/store/auth-store.ts'
import { isNotFoundError } from '@/utils/error-utils'
import { useDialog } from '@/hooks/useDialog.ts'
import { showBulkJobTransferApprovedInfo } from '@/features/decision-and-proposal/proposal/bulk-job-transfer/utils/showBulkJobTransferApprovedInfo.tsx'
import {
  ProposalStatus,
  ProposalType,
  ProposalVerifierStatus,
} from '@/constants/api-schema-aliases'

const useProposalDetailMisc = ({
  proposalType,
  proposalId,
}: {
  proposalType: ProposalType | null
  proposalId: number
}) => {
  const queryClient = useQueryClient()

  const ability = useAbility()

  const { user } = useAuth()

  const typeLabel = useProposalTypeLabel(proposalType)

  const approveProposalMutation = useApproveProposal()
  const rejectProposalMutation = useRejectProposal()
  const approveOvertimeWorkMutation = useApproveProposalOvertimeWork()
  const approveAssetAllocationMutation = useApproveProposalAssetAllocation()

  const isOvertimeWork = proposalType === ProposalType.overtime_work

  const isAssetAllocation = proposalType === ProposalType.asset_allocation

  const isBulkJobTransfer = proposalType === ProposalType.bulk_job_transfer

  const { displayCustom: displayInfoDialog } = useDialog()

  const verifyProposalVerifierMutation = useVerifyProposalVerifier()
  const rejectProposalVerifierMutation = useRejectProposalVerifier()

  // Fetch proposal first – used by onApproveSuccess / onRejectSuccess (must be declared before them)
  const {
    data: proposal,
    isLoading: isLoadingProposal,
    error: errorProposal,
  } = useProposalDetail(proposalId, proposalType)

  const {
    data: proposalVerifierData,
    isLoading: isLoadingVerifier,
    error: errorVerifier,
    refetch: refetchProposalVerifiers,
  } = useProposalVerifiers({
    page_size: 1000,
    proposal: Number(proposalId),
  })
  const proposalVerifiers = useMemo(
    () => proposalVerifierData?.results || [],
    [proposalVerifierData?.results]
  )

  // =============================

  // All hooks must be called unconditionally at the top level
  const onApproveSuccess = useCallback(
    async (id: number) => {
      // Refresh verifiers data right after action so ProposalVerifierInfo updates immediately.
      await refetchProposalVerifiers()

      const detailQueryKey = getProposalDetailQueryKey(proposalType, id)
      if (detailQueryKey) {
        await queryClient.invalidateQueries({
          queryKey: detailQueryKey,
        })
      }
      // await queryClient.invalidateQueries({
      //   queryKey: ['hrm', 'proposal-verifiers'],
      // })
      // Invalidate useProposalsMine list query
      await queryClient.invalidateQueries({
        queryKey: ['hrm', 'proposals', 'mine', 'list'],
      })
      // Invalidate general proposals list (used in timesheet entry detail page)
      await queryClient.invalidateQueries({
        queryKey: ['hrm', 'proposals', 'list'],
      })
      // Invalidate timesheet entry complaint list (used in timesheet entry detail page)
      await queryClient.invalidateQueries({
        queryKey: ['hrm', 'proposals', 'timesheet-entry-complaint', 'list'],
      })

      // Invalidate timesheet-related queries to refresh timesheet entry detail and timesheet list
      // Get timesheet_entry_id from proposal object if available
      const timesheetEntryId =
        (proposal as any)?.timesheet_entry_id || (proposal as any)?.timesheet_entry || undefined

      // Invalidate timesheet entry detail if we have timesheet_entry_id
      if (timesheetEntryId && typeof timesheetEntryId === 'number') {
        await queryClient.invalidateQueries({
          queryKey: ['hrm', 'timesheet-entries', 'detail', timesheetEntryId],
        })
      } else {
        // If we don't have specific timesheet_entry_id, invalidate all timesheet entry detail queries
        // This ensures refresh when user navigates back to timesheet entry detail page
        await queryClient.invalidateQueries({
          queryKey: ['hrm', 'timesheet-entries', 'detail'],
        })
      }

      // Invalidate all timesheet list queries to refresh timesheet table
      await queryClient.invalidateQueries({
        queryKey: ['hrm', 'timesheets', 'list'],
      })
      // Also invalidate timesheet entries list
      await queryClient.invalidateQueries({
        queryKey: ['hrm', 'timesheet-entries', 'list'],
      })
    },
    [queryClient, proposalType, proposal, refetchProposalVerifiers]
  )

  const onRejectSuccess = useCallback(
    async (id: number) => {
      // Refresh verifiers data right after action so ProposalVerifierInfo updates immediately.
      await refetchProposalVerifiers()

      const detailQueryKey = getProposalDetailQueryKey(proposalType, id)
      if (detailQueryKey) {
        await queryClient.invalidateQueries({
          queryKey: detailQueryKey,
        })
      }
      await queryClient.invalidateQueries({
        queryKey: ['hrm', 'proposal-verifiers'],
      })
      // Invalidate useProposalsMine list query
      await queryClient.invalidateQueries({
        queryKey: ['hrm', 'proposals', 'mine', 'list'],
      })
      // Invalidate general proposals list (used in timesheet entry detail page)
      await queryClient.invalidateQueries({
        queryKey: ['hrm', 'proposals', 'list'],
      })
      // Invalidate timesheet entry complaint list (used in timesheet entry detail page)
      await queryClient.invalidateQueries({
        queryKey: ['hrm', 'proposals', 'timesheet-entry-complaint', 'list'],
      })

      // Invalidate timesheet-related queries to refresh timesheet entry detail and timesheet list
      // Get timesheet_entry_id from proposal object if available
      const timesheetEntryId =
        (proposal as any)?.timesheet_entry_id || (proposal as any)?.timesheet_entry || undefined

      // Invalidate timesheet entry detail if we have timesheet_entry_id
      if (timesheetEntryId && typeof timesheetEntryId === 'number') {
        await queryClient.invalidateQueries({
          queryKey: ['hrm', 'timesheet-entries', 'detail', timesheetEntryId],
        })
      } else {
        // If we don't have specific timesheet_entry_id, invalidate all timesheet entry detail queries
        // This ensures refresh when user navigates back to timesheet entry detail page
        await queryClient.invalidateQueries({
          queryKey: ['hrm', 'timesheet-entries', 'detail'],
        })
      }

      // Invalidate all timesheet list queries to refresh timesheet table
      await queryClient.invalidateQueries({
        queryKey: ['hrm', 'timesheets', 'list'],
      })
      // Also invalidate timesheet entries list
      await queryClient.invalidateQueries({
        queryKey: ['hrm', 'timesheet-entries', 'list'],
      })
    },
    [queryClient, proposalType, proposal, refetchProposalVerifiers]
  )

  // =============================

  // Determine if proposal was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoadingProposal) return false
    if (errorProposal && isNotFoundError(errorProposal)) return true
    return !proposal
  }, [isLoadingProposal, errorProposal, proposal])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoadingProposal || !errorProposal) return false
    return !isNotFoundError(errorProposal)
  }, [isLoadingProposal, errorProposal])

  const isProposalStatusPending = useMemo(
    () => proposal?.colored_proposal_status?.value === ProposalStatus.pending,
    [proposal?.colored_proposal_status?.value]
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

  const handleBulkJobTransferApproveSuccess = useCallback(() => {
    showBulkJobTransferApprovedInfo(displayInfoDialog, proposal as any)
  }, [proposal, displayInfoDialog])

  const handleApproveCallback = useCallback(
    async (id: number, data: MiscApprovePayload) => {
      // OT and asset-allocation route to their dedicated endpoints (accepting per-day `entries`
      // and the HR-edited `assets` list respectively); every other type uses the generic
      // proposal approve endpoint (note only — extra fields ignored).
      if (isOvertimeWork) {
        await approveOvertimeWorkMutation.mutateAsync({ id, data })
      } else if (isAssetAllocation) {
        await approveAssetAllocationMutation.mutateAsync({ id, data })
      } else {
        await approveProposalMutation.mutateAsync({ id, data })
      }
      await onApproveSuccess(id)
      if (isBulkJobTransfer) {
        handleBulkJobTransferApproveSuccess()
      }
    },
    [
      isOvertimeWork,
      isAssetAllocation,
      approveOvertimeWorkMutation,
      approveAssetAllocationMutation,
      approveProposalMutation,
      onApproveSuccess,
      isBulkJobTransfer,
      handleBulkJobTransferApproveSuccess,
    ]
  )

  const handleRejectCallback = useCallback(
    async (id: number, data: ProposalRejectRequest) => {
      await rejectProposalMutation.mutateAsync({ id, data })
      await onRejectSuccess(id)
    },
    [rejectProposalMutation, onRejectSuccess]
  )

  const handleVerifyVerifierCallback = useCallback(
    async (id: number, data: { note?: string | null }) => {
      await verifyProposalVerifierMutation.mutateAsync({ id, data })
      await onApproveSuccess(proposalId)
    },
    [verifyProposalVerifierMutation, onApproveSuccess, proposalId]
  )
  const handleRejectVerifierCallback = useCallback(
    async (id: number, data: { note: string }) => {
      await rejectProposalVerifierMutation.mutateAsync({ id, data })
      await onRejectSuccess(proposalId)
    },
    [rejectProposalVerifierMutation, onRejectSuccess, proposalId]
  )

  // ------------------------------

  // Overtime work and asset allocation each show a dedicated approve dialog so HR can edit the
  // proposal before confirming (per-day hours / the asset list). Shared with the list row actions
  // via `buildProposalApproveContent` so both surfaces open the exact same dialog.
  const approveContent = useMemo(
    () => buildProposalApproveContent(proposalType, proposal),
    [proposalType, proposal]
  )

  const { handleApprove, handleReject } = useProposalApproveReject<MiscApprovePayload>({
    onApprove: handleApproveCallback,
    onReject: handleRejectCallback,
    approveTitle: getProposalApproveRejectTitle(proposalType, 'approve', typeLabel),
    rejectTitle: getProposalApproveRejectTitle(proposalType, 'reject', typeLabel),
    approveContent,
  })

  const { handleVerifyProposal, handleRejectProposal } = useProposalVerifyReject({
    onApprove: handleVerifyVerifierCallback,
    onReject: handleRejectVerifierCallback,
    approveTitle: getProposalApproveRejectTitle(proposalType, 'approve', typeLabel),
    rejectTitle: getProposalApproveRejectTitle(proposalType, 'reject', typeLabel),
  })

  // =============================
  // For HRM
  // -----------------------------
  const canApprove = useMemo(() => {
    if (!isProposalStatusPending) {
      return false
    }
    switch (proposalType) {
      case ProposalType.post_maternity_benefits:
        return ability.can('approve', 'proposal_post_maternity_benefits')
      case ProposalType.late_exemption:
        return ability.can('approve', 'proposal_late_exemption')
      case ProposalType.overtime_work:
        return ability.can('approve', 'proposal_overtime_work')
      case ProposalType.paid_leave:
        return ability.can('approve', 'proposal_paid_leave')
      case ProposalType.unpaid_leave:
        return ability.can('approve', 'proposal_unpaid_leave')
      case ProposalType.maternity_leave:
        return ability.can('approve', 'proposal_maternity_leave')
      case ProposalType.timesheet_entry_complaint:
        return ability.can('approve', 'proposal_timesheet_entry_complaint')
      case ProposalType.job_transfer:
        return ability.can('approve', 'proposal_job_transfer')
      case ProposalType.bulk_job_transfer:
        return ability.can('approve', 'proposal_bulk_job_transfer')
      case ProposalType.asset_allocation:
        return ability.can('approve', 'proposal_asset_allocation')
      case ProposalType.device_change:
        return ability.can('approve', 'proposal_device_change')
      case ProposalType.return_to_work:
        return ability.can('approve', 'proposal_return_to_work')
      case ProposalType.statutory_paid_leave:
        return ability.can('approve', 'proposal_statutory_leave')
      default:
        return false
    }
  }, [proposalType, ability, isProposalStatusPending])
  const canReject = useMemo(() => {
    if (!isProposalStatusPending) {
      return false
    }
    switch (proposalType) {
      case ProposalType.post_maternity_benefits:
        return ability.can('reject', 'proposal_post_maternity_benefits')
      case ProposalType.late_exemption:
        return ability.can('reject', 'proposal_late_exemption')
      case ProposalType.overtime_work:
        return ability.can('reject', 'proposal_overtime_work')
      case ProposalType.paid_leave:
        return ability.can('reject', 'proposal_paid_leave')
      case ProposalType.unpaid_leave:
        return ability.can('reject', 'proposal_unpaid_leave')
      case ProposalType.maternity_leave:
        return ability.can('reject', 'proposal_maternity_leave')
      case ProposalType.timesheet_entry_complaint:
        return ability.can('reject', 'proposal_timesheet_entry_complaint')
      case ProposalType.job_transfer:
        return ability.can('reject', 'proposal_job_transfer')
      case ProposalType.bulk_job_transfer:
        return ability.can('reject', 'proposal_bulk_job_transfer')
      case ProposalType.asset_allocation:
        return ability.can('reject', 'proposal_asset_allocation')
      case ProposalType.device_change:
        return ability.can('reject', 'proposal_device_change')
      case ProposalType.return_to_work:
        return ability.can('reject', 'proposal_return_to_work')
      case ProposalType.statutory_paid_leave:
        return ability.can('reject', 'proposal_statutory_leave')
      default:
        return false
    }
  }, [proposalType, ability, isProposalStatusPending])
  const onApproveProposalClick = useCallback(() => {
    if (!proposalId || proposalId === 0) {
      return
    }
    handleApprove(proposalId)
  }, [handleApprove, proposalId])
  const onRejectProposalClick = useCallback(() => {
    if (!proposalId || proposalId === 0) {
      return
    }
    handleReject(proposalId)
  }, [handleReject, proposalId])
  // =============================

  // =============================
  // For Verifier - Manager
  // -----------------------------
  const canVerifyVerifier = useMemo(
    () => ability.can('verify', 'proposal_verifier') && !!currentPendingVerifier,
    [ability, currentPendingVerifier]
  )
  const canRejectVerifier = useMemo(
    () => ability.can('reject', 'proposal_verifier') && !!currentPendingVerifier,
    [ability, currentPendingVerifier]
  )
  const onVerifyVerifierClick = useCallback(() => {
    if (!currentPendingVerifier?.id) {
      return
    }
    handleVerifyProposal(currentPendingVerifier.id)
  }, [handleVerifyProposal, currentPendingVerifier?.id])
  const onRejectVerifierClick = useCallback(() => {
    if (!currentPendingVerifier?.id) {
      return
    }
    handleRejectProposal(currentPendingVerifier.id)
  }, [handleRejectProposal, currentPendingVerifier?.id])
  // =============================

  const customActions = useMemo(() => {
    return (
      <>
        {canReject && (
          <Button
            variant="secondary"
            iconOnly
            size="large"
            leftIcon={<IconX />}
            onClick={onRejectProposalClick}
            className="bg-data-red-disabled text-data-red-default p-2"
            title="Từ chối đề xuất"
          />
        )}
        {canApprove && (
          <Button
            variant="secondary"
            iconOnly
            size="large"
            leftIcon={<IconCheck />}
            onClick={onApproveProposalClick}
            className="bg-data-green-disabled text-data-green-default p-2"
            title="Duyệt đề xuất"
          />
        )}
        {(canReject || canApprove) && <Separator orientation={'vertical'} />}
        {canRejectVerifier && (
          <Button variant={'secondary'} onClick={onRejectVerifierClick}>
            Từ chối
          </Button>
        )}
        {canVerifyVerifier && <Button onClick={onVerifyVerifierClick}>Xác nhận</Button>}
      </>
    )
  }, [
    onRejectProposalClick,
    onApproveProposalClick,
    canReject,
    canApprove,
    onRejectVerifierClick,
    onVerifyVerifierClick,
    canRejectVerifier,
    canVerifyVerifier,
  ])

  return {
    typeLabel,
    // ------------------------------
    customActions,
    // ------------------------------
    isLoadingProposal,
    proposal,
    handleRejectProposal,
    handleVerifyProposal,
    errorProposal,
    isNotFound,
    isError,
    // ------------------------------
    isLoadingVerifier,
    proposalVerifiers,
    handleVerifyVerifierCallback,
    handleRejectVerifierCallback,
    errorVerifier,
  }
}

export default useProposalDetailMisc
