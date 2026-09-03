import { PageTitle } from '@/components/ui'
import { useNavigate, useParams } from 'react-router-dom'
import { Flex, Text } from '@radix-ui/themes'
import ContractForm from '@/features/contract/manage/_shares/components/ContractForm.tsx'
import { APP_PATH } from '@/routes'
import { useContract } from '@/features/contract/services/contract-service'
import { FullScreenLoading } from '@/components/Loading.tsx'
import { useAbility } from '@/lib/ability.ts'
import { useEffect } from 'react'
import toastService from '@/services/toast-service.tsx'
import { ContractStatus } from '@/constants/api-schema-aliases'

export default function ContractManageEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const contractId = id ? parseInt(id, 10) : 0
  const ability = useAbility()

  const { data: contract, isLoading, error, isError } = useContract(contractId)

  // Redirect when contract is expired (only expired cannot be edited)
  useEffect(() => {
    if (contract && contract.status === ContractStatus.expired) {
      toastService.error('Không thể chỉnh sửa hợp đồng đã hết hạn')
      navigate(APP_PATH.CONTRACT_MANAGE)
    }
  }, [contract, navigate])

  if (error || isError) {
    console.error('API error:', error)
  }

  // Permission check
  if (!ability.can('update', 'contract')) {
    return (
      <Flex direction="column" align="center" justify="center" gap="4" className="h-full">
        <Text className="typo-body-xl-semibold text-content-dark-3">
          Bạn không có quyền chỉnh sửa hợp đồng này.
        </Text>
      </Flex>
    )
  }

  // Status check - block edit only when status is expired
  if (contract && contract.status === ContractStatus.expired) {
    return (
      <Flex direction="column" align="center" justify="center" gap="4" className="h-full">
        <Text className="typo-body-xl-semibold text-content-dark-3">
          Không thể chỉnh sửa hợp đồng đã hết hạn.
        </Text>
      </Flex>
    )
  }

  const handleSuccess = (id: number) => {
    navigate(APP_PATH.CONTRACT_MANAGE_DETAIL.replace(':id', String(id)))
  }

  const handleCancel = () => {
    navigate(-1)
  }

  return (
    <>
      <PageTitle
        title={`Chỉnh sửa hợp đồng số ${contract?.contract_number || contract?.code || ''}`}
        idLabel={contract?.contract_number || contract?.code || ''}
        enableBackButton
        handleBackButton={handleCancel}
      />

      {isLoading ? (
        <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
      ) : !contract ? (
        <Flex direction="column" gap="5" className="px-10 pt-4 pb-8">
          <Text className="typo-body-xl-semibold text-content-dark-3">
            Không tìm thấy thông tin hợp đồng với ID: {contractId}
          </Text>
        </Flex>
      ) : (
        <Flex flexGrow={'1'} direction="column" gap="4" className={'px-10 py-6'}>
          <ContractForm initialData={contract} onSuccess={handleSuccess} onCancel={handleCancel} />
        </Flex>
      )}
    </>
  )
}
