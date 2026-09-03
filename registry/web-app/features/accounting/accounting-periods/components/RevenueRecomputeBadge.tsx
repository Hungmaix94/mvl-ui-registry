import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'

/** Badge "Cần tính lại" cho các màn doanh thu/KPI đọc output đã persist của
 *  compute() (DepartmentMonthlyKpi / EmployeeMonthlyKpi / SalesRevenue).
 *
 *  BE set `AccountingPeriod.revenue_recompute_needed = true` mỗi khi một input ghi
 *  nhận đổi (ghim dial, duyệt / mở lại / revert bảng kê) và tự clear khi compute()
 *  chạy lại. Thiếu badge thì số cũ trên màn đọc như số đúng — đúng bệnh
 *  "hiển thị khác tính" mà cụm dial auto-default đang chữa; đây là phần bắt buộc,
 *  không phải trang trí (plan dial-auto-default §3.4).
 */
const PERIOD_TITLE =
  'Dữ liệu ghi nhận (dial % chi trả / trạng thái duyệt bảng kê) đã thay đổi sau lần tính gần nhất — số liệu đang hiển thị có thể cũ. Chạy lại tính toán hoa hồng KPI của kỳ để cập nhật.'

export const RevenueRecomputeBadge = ({
  period,
  stale,
  title,
}: {
  period?: { revenue_recompute_needed?: boolean } | null
  /**
   * Per-row answer, when the caller has one. Takes precedence over `period`, which is a
   * PERIOD-wide flag: one department changing an input marks every row in the period, so a
   * screen that can ask each row should.
   */
  stale?: boolean
  title?: string
}) => {
  const isStale = stale ?? Boolean(period?.revenue_recompute_needed)
  if (!isStale) return null
  return (
    <span title={title ?? PERIOD_TITLE}>
      <Chip label="Cần tính lại" variant={ColoredValueVariant.YELLOW} size="small" />
    </span>
  )
}

export default RevenueRecomputeBadge
