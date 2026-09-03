import BaseHistoryDetailPage from '@/pages/authenticated/object-history/BaseHistoryDetailPage'

const DepositContractHistoryDetailPage = () => {
  return <BaseHistoryDetailPage path="/api/sales/deposit-contracts/{id}/history/{log_id}/" />
}

export default DepositContractHistoryDetailPage
