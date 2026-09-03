import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import ContractTypeForm from '@/features/contract/contract-type/_shares/components/ContractTypeForm.tsx'
import { APP_PATH } from '@/routes'
import { withRememberedSearch } from '@/utils/list-url-memory'

export default function ContractTypeCreatePage() {
  const navigate = useNavigate()

  const handleSuccess = useCallback(() => {
    navigate(APP_PATH.CONTRACT_TYPE)
  }, [navigate])

  const handleCancel = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.CONTRACT_TYPE))
  }, [navigate])

  return (
    <>
      <PageTitle
        breadcrumb={[
          { label: 'Hợp đồng' },
          { label: 'Loại hợp đồng', href: APP_PATH.CONTRACT_TYPE },
          { label: 'Tạo mới' },
        ]}
        title="Tạo mới loại hợp đồng"
        enableBackButton
        handleBackButton={handleCancel}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <ContractTypeForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </Flex>
    </>
  )
}
