import { useMemo } from 'react'
import DashboardSummaryCard from '@/features/dashboard/components/card/DashboardSummaryCard.tsx'
import { IconBank, IconMoney, IconWallet } from '@/assets/icons'
import { LoadingWrapper } from '@/components'
import { useAccountantDashboardSummary } from '@/features/accounting/accountant-dashboard/services/accountant-dashboard-service'
import { formatCurrencyVND } from '@/utils/common'

function AccountantSummaryCards() {
  const { data, isLoading } = useAccountantDashboardSummary()

  const monthLabel = useMemo(
    () => (data ? `tháng ${data.month}/${data.year}` : 'tháng này'),
    [data]
  )

  return (
    <LoadingWrapper isLoading={isLoading} containerHeight={140}>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <DashboardSummaryCard
          title="Tổng đã thu trong tháng"
          tooltip={`Tổng đã thu ${monthLabel}`}
          value={formatCurrencyVND(data?.total_collected ?? 0)}
          unit="VND"
          icon={<IconMoney size={32} />}
        />
        <DashboardSummaryCard
          title="Công nợ phải thu (CĐT)"
          tooltip={`Công nợ phải thu CĐT ${monthLabel}`}
          value={formatCurrencyVND(data?.investor_receivable ?? 0)}
          unit="VND"
          icon={<IconBank size={32} />}
        />
        <DashboardSummaryCard
          title="Công nợ phải trả (F2)"
          tooltip={`Công nợ phải trả F2 ${monthLabel}`}
          value={formatCurrencyVND(data?.f2_payable ?? 0)}
          unit="VND"
          icon={<IconWallet size={32} />}
        />
      </div>
    </LoadingWrapper>
  )
}

export default AccountantSummaryCards
