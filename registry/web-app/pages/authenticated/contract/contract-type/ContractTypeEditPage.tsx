import { PageTitle } from '@/components/ui'
import { useNavigate, useParams } from 'react-router-dom'
import { Flex, Text } from '@radix-ui/themes'
import ContractTypeForm from '@/features/contract/contract-type/_shares/components/ContractTypeForm.tsx'
import { APP_PATH } from '@/routes'
import { useContractType } from '@/features/contract/services/contract-type-service'
import { FullScreenLoading } from '@/components/Loading.tsx'
import { useAbility } from '@/lib/ability.ts'

export default function ContractTypeEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const contractTypeId = id ? parseInt(id, 10) : 0
  const ability = useAbility()

  const { data: contractType, isLoading, error, isError } = useContractType(contractTypeId)

  if (error || isError) {
    console.error('API error:', error)
  }

  // Permission check
  if (!ability.can('update', 'contract_type')) {
    return (
      <Flex direction="column" align="center" justify="center" gap="4" className="h-full">
        <Text className="typo-body-xl-semibold text-content-dark-3">
          Bạn không có quyền chỉnh sửa loại hợp đồng này.
        </Text>
      </Flex>
    )
  }

  const handleSuccess = () => {
    navigate(APP_PATH.CONTRACT_TYPE)
  }

  const handleCancel = () => {
    navigate(-1)
  }

  return (
    <>
      <PageTitle
        breadcrumb={[
          { label: 'Hợp đồng' },
          { label: 'Loại hợp đồng', href: APP_PATH.CONTRACT_TYPE },
          { label: 'Chỉnh sửa' },
        ]}
        title="Chỉnh sửa loại hợp đồng"
        enableBackButton
        handleBackButton={handleCancel}
        idLabel={contractType?.name}
      />

      {isLoading ? (
        <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
      ) : !contractType ? (
        <Flex direction="column" gap="5" className="px-10 pt-4 pb-8">
          <Text className="typo-body-xl-semibold text-content-dark-3">
            Không tìm thấy thông tin loại hợp đồng với ID: {contractTypeId}
          </Text>
        </Flex>
      ) : (
        <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
          <ContractTypeForm
            initialData={contractType}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </Flex>
      )}
    </>
  )
}
