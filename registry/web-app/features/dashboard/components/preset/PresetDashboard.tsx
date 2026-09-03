import { Fragment, lazy, Suspense, type ComponentType, type ReactNode } from 'react'

import { PageTitle } from '@/components/ui'
import FeatureGate from '@/components/feature-gate/FeatureGate'
import { useAbility } from '@/lib/ability'
import {
  DASHBOARD_BLOCK,
  DASHBOARD_BLOCK_ABILITY,
  DASHBOARD_BLOCK_FEATURE,
  BLOCK_SPAN,
  PRESET_BLOCKS,
  SECTION_PRESETS,
  SELF_GATED,
  type DashboardBlockKey,
  type DashboardPreset,
} from '../../constants/dashboard-blocks'

import DebtTrendChart from '../accounting/DebtTrendChart'
import CommissionTrendChart from '../accounting/CommissionTrendChart'
import RevenueTrendChart from '../sales/RevenueTrendChart'
import StaffGrowthByBranchesChart from '../chart/StaffGrowthByBranchesChart'
import KpiAchievementBlock from '../exec/KpiAchievementBlock'
import TopProjectsParetoBlock from '../exec/TopProjectsParetoBlock'
import ExecKpiStrip from '../exec/ExecKpiStrip'
import CollectionProgressBlock from '../exec/CollectionProgressBlock'
import EmployeeKpiBlock from '../exec/EmployeeKpiBlock'
import DepartmentKpiBlock from '../exec/DepartmentKpiBlock'
import AttendanceRateByBranchChart from '../chart/AttendanceRateByBranchChart'
import OperationsQueueBlock from '../exec/OperationsQueueBlock'
/**
 * Section dùng lại nạp LAZY, cố ý.
 *
 * Import tĩnh chúng kéo cả cây phụ thuộc của dashboard cũ (notification, route constant...) vào
 * bundle của `/` — và tạo vòng lặp import khiến `APP_PATH` undefined lúc khởi tạo module, đúng loại
 * bẫy đã ghi ở đầu `menu-items.ts`. Preset điều hành/GĐKD/TPKD không đụng tới chúng thì không nên
 * phải trả giá tải chúng.
 */
const AccountingDashboard = lazy(() => import('../accounting/AccountingDashboard'))
const SalesAdminDashboard = lazy(() => import('../sales/SalesAdminDashboard'))
const RecruitmentDashboard = lazy(() => import('../recruitment/RecruitmentDashboard'))
const HrmCommonRealtime = lazy(() => import('../hrm-common/HrmCommonRealtime'))
const TimesheetDashboard = lazy(() => import('../timesheet/TimesheetDashboard'))

/**
 * Dashboard theo preset vai trò — MỘT component dựng được mọi preset.
 *
 * Không tách thành `CeoDashboardPage` / `DirectorDashboardPage` / ... : ba trang gần như trùng nhau
 * sẽ lệch nhau ngay lần sửa bố cục đầu tiên. Khác biệt duy nhất giữa các vai trò là DANH SÁCH KHỐI,
 * và nó đã nằm trong `PRESET_BLOCKS`.
 *
 * Chỉ dùng endpoint BE ĐÃ CÓ. Ba khối trong đề xuất (biên lợi nhuận gộp, doanh thu YoY, doanh thu
 * trên đầu người) cố ý CHƯA render vì endpoint chưa tồn tại — dựng biểu đồ bằng số bịa để "xem cho
 * đủ" là cách nhanh nhất để một ảnh chụp màn hình sai đi vào cuộc họp.
 *
 * KHÔNG có ô chọn kỳ ở đầu trang: cả 9 khối tái sử dụng đều là component zero-prop, tự giữ bộ lọc
 * riêng. Đặt một control không điều khiển được gì còn tệ hơn không đặt. Muốn kỳ dùng chung thì phải
 * sửa 9 khối đang chạy production — việc của pha sau.
 */

