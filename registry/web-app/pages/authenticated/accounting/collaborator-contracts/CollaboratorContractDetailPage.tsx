import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { Button, PageTitle } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useAbility } from '@/lib/ability.ts'
import { isNotFoundError } from '@/utils/error-utils'
import { APP_PATH } from '@/routes'

import { useCollaboratorContract } from '@/features/accounting/collaborator-contracts/services/collaborator-contract-service'
import CollaboratorContractDetail from '@/features/accounting/collaborator-contracts/view-details/CollaboratorContractDetail'
import { useCollaboratorContractMarkSigned } from '@/features/accounting/collaborator-contracts/_shares/hooks/useCollaboratorContractMarkSigned'
import { useCollaboratorContractCancel } from '@/features/accounting/collaborator-contracts/_shares/hooks/useCollaboratorContractCancel'
import { ContractStatus } from '@/features/accounting/collaborator-contracts/types/collaborator-contract-types'

const CollaboratorContractDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const contractId = id ? parseInt(id, 10) : 0
  const navigate = useNavigate()
  const ability = useAbility()

  const { data: contract, isLoading, error } = useCollaboratorContract(contractId)

  const { openMarkSignedDialog } = useCollaboratorContractMarkSigned()
  const { openCancelDialog } = useCollaboratorContractCancel()

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !contract
  }, [isLoading, error, contract])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const handleEdit = useCallback(() => {
    if (contract) {
      navigate(APP_PATH.COLLABORATOR_CONTRACT_EDIT.replace(':id', String(contract.id)))
    }
  }, [contract, navigate])

  const handleShowHistory = useCallback(() => {
    if (id) {
      navigate(APP_PATH.COLLABORATOR_CONTRACT_HISTORY.replace(':id', id))
    }
  }, [navigate, id])

  const showWorkflowActions =
    contract?.status === ContractStatus.draft && ability.can('update', 'collaborator_contract')

  return (
    <>
      <PageTitle
        title={`Hợp đồng ${contract?.code ?? ''}`.trim()}
        enableBackButton
        handleEdit={ability.can('update', 'collaborator_contract') ? handleEdit : undefined}
        handleShowHistory={
          ability.can('histories', 'collaborator_contract') ? handleShowHistory : undefined
        }
        customActions={
          showWorkflowActions && contract ? (
            <div className="flex gap-3">
              <Button
                type="button"
                size="small"
                variant="primary"
                onClick={() => openMarkSignedDialog(contract)}
              >
                Đánh dấu đã ký
              </Button>
              <Button
                type="button"
                size="small"
                variant="secondary"
                onClick={() => openCancelDialog(contract)}
                className="border-action-primary-red-default text-action-primary-red-default hover:bg-action-primary-red-disabled"
              >
                Huỷ hợp đồng
              </Button>
            </div>
          ) : undefined
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'collaborator_contract')}
      >
        <Flex p="7" flexGrow="1" direction="column" gap="5">
          {contract && <CollaboratorContractDetail contract={contract} />}
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

export default CollaboratorContractDetailPage
