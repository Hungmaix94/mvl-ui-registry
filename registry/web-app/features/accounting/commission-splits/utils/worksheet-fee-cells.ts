import { components } from '@/api/schema'
import { DealRevenueMode } from '@/constants/api-schema-aliases'
import { MONTH_FORMAT } from '@/constants/date-format'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND, formatPct } from '@/utils/common'

/**
 * Ba ô của CR STT51 (`86eymm0hq`), dùng chung cho CẢ HAI bảng worksheet
 * (`CommissionSplitTable` — "Chia HH theo tháng" — và `DealPeriodAllocationWorksheetTable` —
 * "Giao dịch tiền về đợt này"). CR STT17 đã chốt hai màn dùng CÙNG một bộ cột, nên vá song song
 * hai chỗ là cách chắc chắn nhất để chúng lệch nhau sau vài lần sửa: đúng chuyện đã xảy ra ở
 * `86eymkje9`, nơi màn Danh sách được sửa nhãn còn màn Chi tiết giữ nguyên lỗi thêm một ngày.
 *
 * Backend cũng in đúng ba ô này ra file Excel (`apps/accounting/api/exports/commission_allocation.py`
 * — `_agency_fee_cell` / `_revenue_cell` / `_invoice_month_cell`). Sửa luật ở đây thì sửa cả bên đó,
 * nếu không file xuất ra sẽ khác màn hình mà không ai báo.
 */

const EM_DASH = '—'

type WorksheetRow = components['schemas']['DealPeriodWorksheetListRow']

/** Chỉ cần đúng phần các ô này đọc — để test dựng được dữ liệu mà không phải bịa cả 58 trường. */
export type FeeCellSource = Pick<
  WorksheetRow,
  'fee_pct' | 'fee_fixed_amt' | 'revenue_mode' | 'pct_revenue' | 'revenue_amount' | 'invoice_date'
>

/**
 * Cột "Phí đại lý" — in SỐ TIỀN khi SA cấu hình phí theo số tiền, ngược lại in TỶ LỆ.
 *
 * BA chốt 21/08: *"Phí đại lý đôi khi là %, đôi khi là số tiền, tuỳ theo người dùng thiết lập ở SA,
 * hãy hiển thị hết"* — nên một cột mang hai đơn vị, và tiêu đề cột cố ý KHÔNG có hậu tố "(%)".
 *
 * ⚠️ Rẽ nhánh theo TRUTHINESS, tuyệt đối không theo `!== null`. Luật nghiệp vụ nằm ở
 * `Deal.get_agency_fee_amount` phía backend: vế không dùng tới được *"materialised as Decimal('0')"*
 * và số 0 **phải** rơi về tỷ lệ. Kiểm `!== null` thì mọi deal cấu hình theo tỷ lệ mà vế tiền đã bị
 * ghi thành 0 sẽ hiện "0 ₫" thay vì tỷ lệ của nó.
 *
 * ⚠️ Và đừng đọc `fee_amount` để quyết định: nó là tiền đã giải, CỘNG phần tỷ lệ với phần cố định,
 * nên khác 0 ở cả hai chế độ và không phân biệt được gì.
 */
export function formatAgencyFee(row: FeeCellSource): string {
  const fixed = Number(row.fee_fixed_amt ?? 0)
  if (fixed) return formatCurrencyVND(fixed)
  // `fee_pct` là `Deal.pct_agency_fee` — BE đã nới lên numeric(14,10), trần 2 chữ số thập phân
  // sẽ cắt mất phần thập phân thật của tỷ lệ.
  return formatPct(row.fee_pct, 10)
}

/**
 * Cột "Phí doanh thu" — tỷ lệ với deal khai theo phần trăm, số tiền với deal khai cố định.
 *
 * BA chốt 21/08 (Q6 + Q7): cột này là *"Tỷ lệ tính doanh thu (%)"* lấy từ giao dịch, và
 * *"nếu là số tiền hiện số tiền, nếu là phần trăm hiện phần trăm"*.
 *
 * ⚠️ Rẽ theo `revenue_mode`, KHÔNG theo `pct_revenue == null`: một deal PERCENTAGE chưa kịp
 * snapshot tỷ lệ cũng cho `pct_revenue = null`, rẽ theo null sẽ in một con số VNĐ vào ô mà kế toán
 * đang dóng hàng với các ô phần trăm khác.
 */
export function formatRevenueFee(row: FeeCellSource): string {
  if (row.revenue_mode === DealRevenueMode.fixed) {
    return formatCurrencyVND(Number(row.revenue_amount ?? 0))
  }
  // `formatPct` tự trả '—' khi null, nên deal PERCENTAGE chưa snapshot tỷ lệ ra ô gạch ngang —
  // đúng thứ cần: "chưa biết", không phải một con số bịa.
  // `pct_revenue` là numeric(14,10) — giữ đủ 10 chữ số thập phân, đừng cắt còn 2.
  return formatPct(row.pct_revenue, 10)
}

/**
 * Cột "Tháng xuất hoá đơn" — `MM/yyyy` của hoá đơn đang hiện ở cột "Số hoá đơn".
 *
 * BA chốt 21/08 (Q8): lấy theo **hoá đơn đại diện**, không quét mọi hoá đơn của dòng. Backend phát
 * `invoice_date` ra từ đúng object đã nuôi `invoice_no`, nên hai ô không thể lệch nhau — đừng suy
 * tháng từ `period_year`/`period_month` (đó là **kỳ phân bổ**, một đại lượng khác).
 */
export function formatInvoiceMonth(row: FeeCellSource): string {
  return row.invoice_date ? formatDate(row.invoice_date, MONTH_FORMAT) : EM_DASH
}
