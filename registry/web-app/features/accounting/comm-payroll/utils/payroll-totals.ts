import { formatCurrencyVND } from '@/utils/common'
import { toSummaryNumber } from '@/utils/table/summary'

/**
 * Định dạng một ô của dòng TỔNG CỘNG bảng payroll (20.14 "HHQL bảng Tổng") cho khớp ô dữ
 * liệu ở trên (`"1.234.567 đ"`).
 *
 * Không dùng thẳng `formatSummaryCurrency` vì bảng này gắn hậu tố `đ` vào từng ô; nối thêm
 * chuỗi vào kết quả của nó sẽ ra `"— đ"` khi không có số nào để cộng.
 *
 * Số truyền vào phải lấy từ khối `summary` của `GET /api/accounting/comm-payroll/{role}/`
 * — tổng trên TOÀN kỳ đã lọc. Endpoint này phân trang thật, nên cộng `results` ở FE chỉ ra
 * tổng của trang đang xem; xem cảnh báo đầu `@/utils/table/summary`.
 */
export function formatPayrollTotal(value: unknown): string {
  const amount = toSummaryNumber(value)
  return amount === null ? '—' : `${formatCurrencyVND(amount)} đ`
}
