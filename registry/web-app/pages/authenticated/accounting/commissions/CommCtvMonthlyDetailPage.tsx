import { useParams, useNavigate } from 'react-router-dom'
import { CommCtvMonthlyDetail } from '@/features/accounting/commissions/components/CommCtvMonthlyDetail'
import { useMonthlySummary } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { useAbility } from '@/lib/ability'

const CommCtvMonthlyDetailPage = () => {
  const ability = useAbility()
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const navigate = useNavigate()

  const {
    data: record,
    isLoading,
    error,
  } = useMonthlySummary('collaborators', id, { enabled: !!id })

  return (
    <>
      <DetailPageWrapper
        isLoading={isLoading}
        isError={!!error}
        isNotFound={!isLoading && !error && !record}
        hasPermission={ability.can('retrieve', 'collaboratormonthlycommissionsummary')}
      >
        {record && <CommCtvMonthlyDetail summary={record} onBack={() => navigate(-1)} />}
      </DetailPageWrapper>
    </>
  )
}

export default CommCtvMonthlyDetailPage
