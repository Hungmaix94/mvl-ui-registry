import BaseHistoriesPage from '@/pages/authenticated/object-history/BaseHistoriesPage'
import { useParams } from 'react-router-dom'
import { useDealWorkspace } from '@/features/sales/deals/services/deal-service'

const DealHistoryPage = () => {
  const { id } = useParams<{ id: string }>()
  const dealId = Number(id)

  const { data: deal } = useDealWorkspace(dealId)

  const idLabel = deal?.header?.deal_code || String(dealId)

  return (
    <BaseHistoriesPage path="/api/sales/deals/{id}/histories/" idLabel={idLabel || undefined} />
  )
}

export default DealHistoryPage
