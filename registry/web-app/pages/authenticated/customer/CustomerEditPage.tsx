import { useCallback, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import CustomerForm from '@/features/customer/_shares/components/CustomerForm.tsx'
import { useCustomer } from '@/services/sales-service'
import { useAbility } from '@/lib/ability.ts'
import { APP_PATH } from '@/routes'
import { isNotFoundError } from '@/utils/error-utils'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

export default function CustomerEditPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const ability = useAbility()
  const customerId = parseInt(id || '', 10)

  const { data: customer, isLoading, error } = useCustomer(customerId)

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !customer
  }, [isLoading, error, customer])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const hasPermission = ability.can('update', 'customer')

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
      <PageTitle idLabel={customer?.full_name || customer?.business_name} enableBackButton />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={hasPermission}
      >
        <Flex flexGrow="1" direction="column" gap="4" className="pb-6">
          <CustomerForm
            mode="edit"
            customer={customer!}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </Flex>
      </DetailPageWrapper>
    </>
  )
}
