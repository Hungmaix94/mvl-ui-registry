import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import ContractForm from '@/features/contract/manage/_shares/components/ContractForm.tsx'
import { APP_PATH } from '@/routes'

import { ContractNet_percentage } from '@/api/schema.ts'
import { withRememberedSearch } from '@/utils/list-url-memory'

export default function ContractManageCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()

  const prefillData = location.state as {
    employee_id?: number
    effective_date?: string
    expiration_date?: string | null
    base_salary?: string
    net_percentage?: ContractNet_percentage
  } | null

  const handleSuccess = useCallback(
    (id: number) => {
      navigate(APP_PATH.CONTRACT_MANAGE_DETAIL.replace(':id', String(id)))
    },
    [navigate]
  )

  const handleCancel = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.CONTRACT_MANAGE))
  }, [navigate])

  return (
    <>
      <PageTitle title="Tạo mới hợp đồng" enableBackButton handleBackButton={handleCancel} />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'px-10 py-6'}>
        <ContractForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          prefillData={prefillData ?? undefined}
        />
      </Flex>
    </>
  )
}
