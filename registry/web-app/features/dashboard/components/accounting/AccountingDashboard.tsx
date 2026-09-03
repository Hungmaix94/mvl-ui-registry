import { Flex, Separator } from '@radix-ui/themes'
import { useAbility } from '@/lib/ability'
import AccountantSummaryCards from './AccountantSummaryCards'
import CommissionPayableBlock from './CommissionPayableBlock'
import CommissionTrendChart from './CommissionTrendChart'
import DebtTrendChart from './DebtTrendChart'
import PartnerProjectTable from './PartnerProjectTable'
import {
  ACCOUNTANT_DASHBOARD_ACTIONS,
  ACCOUNTANT_DASHBOARD_SUBJECT,
} from './accountant-dashboard-constants'

const AccountingDashboard = () => {
  const ability = useAbility()

  const canViewSummary = ability.can(
    ACCOUNTANT_DASHBOARD_ACTIONS.SUMMARY,
    ACCOUNTANT_DASHBOARD_SUBJECT
  )
  const canViewDebtTrend = ability.can(
    ACCOUNTANT_DASHBOARD_ACTIONS.DEBT_TREND,
    ACCOUNTANT_DASHBOARD_SUBJECT
  )
  const canViewCommissionPayable = ability.can(
    ACCOUNTANT_DASHBOARD_ACTIONS.COMMISSION_PAYABLE,
    ACCOUNTANT_DASHBOARD_SUBJECT
  )
  const canViewCommissionTrend = ability.can(
    ACCOUNTANT_DASHBOARD_ACTIONS.COMMISSION_TREND,
    ACCOUNTANT_DASHBOARD_SUBJECT
  )
  const canViewPartnerTable = ability.can(
    ACCOUNTANT_DASHBOARD_ACTIONS.PARTNER_TABLE,
    ACCOUNTANT_DASHBOARD_SUBJECT
  )

  const canViewAny =
    canViewSummary ||
    canViewDebtTrend ||
    canViewCommissionPayable ||
    canViewCommissionTrend ||
    canViewPartnerTable

  if (!canViewAny) return null

  return (
    <Flex direction={'column'} justify={'between'} className={'gap-6 p-10 pt-6 pb-0'}>
      <Flex direction={'column'} align={'start'} gap={'2'}>
        <h1 className="text-2xl font-bold">Kế toán</h1>
      </Flex>

      {canViewSummary && <AccountantSummaryCards />}

      {(canViewDebtTrend || canViewCommissionPayable) && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr_1fr]">
          {canViewDebtTrend && <DebtTrendChart />}
          {canViewCommissionPayable && <CommissionPayableBlock />}
        </div>
      )}

      {canViewCommissionTrend && <CommissionTrendChart />}

      {canViewPartnerTable && <PartnerProjectTable />}

      <Separator orientation={'horizontal'} className={'!w-full'} />
    </Flex>
  )
}

export default AccountingDashboard
