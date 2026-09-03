import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAbility } from '@/lib/ability.ts'
import {
  useProposalVerifier,
  useRejectProposalVerifier,
  useVerifyProposalVerifier,
} from '@/features/decision-and-proposal/services/proposal-base-service'
import { useProposalTypeLabel } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalTypeLabel.ts'
import { useProposalVerifyReject } from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalVerifyReject.tsx'
import { getProposalApproveRejectTitle } from '@/features/decision-and-proposal/proposal/_shares/utils/proposal-type-utils.ts'
import { Button } from '@/components/ui'
import { isNotFoundError } from '@/utils/error-utils'
import { ProposalStatus } from '@/constants/api-schema-aliases'

type UseProposalManageDetailParams = {
  proposalVerifierId: number
}

const useProposalManageDetail = ({ proposalVerifierId }: UseProposalManageDetailParams) => {
  const queryClient = useQueryClient()
  const ability = useAbility()

  // Get proposal verifier detail using proposalId - this will return the verifier with proposal
  const {
    data: proposalVerifierData,
    isLoading: isLoadingVerifier,
    error: errorVerifier,
    refetch: refetchProposalVerifier,
  } = useProposalVerifier(proposalVerifierId)

  // Get proposal from verifier
  const proposal = useMemo(
    () => proposalVerifierData?.proposal || null,
    [proposalVerifierData?.proposal]
  )
  const proposalType = useMemo(
    () => (proposal?.proposal_type ? proposal?.proposal_type : null),
    [proposal?.proposal_type]
  )
  const typeLabel = useProposalTypeLabel(proposalType)

  const verifyProposalVerifierMutation = useVerifyProposalVerifier()
  const rejectProposalVerifierMutation = useRejectProposalVerifier()

  // Invalidate queries after success
  const onVerifyRejectSuccess = useCallback(async () => {
    // Force refresh current detail first so UI reflects latest verifier/proposal state immediately.
    await refetchProposalVerifier()

    // Refresh related verifier/proposal lists on other screens.
    await queryClient.invalidateQueries({
      queryKey: ['hrm', 'proposal-verifiers'],
    })
    await queryClient.invalidateQueries({
      queryKey: ['hrm', 'proposals'],
    })
  }, [queryClient, refetchProposalVerifier])

  // Handle verify/reject verifier callbacks
  const handleVerifyVerifierCallback = useCallback(
    async (id: number, data: { note?: string | null }) => {
      await verifyProposalVerifierMutation.mutateAsync({ id, data })
      await onVerifyRejectSuccess()
    },
    [verifyProposalVerifierMutation, onVerifyRejectSuccess]
  )

  const handleRejectVerifierCallback = useCallback(
    async (id: number, data: { note: string }) => {
      await rejectProposalVerifierMutation.mutateAsync({ id, data })
      await onVerifyRejectSuccess()
    },
    [rejectProposalVerifierMutation, onVerifyRejectSuccess]
  )

  // Use verify/reject hooks
  const { handleVerifyProposal, handleRejectProposal } = useProposalVerifyReject({
    onApprove: handleVerifyVerifierCallback,
    onReject: handleRejectVerifierCallback,
    approveTitle: getProposalApproveRejectTitle(proposalType, 'approve', typeLabel),
    rejectTitle: getProposalApproveRejectTitle(proposalType, 'reject', typeLabel),
  })

  // Check permissions for verifier actions
  const canVerifyVerifier = useMemo(
    () =>
      ability.can('verify', 'proposal_verifier') &&
      proposalVerifierData &&
      !isLoadingVerifier &&
      proposalVerifierData.colored_status.value === ProposalStatus.pending,
    [ability, proposalVerifierData, isLoadingVerifier]
  )

  const canRejectVerifier = useMemo(
    () =>
      ability.can('reject', 'proposal_verifier') &&
      proposalVerifierData &&
      !isLoadingVerifier &&
      proposalVerifierData.colored_status.value === ProposalStatus.pending,
    [ability, proposalVerifierData, isLoadingVerifier]
  )

  // Handle verifier actions
  const onVerifyVerifierClick = useCallback(() => {
    if (!proposalVerifierData || !proposalVerifierData?.id) {
      return
    }
    handleVerifyProposal(proposalVerifierData.id)
  }, [handleVerifyProposal, proposalVerifierData])

  const onRejectVerifierClick = useCallback(() => {
    if (!proposalVerifierData || !proposalVerifierData?.id) {
      return
    }
    handleRejectProposal(proposalVerifierData.id)
  }, [handleRejectProposal, proposalVerifierData])

  // Custom actions for verifier
  const customActions = useMemo(() => {
    return (
      <>
        {canRejectVerifier && (
          <Button variant={'secondary'} onClick={onRejectVerifierClick}>
            Từ chối
          </Button>
        )}
        {canVerifyVerifier && <Button onClick={onVerifyVerifierClick}>Xác nhận</Button>}
      </>
    )
  }, [onRejectVerifierClick, onVerifyVerifierClick, canRejectVerifier, canVerifyVerifier])

  const isLoading = isLoadingVerifier
  const error = errorVerifier

  // Determine if proposal was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !proposal
  }, [isLoading, error, proposal])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const proposalVerifiers = useMemo(
    () => (proposalVerifierData ? [proposalVerifierData as any] : []),
    [proposalVerifierData]
  )

  return {
    proposal,
    proposalType,
    typeLabel,
    customActions,
    isLoading,
    error,
    isNotFound,
    isError,
    proposalVerifiers,
    handleVerifyProposal,
    handleRejectProposal,
    handleVerifyVerifierCallback,
    handleRejectVerifierCallback,
  }
}

export default useProposalManageDetail
