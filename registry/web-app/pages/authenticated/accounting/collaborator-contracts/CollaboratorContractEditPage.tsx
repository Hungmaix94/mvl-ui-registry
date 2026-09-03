import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useAbility } from '@/lib/ability.ts'
import { isNotFoundError } from '@/utils/error-utils'

import { useCollaboratorContract } from '@/features/accounting/collaborator-contracts/services/collaborator-contract-service'
import CollaboratorContractEditForm from '@/features/accounting/collaborator-contracts/_shares/components/CollaboratorContractEditForm'

const CollaboratorContractEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const contractId = id ? parseInt(id, 10) : 0
  const ability = useAbility()

  const { data: contract, isLoading, error } = useCollaboratorContract(contractId)

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !contract
  }, [isLoading, error, contract])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  return (
    <Flex flexGrow="1" direction="column" className="bg-surface-primary-default overflow-hidden">
      <PageTitle title={`Chỉnh sửa hợp đồng ${contract?.code ?? ''}`.trim()} enableBackButton />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('update', 'collaborator_contract')}
      >
        <Flex p="7" flexGrow="1" direction="column" gap="5">
          <CollaboratorContractEditForm contractId={contractId} />
        </Flex>
      </DetailPageWrapper>
    </Flex>
  )
}

export default CollaboratorContractEditPage
