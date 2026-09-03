import TkkdRevenueGoodsDetailView from '@/features/sales/tkkd-reports/components/TkkdRevenueGoodsDetailView'
import { TKKD_REVENUE_GOODS_REPORT_CONFIGS } from '@/features/sales/tkkd-reports/constants'

export default function ReportSalesByDivisionDetailPage() {
  return <TkkdRevenueGoodsDetailView config={TKKD_REVENUE_GOODS_REPORT_CONFIGS.block} />
}
