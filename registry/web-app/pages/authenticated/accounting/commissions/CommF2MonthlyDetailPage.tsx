import { useParams, useNavigate } from 'react-router-dom'
import { CommF2MonthlyDetail } from '@/features/accounting/commissions/components/CommF2MonthlyDetail'
import { useMonthlySummary } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { useAbility } from '@/lib/ability'

const CommF2MonthlyDetailPage = () => {
  const ability = useAbility()
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const navigate = useNavigate()

  const { data: record, isLoading, error } = useMonthlySummary('f2', id, { enabled: !!id })

  return (
    <>
      <DetailPageWrapper
        isLoading={isLoading}
        isError={!!error}
        isNotFound={!isLoading && !error && !record}
        hasPermission={ability.can('retrieve', 'f2monthlycommissionsummary')}
      >
        {record && <CommF2MonthlyDetail summary={record} onBack={() => navigate(-1)} />}
      </DetailPageWrapper>
    </>
  )
}

export default CommF2MonthlyDetailPage