const BLOCK_COMPONENT: Record<DashboardBlockKey, ComponentType> = {
  [DASHBOARD_BLOCK.DEBT_TREND]: DebtTrendChart,
  [DASHBOARD_BLOCK.COMMISSION_TREND]: CommissionTrendChart,
  [DASHBOARD_BLOCK.REVENUE_TREND]: RevenueTrendChart,
  [DASHBOARD_BLOCK.KPI_ACHIEVEMENT]: KpiAchievementBlock,
  [DASHBOARD_BLOCK.TOP_PROJECTS_PARETO]: TopProjectsParetoBlock,
  [DASHBOARD_BLOCK.EXEC_KPI_STRIP]: ExecKpiStrip,
  [DASHBOARD_BLOCK.COLLECTION_PROGRESS]: CollectionProgressBlock,
  [DASHBOARD_BLOCK.EMPLOYEE_KPI]: EmployeeKpiBlock,
  [DASHBOARD_BLOCK.DEPARTMENT_KPI]: DepartmentKpiBlock,
  [DASHBOARD_BLOCK.STAFF_GROWTH]: StaffGrowthByBranchesChart,
  [DASHBOARD_BLOCK.OPERATIONS_QUEUE]: OperationsQueueBlock,
  [DASHBOARD_BLOCK.ATTENDANCE_RATE]: AttendanceRateByBranchChart,

  [DASHBOARD_BLOCK.SECTION_ACCOUNTING]: AccountingDashboard,
  [DASHBOARD_BLOCK.SECTION_SALES_ADMIN]: SalesAdminDashboard,
  [DASHBOARD_BLOCK.SECTION_RECRUITMENT]: RecruitmentDashboard,
  [DASHBOARD_BLOCK.SECTION_HRM_COMMON]: HrmCommonRealtime,
  [DASHBOARD_BLOCK.SECTION_TIMESHEET]: TimesheetDashboard,
}

export type PresetDashboardProps = {
  preset: DashboardPreset
  title: string
  /** Hàng tab chọn bảng, render ngay dưới tiêu đề. Chỉ vai trò được đổi bảng mới truyền vào. */
  tabs?: ReactNode
}

const PresetDashboard = ({ preset, title, tabs }: PresetDashboardProps) => {
  const ability = useAbility()
  const isSectionPreset = SECTION_PRESETS.includes(preset)

  const allowed = new Set(
    PRESET_BLOCKS[preset].filter((key) => {
      const guard = DASHBOARD_BLOCK_ABILITY[key]
      // Section tự kiểm quyền bên trong và tự trả null — kiểm lại ở đây là đoán mò hộ nó.
      if (guard === SELF_GATED) return true
      return ability.can(guard[0], guard[1])
    })
  )

  /**
   * Bọc `FeatureGate` của đúng cụm mà khối thuộc về, và CHỈ render khi có quyền.
   * Trả `null` khi không đủ điều kiện — khối không được mount, nên cũng không gọi API.
   */
  const renderBlock = (key: DashboardBlockKey) => {
    if (!allowed.has(key)) return null

    const Block = BLOCK_COMPONENT[key]
    const feature = DASHBOARD_BLOCK_FEATURE[key]
    // Suspense cần cho các section nạp lazy; khối thường không chạm tới nhánh này.
    const node = (
      <Suspense fallback={null}>
        <Block />
      </Suspense>
    )

    if (!feature) return node
    return <FeatureGate feature={feature}>{node}</FeatureGate>
  }

  /**
   * Bố cục do THỨ TỰ KHỐI trong preset quyết định, không hard-code ở đây.
   *
   * Đây là điểm mấu chốt để CEO và trưởng phòng có hai trang khác nhau về bản chất: CEO cần số
   * trước, trưởng phòng cần hàng đợi vận hành trước. Trước đó thứ tự nằm cứng trong JSX nên mọi
   * preset buộc phải giống nhau.
   *
   * Khối `half` được gom từng cặp vào một hàng 2 cột; khối `full` đứng riêng. Cặp bị lẻ (khối cuối,
   * hoặc bạn cùng hàng bị ẩn vì thiếu quyền) thì tự chiếm nguyên hàng thay vì chừa nửa hàng trống.
   */
  const rows: ReactNode[] = []
  let pendingHalf: { key: DashboardBlockKey; node: ReactNode } | null = null

  const flushPendingHalf = () => {
    if (!pendingHalf) return
    rows.push(<Fragment key={`solo-${pendingHalf.key}`}>{pendingHalf.node}</Fragment>)
    pendingHalf = null
  }

  for (const key of PRESET_BLOCKS[preset]) {
    const node = renderBlock(key)
    if (!node) continue

    if (BLOCK_SPAN[key] === 'full') {
      flushPendingHalf()
      rows.push(<Fragment key={key}>{node}</Fragment>)
      continue
    }

    if (!pendingHalf) {
      pendingHalf = { key, node }
      continue
    }

    rows.push(
      <div key={`${pendingHalf.key}-${key}`} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {pendingHalf.node}
        {node}
      </div>
    )
    pendingHalf = null
  }
  flushPendingHalf()

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle title={title} />
      {tabs}

      <div className="flex flex-grow flex-col gap-4 overflow-x-hidden overflow-y-auto pt-4 pb-6">
        {isSectionPreset ? (
          <div className="flex flex-col">
            {PRESET_BLOCKS[preset].map((key) => (
              <Fragment key={key}>{renderBlock(key)}</Fragment>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-7">{rows}</div>
        )}
      </div>
    </div>
  )
}

export default PresetDashboard
