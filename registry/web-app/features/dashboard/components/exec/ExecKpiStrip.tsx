import { useMemo, type ReactNode } from 'react'

import { LoadingWrapper } from '@/components'
import { IconBank, IconBuildings, IconChartlineup, IconCoin } from '@/assets/icons'
import DashboardSummaryCard from '@/features/dashboard/components/card/DashboardSummaryCard'
import { useAccountantDashboardSummary } from '@/features/accounting/accountant-dashboard/services/accountant-dashboard-service'
import {
  useAdminDashboardRevenueTrend,
  useAdminDashboardSummary,
} from '@/features/sales/admin-dashboard/services/admin-dashboard-service'
import { formatNumber } from '@/utils/common'
import { formatCompactVND } from '../../constants/exec-dashboard-constants'

/**
 * Dải chỉ số điều hành — BỐN con số, dùng `DashboardSummaryCard` y như mọi dải thẻ khác trong app.
 *
 * Bản trước gom 12 chỉ số vào 4 thẻ nhiều dòng, tự dựng bố cục riêng. Hai cái sai ở đó:
 *
 * 1. 12 con số cùng cỡ, cùng màu, không cái nào nổi hơn cái nào ⇒ không còn là "chỉ số điều hành",
 *    chỉ là một bảng liệt kê. Người mở dashboard ra không biết nhìn đâu trước.
 * 2. Tự vẽ thẻ nên lệch hẳn thẻ chuẩn: mất icon, mất tooltip, nền/bo góc/cỡ số đều khác.
 *
 * Nay cắt còn bốn số CEO thực sự hỏi mỗi sáng — tiền vào, tiền sẽ vào, tiền đang kẹt, và nhịp bán.
 * Phần còn lại KHÔNG mất: nhân sự và tuyển dụng đã có biểu đồ riêng ngay dưới trong preset điều
 * hành, công nợ F2 và đối soát nằm ở bảng kế toán (tab "Kế toán").
 *
 * Thêm số thì thêm một `DashboardSummaryCard` — nhưng cân nhắc: qua 4 thẻ là tràn xuống hàng thứ
 * hai, đẩy biểu đồ khỏi tầm nhìn đầu tiên, đúng thứ vừa sửa xong.
 */
function ExecKpiStrip(): ReactNode {
  const { data: acc, isLoading: l1, isError: e1 } = useAccountantDashboardSummary()
  const { data: sales, isLoading: l2, isError: e2 } = useAdminDashboardSummary()
  const { data: trend, isLoading: l3, isError: e3 } = useAdminDashboardRevenueTrend()

  /** Doanh thu kỳ = điểm CUỐI của chuỗi xu hướng — đúng con số biểu đồ ngay bên dưới đang vẽ. */
  const revenue = useMemo(() => {
    const points = trend?.points ?? []
    return points.length ? Number(points[points.length - 1]?.revenue_amount) || 0 : null
  }, [trend])

  /**
   * Dải này đọc 3 endpoint với 3 quyền khác nhau, nên thiếu đúng một quyền là chuyện BÌNH THƯỜNG —
   * đã gặp thật: vai trò TGD trên staging bị 403 ở `hrm/common/realtime/`.
   *
   * Khi đó tuyệt đối KHÔNG được rơi về 0. "Phải thu (CĐT): 0" đọc y hệt "không còn khoản nào phải
   * thu" — một con số sai đội lốt tin tốt, đặt trước mặt người ra quyết định. Hỏng thì hiện "—",
   * để người xem biết là KHÔNG BIẾT.
   */
  const money = (v: unknown, failed = false) => {
    if (failed) return { value: '—', unit: '' }
    return formatCompactVND(v as string | number | null | undefined)
  }

  const count = (v: number | null | undefined, unit: string, failed = false) =>
    failed ? { value: '—', unit: '' } : { value: formatNumber(v ?? 0), unit }

  const doanhThu = money(revenue, e3 || revenue === null)
  const daThu = money(acc?.total_collected, e1)
  const phaiThu = money(acc?.investor_receivable, e1)
  const daBan = count(sales?.sold_this_month, 'căn', e2)

  return (
    <LoadingWrapper isLoading={l1 || l2 || l3} containerHeight={140}>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <DashboardSummaryCard
          title="Doanh thu kỳ này"
          tooltip="Doanh thu của kỳ gần nhất — đúng con số điểm cuối trên biểu đồ Xu hướng doanh thu bên dưới"
          value={doanhThu.value}
          unit={doanhThu.unit}
          icon={<IconChartlineup size={24} />}
        />
        <DashboardSummaryCard
          title="Đã thu trong tháng"
          tooltip="Tổng tiền thực tế đã thu về trong tháng này"
          value={daThu.value}
          unit={daThu.unit}
          icon={<IconCoin size={24} />}
        />
        <DashboardSummaryCard
          title="Phải thu (CĐT)"
          tooltip="Công nợ chủ đầu tư còn phải thu — tiền đã ghi nhận nhưng chưa về tài khoản"
          value={phaiThu.value}
          unit={phaiThu.unit}
          icon={<IconBank size={24} />}
        />
        <DashboardSummaryCard
          title="Đã bán trong tháng"
          tooltip="Số căn đã bán trong tháng này"
          value={daBan.value}
          unit={daBan.unit}
          icon={<IconBuildings size={24} />}
        />
      </div>
    </LoadingWrapper>
  )
}

export default ExecKpiStrip
