import BaseHistoriesPage from '@/pages/authenticated/object-history/BaseHistoriesPage'
import { useParams } from 'react-router-dom'
import { useDepositContract } from '@/features/sales/deposit-contracts/services/deposit-contract-service'

const DepositContractHistoryPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data: contract } = useDepositContract(Number(id))

  const code = contract?.code || ''
  const customerCode = contract?.customer_detail?.code || ''
  // Use product inventory code or project name as the last segment
  const productCode =
    contract?.product_inventory_detail?.unit_number ||
    contract?.product_inventory_detail?.code ||
    contract?.project_detail?.name ||
    ''

  const idLabel = [code, customerCode, productCode].filter(Boolean).join(' - ')

  return (
    <BaseHistoriesPage
      path="/api/sales/deposit-contracts/{id}/histories/"
      idLabel={idLabel || undefined}
    />
  )
}

export default DepositContractHistoryPage
