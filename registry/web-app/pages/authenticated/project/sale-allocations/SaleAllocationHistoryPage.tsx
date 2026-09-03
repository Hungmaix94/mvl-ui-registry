import BaseHistoriesPage from '@/pages/authenticated/object-history/BaseHistoriesPage'
import { useParams } from 'react-router-dom'
import { useSalesAllocation } from '@/features/project/sale-allocations/services/sales-allocation-service'

const SaleAllocationHistoryPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: sa } = useSalesAllocation(id ?? '')

  const code = sa?.code || ''
  const name = sa?.name || ''
  const idLabel = [code, name].filter(Boolean).join(' - ')

  return (
    <BaseHistoriesPage
      path="/api/realestate/sales-allocations/{id}/histories/"
      idLabel={idLabel || undefined}
    />
  )
}

export default SaleAllocationHistoryPage
