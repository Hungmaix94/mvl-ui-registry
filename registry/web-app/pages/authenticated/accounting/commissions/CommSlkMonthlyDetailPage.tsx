import { useParams, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { CommSlkMonthlyDetail } from '@/features/accounting/commissions/components/CommSlkMonthlyDetail'
import { useLinkedExchangeMonthlyCommission } from '@/features/accounting/linked-exchange-monthly-commissions/services/linked-exchange-monthly-commission-service'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { useAbility } from '@/lib/ability'

const CommSlkMonthlyDetailPage = () => {
  const ability = useAbility()
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const navigate = useNavigate()

  const {
    data: record,
    isLoading,
    error,
  } = useLinkedExchangeMonthlyCommission(id, { enabled: !!id })

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    return !record
  }, [isLoading, record])

  const isError = useMemo(() => {
    return !!error
  }, [error])

  return (
    <>
      <DetailPageWrapper
        isLoading={isLoading}
        isError={isError}
        isNotFound={isNotFound}
        hasPermission={ability.can('retrieve', 'linkedexchangemonthlycommission')}
      >
        {record && <CommSlkMonthlyDetail summary={record} onBack={() => navigate(-1)} />}
      </DetailPageWrapper>
    </>
  )
}

export default CommSlkMonthlyDetailPage
