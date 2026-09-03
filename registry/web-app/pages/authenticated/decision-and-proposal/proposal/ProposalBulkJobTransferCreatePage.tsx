import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import BulkJobTransferWizard from '@/features/decision-and-proposal/proposal/bulk-job-transfer/create/BulkJobTransferWizard.tsx'
import { APP_PATH } from '@/routes'
import { withRememberedSearch } from '@/utils/list-url-memory'

export default function ProposalBulkJobTransferCreatePage() {
  const navigate = useNavigate()

  const handleCancel = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.PROPOSAL_BULK_JOB_TRANSFER))
  }, [navigate])

  const handleSuccess = useCallback(
    (id: number) => {
      navigate(APP_PATH.PROPOSAL_BULK_JOB_TRANSFER_DETAIL.replace(':id', String(id)))
    },
    [navigate]
  )

  return (
    <>
      <PageTitle
        title="Tạo đề xuất điều chuyển hàng loạt"
        enableBackButton
        handleBackButton={handleCancel}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'px-10 py-6'}>
        <BulkJobTransferWizard onSuccess={handleSuccess} onCancel={handleCancel} />
      </Flex>
    </>
  )
}
