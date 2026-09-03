import { WORKSHEET_STATUS } from '@/features/accounting/commission-splits/components/WorksheetStatusChip'

/**
 * Hai bộ lọc duyệt của màn "Giao dịch tiền về đợt này" / "Chia HH theo tháng" (CR STT20
 * `86eydc3ec`).
 *
 * Chốt trên ticket: đây là **2 điều kiện lọc rời** — một lọc theo trạng thái duyệt của Thư
 * ký (`worksheet_status`), một lọc theo "Duyệt lệch tiền về" của Kế toán (`dial_deviates`).
 * Không gộp thành 1 dropdown, và KHÔNG thêm trạng thái mới vào máy trạng thái worksheet.
 *
 * 3 nhóm mà CR hỏi được diễn đạt bằng cách ghép 2 ô:
 * - "TK đã duyệt nhưng KT chưa duyệt"      → worksheet_status=ADMIN_APPROVED
 * - "KT duyệt luôn theo thông tin Thư ký"  → worksheet_status=APPROVED + dial_deviates=false
 * - "KT duyệt nhưng có sửa %"              → worksheet_status=APPROVED + dial_deviates=true
 *
 * Lưu ý nghiệp vụ khi đọc kết quả: `dial_deviates=false` đứng một mình gộp cả bảng kê
 * "chưa ghim dial" và legacy trước BE PR #2812, nên muốn đúng nghĩa "KT duyệt luôn theo
 * Thư ký" thì phải chọn kèm trạng thái "KT đã duyệt thực nhận". Staging có ca thật:
 * TCK000000157 lệch dial nhưng vẫn đang ở ADMIN_APPROVED.
 */

/** Nhãn khớp đúng chip cột "Duyệt lệch tiền về" trên list để popup và bảng không lệch chữ. */
export const DIAL_DEVIATES_OPTIONS = [
  { value: 'true', label: 'Duyệt lệch' },
  { value: 'false', label: 'Không lệch' },
]

const VALID_WORKSHEET_STATUSES: string[] = Object.values(WORKSHEET_STATUS)
const VALID_DIAL_DEVIATES: string[] = DIAL_DEVIATES_OPTIONS.map((o) => o.value)

/**
 * Loại giá trị lạ đọc từ URL (deep-link cũ, gõ tay) về `null`.
 *
 * Giữ bất biến: **những gì API lọc = những gì popup đang hiện = số bộ lọc đang đếm**.
 * Không có nó, `worksheet_status=XYZ` sẽ lọc ngầm danh sách trong khi popup hiện "Tất cả
 * trạng thái" — bộ lọc vô hình, user không thấy để mà xoá.
 */
export function sanitizeWorksheetStatus(value?: string | null): string | null {
  return value && VALID_WORKSHEET_STATUSES.includes(value) ? value : null
}

/** Cùng lý do với `sanitizeWorksheetStatus`, cho ô "Duyệt lệch tiền về". */
export function sanitizeDialDeviates(value?: string | null): string | null {
  return value && VALID_DIAL_DEVIATES.includes(value) ? value : null
}
