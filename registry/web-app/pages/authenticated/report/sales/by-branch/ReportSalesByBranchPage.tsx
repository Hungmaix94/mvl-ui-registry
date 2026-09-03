import TkkdRevenueGoodsReportView from '@/features/sales/tkkd-reports/components/TkkdRevenueGoodsReportView'
import { TKKD_REVENUE_GOODS_REPORT_CONFIGS } from '@/features/sales/tkkd-reports/constants'

export default function ReportSalesByBranchPage() {
  return <TkkdRevenueGoodsReportView config={TKKD_REVENUE_GOODS_REPORT_CONFIGS.branch} />
}
