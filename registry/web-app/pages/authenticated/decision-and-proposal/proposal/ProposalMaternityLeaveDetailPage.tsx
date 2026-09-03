import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex, Separator } from '@radix-ui/themes'
import ProposalProposerInfo from '@/features/decision-and-proposal/proposal/_shares/components/ProposalProposerInfo.tsx'
import ProposalVerifierInfo from '@/features/decision-and-proposal/proposal/_shares/components/ProposalVerifierInfo.tsx'
import ProposalApproverInfo from '@/features/decision-and-proposal/proposal/_shares/components/ProposalApproverInfo.tsx'
import { APP_PATH } from '@/routes'
import useProposalDetailMisc from '@/features/decision-and-proposal/proposal/_shares/hooks/useProposalDetailMisc.tsx'
import ProposalTypeInfo from '@/features/decision-and-proposal/proposal/_shares/components/ProposalTypeInfo.tsx'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { ProposalStatus, ProposalType } from '@/constants/api-schema-aliases'
import { useAbility } from '@/lib/ability'

export default function ProposalMaternityLeaveDetailPage() {
  const ability = useAbility()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const proposalId = id ? parseInt(id, 10) : 0

  const {
    proposal,
    customActions,
    isLoadingProposal,
    isLoadingVerifier,
    proposalVerifiers,
    isNotFound,
    isError,
  } = useProposalDetailMisc({
    proposalId,
    proposalType: ProposalType.maternity_leave,
  })

  const handleShowHistory = useCallback(() => {
    if (proposalId && proposalId > 0) {
      const path = APP_PATH.PROPOSAL_MATERNITY_LEAVE_HISTORY.replace(':id', proposalId.toString())
      navigate(path)
    }
  }, [navigate, proposalId])

  const breadcrumbPath = useMemo(
    () =>
      proposal ? `${proposal.created_by?.fullname?.trim() || proposal.created_by?.code}` : '-',
    [proposal]
  )

  const pageTitle = useMemo(
    () =>
      proposal ? `${proposal.created_by?.fullname?.trim() || proposal.created_by?.code}` : '-',
    [proposal]
  )

  const isLoading = isLoadingProposal || isLoadingVerifier

  return (
    <>
      <PageTitle
        enableBackButton
        title={pageTitle}
        idLabel={breadcrumbPath}
        handleShowHistory={handleShowHistory}
        customActions={customActions}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'proposal_maternity_leave')}
      >
        {proposal && (
          <Flex direction="column" gap="6" className="px-10 py-6">
            <ProposalProposerInfo proposer={proposal.created_by} />

            <Separator orientation={'horizontal'} className={'!w-full'} />

            <ProposalTypeInfo proposalType={ProposalType.maternity_leave} proposal={proposal} />

            <Separator orientation={'horizontal'} className={'!w-full'} />

            <ProposalVerifierInfo proposalVerifiers={proposalVerifiers} />

            <Separator orientation={'horizontal'} className={'!w-full'} />

            <ProposalApproverInfo
              approver={proposal.approved_by || '-'}
              approvedAt={proposal && 'approved_at' in proposal ? proposal.approved_at : '-'}
              status={proposal.colored_proposal_status?.value || ProposalStatus.pending}
              note={proposal.approval_note || '-'}
            />
          </Flex>
        )}
      </DetailPageWrapper>
    </>
  )
}
