import RecruitmentDashboard from '@/features/dashboard/components/recruitment/RecruitmentDashboard.tsx'
import type { ReactNode } from 'react'

import { PageTitle } from '@/components/ui'
import RevenueDashboard from '@/features/dashboard/components/revenue/RevenueDashboard.tsx'
import { Flex } from '@radix-ui/themes'
import TimesheetDashboard from '@/features/dashboard/components/timesheet/TimesheetDashboard.tsx'
import HrmCommonRealtime from '@/features/dashboard/components/hrm-common/HrmCommonRealtime'
import AccountingDashboard from '@/features/dashboard/components/accounting/AccountingDashboard.tsx'
import SalesAdminDashboard from '@/features/dashboard/components/sales/SalesAdminDashboard.tsx'
import FeatureGate from '@/components/feature-gate/FeatureGate'
import { FEATURE_KEY } from '@/constants/feature-flags'

/**
 * `tabs` để `DashboardRouter` chèn hàng tab chọn bảng vào đây khi CEO đang xem chế độ "Tổng hợp".
 * Không có nó thì đổi sang Tổng hợp xong là mất đường quay lại, phải bấm Back trình duyệt.
 * Bỏ trống (mặc định) ⇒ hành vi y hệt trước đây.
 */
function DashboardPage({ tabs }: { tabs?: ReactNode } = {}) {
  return (
    <>
      <PageTitle />
      {tabs}

      <Flex direction={'column'}>
        <HrmCommonRealtime />

        <TimesheetDashboard />

        <RecruitmentDashboard />

        {/* "Doanh thu" đọc endpoint payroll (sales revenue report) và thuộc cụm "Tính lương",
            không thuộc 5 cụm bật/tắt được — cố ý không bọc FeatureGate. */}
        <RevenueDashboard />

        {/* Mọi card ở đây điều hướng sang màn của "Thư ký dự án" (dự án, giao dịch, đối chiếu
            CĐT, hợp đồng booking/cọc, bảng kê) — tắt cụm mà vẫn hiện thì bấm vào là văng 404. */}
        <FeatureGate feature={FEATURE_KEY.PROJECT_SECRETARY}>
          <SalesAdminDashboard />
        </FeatureGate>

        <FeatureGate feature={FEATURE_KEY.ACCOUNTING}>
          <AccountingDashboard />
        </FeatureGate>
      </Flex>
    </>
  )
}

export default DashboardPage
