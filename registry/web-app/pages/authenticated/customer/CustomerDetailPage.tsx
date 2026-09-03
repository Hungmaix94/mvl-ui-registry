import { useCallback, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { useCustomer } from '@/services/sales-service'
import { resolveCustomerTitle } from '@/features/customer/_shares/utils/customer-display'
import { useAbility } from '@/lib/ability.ts'
import { APP_PATH } from '@/routes'
import { isNotFoundError } from '@/utils/error-utils'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { CustomerDetail } from '@/features/customer/view/CustomerDetail'
import { useCustomerDelete } from '@/features/customer/_shares/hooks/useCustomerDelete.tsx'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const ability = useAbility()
  const customerId = parseInt(id || '', 10)

  const { openDeleteDialog } = useCustomerDelete(() => {
    const from = location.state?.from
    if (from) {
      navigate(from)
    } else {
      navigate(APP_PATH.CUSTOMER_MANAGER)
    }
  })

  const { data: customer, isLoading, error } = useCustomer(customerId)
  const customerTitle = useMemo(() => resolveCustomerTitle(customer), [customer])

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !customer
  }, [isLoading, error, customer])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const hasReadPermission = ability.can('retrieve', 'customer')

  const handleEdit = useCallback(() => {
    if (id) navigate(APP_PATH.CUSTOMER_MANAGER_EDIT.replace(':id', id))
  }, [navigate, id])

  const handleHistory = useCallback(() => {
    if (id) navigate(APP_PATH.CUSTOMER_MANAGER_HISTORY.replace(':id', id))
  }, [navigate, id])

  const handleDelete = useCallback(() => {
    if (customer) {
      openDeleteDialog(customer)
    }
  }, [customer, openDeleteDialog])

  return (
    <>
      <PageTitle
        title={customerTitle}
        enableBackButton
        handleEdit={ability.can('update', 'customer') ? handleEdit : undefined}
        handleShowHistory={ability.can('histories', 'customer') ? handleHistory : undefined}
        handleDelete={ability.can('destroy', 'customer') ? handleDelete : undefined}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={hasReadPermission}
      >
        <CustomerDetail customer={customer} />
      </DetailPageWrapper>
    </>
  )
}
