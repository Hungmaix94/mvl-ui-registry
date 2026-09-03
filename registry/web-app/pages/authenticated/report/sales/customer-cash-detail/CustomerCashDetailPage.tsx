import { useMemo } from 'react'
import CustomerCashDetailView from '@/features/sales/customer-cash-flow/components/CustomerCashDetailView'
import { useDepositCumulativeFilters } from '@/features/sales/deposit-cumulative/hooks/useDepositCumulativeFilters'
import type { CustomerCashFlowParams } from '@/features/sales/customer-cash-flow/services/customer-cash-flow-service'

/** Cùng bộ lọc với màn pivot, để bấm từ một ô sang đây không đổi phạm vi. */
export default function CustomerCashDetailPage() {
  const { year, month, branch, block, department, isUrlReady } = useDepositCumulativeFilters()

  const params = useMemo<CustomerCashFlowParams | undefined>(() => {
    if (!isUrlReady || !year || !month) return undefined
    return { year, month, branch, block, department }
  }, [isUrlReady, year, month, branch, block, department])

  return <CustomerCashDetailView params={params} />
}
