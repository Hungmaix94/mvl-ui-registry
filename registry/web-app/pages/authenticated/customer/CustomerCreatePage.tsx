import { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import CustomerForm from '@/features/customer/_shares/components/CustomerForm.tsx'
import { APP_PATH } from '@/routes'

export default function CustomerCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleSuccess = useCallback(() => {
    const from = location.state?.from
    navigate(from ?? APP_PATH.CUSTOMER_MANAGER)
  }, [navigate, location.state])

  const handleCancel = useCallback(() => {
    const from = location.state?.from
    navigate(from ?? APP_PATH.CUSTOMER_MANAGER)
  }, [navigate, location.state])

  return (
    <>
      <PageTitle title="Tạo khách hàng mới" enableBackButton />
      <Flex flexGrow="1" direction="column" gap="4">
        <CustomerForm mode="create" onSuccess={handleSuccess} onCancel={handleCancel} />
      </Flex>
    </>
  )
}
