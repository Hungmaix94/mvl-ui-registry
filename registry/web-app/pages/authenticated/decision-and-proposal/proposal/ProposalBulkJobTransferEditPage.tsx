import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { FullScreenLoading } from '@/components/Loading.tsx'
import BulkJobTransferWizard from '@/features/decision-and-proposal/proposal/bulk-job-transfer/create/BulkJobTransferWizard.tsx'
import { useProposalBulkJobTransfer } from '@/features/decision-and-proposal/services/proposal-misc-service'
import { APP_PATH } from '@/routes'

export default function ProposalBulkJobTransferEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const proposalId = id ? parseInt(id, 10) : 0

  const { data: proposal, isLoading } = useProposalBulkJobTransfer(proposalId)

  // Without this, PageTitle's breadcrumb builder falls back to rendering the raw numeric
  // route param (e.g. "4978") instead of a readable label — mirrors the detail page's idLabel.
  const breadcrumbIdLabel = useMemo(
    () => proposal?.created_by?.fullname?.trim() || proposal?.created_by?.code,
    [proposal]
  )

  const handleCancel = useCallback(() => {
    navigate(APP_PATH.PROPOSAL_BULK_JOB_TRANSFER_DETAIL.replace(':id', String(proposalId)))
  }, [navigate, proposalId])

  const handleSuccess = useCallback(
    (successId: number) => {
      navigate(APP_PATH.PROPOSAL_BULK_JOB_TRANSFER_DETAIL.replace(':id', String(successId)))
    },
    [navigate]
  )

  return (
    <>
      <PageTitle
        title="Chỉnh sửa đề xuất điều chuyển hàng loạt"
        idLabel={breadcrumbIdLabel}
        enableBackButton
        handleBackButton={handleCancel}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'px-10 py-6'}>
        {isLoading || !proposal ? (
          <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
        ) : (
          <BulkJobTransferWizard
            proposalId={proposalId}
            initialProposal={proposal}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        )}
      </Flex>
    </>
  )
}
