/**
 * Đọc khối `summary` cho các thẻ tổng hợp ở đầu màn "Danh sách giao dịch".
 *
 * TRƯỚC ĐÂY file này cộng tay các dòng của TRANG đang xem, nên thẻ tiền và thẻ "Tổng giao dịch"
 * (lấy `count` của cả tập kết quả) nói hai chuyện khác nhau. BE đã chốt trả `summary` tính trên
 * toàn bộ queryset sau filter (PR #2852), nên phần cộng tay bị bỏ hẳn — giữ lại thì hai nguồn số
 * sẽ trôi khỏi nhau.
 *
 * PHÂN BIỆT BỐN KHOÁ TIỀN — rất dễ lẫn, đã từng lẫn thật:
 *   total_sales_fee   -> "Tổng tiền trả sale" (hoa hồng chia cho sale nội bộ)
 *   agency_fee_amount -> "Tổng phí đại lý"    (cột "Thành tiền phí" trong bảng)
 *   revenue_amount    -> "Tổng doanh thu"
 *   total_amount      -> "Tổng phí & thưởng"  (= phí đại lý + thưởng chia + phí tăng thêm)
 *
 * Thẻ "Tổng tiền trả sale" từng cộng nhầm `total_amount`. Nó không lộ ra vì `total_amount` bằng
 * đúng `agency_fee_amount` với mọi deal không có thưởng, nên hai thẻ trông giống hệt nhau và bị
 * tưởng là trùng lặp vô hại. Thực tế lệch 6,7 lần.
 *
 * ĐẾM: `deal_count` đã loại deal `cancelled` / `abandoned`, còn `count` của paginator thì không.
 * Bất biến BE cam kết: `deal_count + excluded_deal_count === count`. Thẻ đếm phải đọc
 * `deal_count` để khớp phạm vi với các thẻ tiền, và phải nói ra phần bị loại — nếu không, người
 * dùng thấy thẻ nhỏ hơn số dòng trong bảng mà không có gì giải thích.
 */

import type { DealListSummary } from '../services/deal-service'

export type DealListTotals = {
  readonly dealCount: number
  readonly excludedDealCount: number
  readonly salesFeeAmount: number
  readonly agencyFeeAmount: number
  readonly revenueAmount: number
  readonly totalAmount: number
}

/**
 * Chuỗi decimal của API -> number. BE trả `total_sales_fee` với 8 chữ số thập phân
 * ("1003809524.00000000") để giữ parity với cột trên bảng, nên PHẢI parse ra số rồi mới format —
 * đừng bao giờ so sánh hay cắt chuỗi. Thang tiền VND nằm gọn trong float64.
 */
function toAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Trả `null` khi response chưa có `summary`. Cố tình KHÔNG fallback về 0 hay cộng tay các dòng:
 * cả hai đều hiện ra một con số trông có vẻ đúng trong khi thực chất là bịa. Chỗ gọi hiển thị
 * dấu gạch để người dùng biết là chưa có số, chứ không phải số bằng không.
 */
export function readDealListSummary(summary: DealListSummary | undefined): DealListTotals | null {
  if (!summary) return null

  return {
    dealCount: summary.deal_count,
    excludedDealCount: summary.excluded_deal_count,
    salesFeeAmount: toAmount(summary.total_sales_fee),
    agencyFeeAmount: toAmount(summary.agency_fee_amount),
    revenueAmount: toAmount(summary.revenue_amount),
    totalAmount: toAmount(summary.total_amount),
  }
}
