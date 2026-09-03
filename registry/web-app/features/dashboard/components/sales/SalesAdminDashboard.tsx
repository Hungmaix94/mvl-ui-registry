import { Flex, Separator } from '@radix-ui/themes'
import { useAbility } from '@/lib/ability'
import PartnerRealtime from '@/features/dashboard/components/partner/PartnerRealtime'
import SalesAdminSummaryTiles from './SalesAdminSummaryTiles'
import SalesConfirmedReconciliationCard from './SalesConfirmedReconciliationCard'
import RevenueTrendChart from './RevenueTrendChart'
import PerformanceByOrgChart from './PerformanceByOrgChart'
import TransactionsByProjectChart from './TransactionsByProjectChart'
import {
  SALES_ADMIN_DASHBOARD_ACTIONS,
  SALES_ADMIN_DASHBOARD_SUBJECT,
} from './sales-admin-dashboard-constants'

const SalesAdminDashboard = () => {
  const ability = useAbility()

  const canViewSummary = ability.can(
    SALES_ADMIN_DASHBOARD_ACTIONS.SUMMARY,
    SALES_ADMIN_DASHBOARD_SUBJECT
  )
  const canViewRevenueTrend = ability.can(
    SALES_ADMIN_DASHBOARD_ACTIONS.REVENUE_TREND,
    SALES_ADMIN_DASHBOARD_SUBJECT
  )
  const canViewPerformance = ability.can(
    SALES_ADMIN_DASHBOARD_ACTIONS.PERFORMANCE,
    SALES_ADMIN_DASHBOARD_SUBJECT
  )
  const canViewTransactions = ability.can(
    SALES_ADMIN_DASHBOARD_ACTIONS.TRANSACTIONS_BY_PROJECT,
    SALES_ADMIN_DASHBOARD_SUBJECT
  )
  const canViewPendingRecon = ability.can(
    SALES_ADMIN_DASHBOARD_ACTIONS.PENDING_RECONCILIATIONS,
    SALES_ADMIN_DASHBOARD_SUBJECT
  )

  const canViewAny =
    canViewSummary ||
    canViewRevenueTrend ||
    canViewPerformance ||
    canViewTransactions ||
    canViewPendingRecon

  if (!canViewAny) return null

  return (
    <Flex direction={'column'} justify={'between'} className={'gap-6 p-10 pt-6 pb-0'}>
      <Flex direction={'column'} align={'start'} gap={'2'}>
        <h1 className="text-2xl font-bold">Tổng quan Sales</h1>
      </Flex>

      {/* Một hàng tile chảy tự do, tự xuống dòng theo bề rộng màn. "Đối soát chờ duyệt" nằm trong
          hàng này — trước đây nó là một khối danh sách riêng cạnh biểu đồ giao dịch. */}
      {(canViewSummary || canViewPendingRecon) && <SalesAdminSummaryTiles />}

      {/* Sinh nhật đối tác giữ cụm RIÊNG có nhãn của nó: gộp vào hàng trên thì tile "CĐT / Sàn
          liên kết" đứng một mình không nói được nó đang đếm sinh nhật. */}
      <PartnerRealtime />

      {/* Số tiền hàng tỉ không nhét vừa badge tròn nên ô này không thành tile. Nó là DẢI NGANG
          full-width, không phải thẻ vuông — xem lý do trong chính component. Đứng cuối cụm tile và
          ngay trên biểu đồ xu hướng doanh thu. */}
      {canViewSummary && <SalesConfirmedReconciliationCard />}

      {canViewRevenueTrend && <RevenueTrendChart />}

      {canViewPerformance && <PerformanceByOrgChart />}

      {canViewTransactions && <TransactionsByProjectChart />}

      <Separator orientation={'horizontal'} className={'!w-full'} />
    </Flex>
  )
}

export default SalesAdminDashboard
