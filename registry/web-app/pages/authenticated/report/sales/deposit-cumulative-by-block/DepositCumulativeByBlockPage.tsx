import DepositCumulativeReportView from '@/features/sales/deposit-cumulative/components/DepositCumulativeReportView'
import { DEPOSIT_CUMULATIVE_REPORT_CONFIGS } from '@/features/sales/deposit-cumulative/constants'

export default function DepositCumulativeByBlockPage() {
  return <DepositCumulativeReportView config={DEPOSIT_CUMULATIVE_REPORT_CONFIGS.block} />
}
