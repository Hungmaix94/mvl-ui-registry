import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex, Separator } from '@radix-ui/themes'
import ProposalProposerInfo from '@/features/decision-and-proposal/proposal/_shares/components/ProposalProposerInfo.tsx'
import ProposalApproverInfo from '@/features/decision-and-proposal/proposal/_shares/components/ProposalApproverInfo.tsx'
import ProposalTypeInfo from '@/features/decision-and-proposal/proposal/_shares/components/ProposalTypeInfo.tsx'
import { APP_PATH } from '@/routes'
import useProposalManageDetail from './hooks/useProposalManageDetail.tsx'
import { useAbility } from '@/lib/ability.ts'
import ProposalVerifierInfo from '@/features/decision-and-proposal/proposal/_shares/components/ProposalVerifierInfo.tsx'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import ComplaintAttachmentSection from '@/features/attendance/timesheet-complaint/components/ComplaintAttachmentSection.tsx'
import { ProposalStatus } from '@/constants/api-schema-aliases'

export default function ProposalVerifierDetailPage() {
  const navigate = useNavigate()
  const ability = useAbility()

  const { id } = useParams<{ id: string }>()

  const proposalVerifierId = useMemo(() => (id ? parseInt(id, 10) : 0), [id])

  const {
    proposal,
    proposalType,
    typeLabel,
    proposalVerifiers,
    customActions,
    isLoading,
    error,
    isNotFound,
    isError,
  } = useProposalManageDetail({
    proposalVerifierId: proposalVerifierId,
  })

  const handleShowHistory = useCallback(() => {
    if (proposal?.id && proposalType) {
      const path = APP_PATH.PROPOSAL_MANAGE_HISTORY.replace(':id', proposal.id.toString())
      navigate(`${path}?proposal_type=${proposalType}`)
    }
  }, [navigate, proposal?.id, proposalType])

  useEffect(() => {
    if (
      error &&
      'error' in error &&
      error.error &&
      typeof error.error === 'object' &&
      'errors' in error.error &&
      Array.isArray(error.error.errors) &&
      error.error.errors[0]
    ) {
      const errorDetail = error.error.errors[0]
      if ('code' in errorDetail && errorDetail.code === 'permission_denied') {
        if (ability.can('mine', 'proposal_verifier')) {
          navigate(APP_PATH.PROPOSAL_MANAGE)
        } else {
          navigate(APP_PATH.UNAUTHORIZED)
        }
      }
    }
  }, [error, ability, navigate])

  const breadcrumbPath = useMemo(
    () => (proposal ? `${proposal.code} - ${typeLabel}` : ''),
    [proposal, typeLabel]
  )

  // Check for invalid ID
  const isInvalidId = !proposalVerifierId || proposalVerifierId === 0

  return (
    <>
      <PageTitle
        enableBackButton
        title={breadcrumbPath}
        idLabel={breadcrumbPath}
        handleShowHistory={ability.can('histories', 'proposal') ? handleShowHistory : undefined}
        customActions={customActions}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound || isInvalidId}
        isError={isError}
        hasPermission={ability.can('retrieve', 'proposal_verifier')}
      >
        {proposal && (
          <Flex direction="column" gap="4" className="px-10 py-6">
            <ProposalProposerInfo proposer={proposal.created_by} />

            <Separator orientation={'horizontal'} className={'!w-full'} />

            <ProposalTypeInfo proposalType={proposalType} proposal={proposal} />

            <Separator orientation={'horizontal'} className={'!w-full'} />

            <ProposalVerifierInfo proposalVerifiers={proposalVerifiers} />

            <Separator orientation={'horizontal'} className={'!w-full'} />

            <ProposalApproverInfo
              approver={proposal.approved_by || '-'}
              approvedAt={proposal.approved_at}
              status={proposal.colored_proposal_status?.value || ProposalStatus.pending}
              note={proposal.approval_note || '-'}
            />

            <Separator orientation={'horizontal'} className={'!w-full'} />

            <ComplaintAttachmentSection complaint={proposal} />
          </Flex>
        )}
      </DetailPageWrapper>
    </>
  )
}
