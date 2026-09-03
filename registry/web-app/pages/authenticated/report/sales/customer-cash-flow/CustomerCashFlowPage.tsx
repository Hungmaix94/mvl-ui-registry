import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant'
import CustomerCashFlowReportView from '@/features/sales/customer-cash-flow/components/CustomerCashFlowReportView'
import { useDepositCumulativeFilters } from '@/features/sales/deposit-cumulative/hooks/useDepositCumulativeFilters'
import type { CustomerCashFlowParams } from '@/features/sales/customer-cash-flow/services/customer-cash-flow-service'

/**
 * Dùng lại bộ lọc kỳ + org-chart của báo cáo cọc lũy kế thay vì viết bản thứ hai:
 * hai báo cáo nhận đúng cùng bộ tham số (year+month bắt buộc, branch/block/department
 * tuỳ chọn) và đều neo trạng thái vào URL.
 */
export default function CustomerCashFlowPage() {
  const { year, month, branch, block, department, isUrlReady } = useDepositCumulativeFilters()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const params = useMemo<CustomerCashFlowParams | undefined>(() => {
    if (!isUrlReady || !year || !month) return undefined
    return { year, month, branch, block, department }
  }, [isUrlReady, year, month, branch, block, department])

  // Giữ nguyên bộ lọc khi sang màn chứng từ: người dùng đang xem một kỳ/chi nhánh
  // cụ thể, sang màn khác mà mất phạm vi thì con số không còn khớp nhau.
  const handleOpenDetail = () => {
    navigate(`${APP_PATH.REPORT_SALES_CUSTOMER_CASH_DETAIL}?${searchParams.toString()}`)
  }

  return <CustomerCashFlowReportView params={params} onOpenDetail={handleOpenDetail} />
}
