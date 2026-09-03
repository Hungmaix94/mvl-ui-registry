import { useParams, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { CommSlkPoolDetail } from '@/features/accounting/commissions/components/CommSlkPoolDetail'
import { useLinkedExchangeMonthlyCommission } from '@/features/accounting/linked-exchange-monthly-commissions/services/linked-exchange-monthly-commission-service'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { useAbility } from '@/lib/ability'

const CommSlkMonthlyPoolDetailPage = () => {
  const ability = useAbility()
  const { id: idStr, poolKey } = useParams<{ id: string; poolKey: string }>()
  const id = Number(idStr)
  const navigate = useNavigate()

  const {
    data: record,
    isLoading,
    error,
  } = useLinkedExchangeMonthlyCommission(id, { enabled: !!id })

  const isNotFound = useMemo(() => !isLoading && !record, [isLoading, record])
  const isError = useMemo(() => !!error, [error])

  return (
    <DetailPageWrapper
      isLoading={isLoading}
      isError={isError}
      isNotFound={isNotFound}
      hasPermission={ability.can('retrieve', 'linkedexchangemonthlycommission')}
    >
      {record && (
        <CommSlkPoolDetail summary={record} poolKey={poolKey ?? ''} onBack={() => navigate(-1)} />
      )}
    </DetailPageWrapper>
  )
}

export default CommSlkMonthlyPoolDetailPage
