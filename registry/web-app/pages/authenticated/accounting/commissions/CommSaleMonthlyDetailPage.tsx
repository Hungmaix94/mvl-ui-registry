import { useParams, useNavigate } from 'react-router-dom'
import { CommSaleMonthlyDetail } from '@/features/accounting/commissions/components/CommSaleMonthlyDetail'
import { useMonthlySummary } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { useAbility } from '@/lib/ability'

const CommSaleMonthlyDetailPage = () => {
  const ability = useAbility()
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const navigate = useNavigate()

  const { data: record, isLoading, error } = useMonthlySummary('sales', id, { enabled: !!id })

  return (
    <>
      <DetailPageWrapper
        isLoading={isLoading}
        isError={!!error}
        isNotFound={!isLoading && !error && !record}
        hasPermission={ability.can('retrieve', 'salesmonthlycommissionsummary')}
      >
        {record && <CommSaleMonthlyDetail summary={record} onBack={() => navigate(-1)} />}
      </DetailPageWrapper>
    </>
  )
}

export default CommSaleMonthlyDetailPage
