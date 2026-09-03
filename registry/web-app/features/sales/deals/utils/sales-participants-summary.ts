/**
 * Cột "Họ và tên sale tổng hợp" ở màn "Danh sách giao dịch".
 *
 * Cột này THAY CHO cột "Đại lý" cũ (chỉ hiện tên sàn F2). BE trả `sales_participants_summary`
 * — một dòng cho mỗi sale có tên trên hợp đồng cọc, tên đã được BE giải theo thứ tự
 * `employee → collaborator (CTV) → exchange (sàn)`. Nhờ vậy deal F2 vẫn hiện tên sàn kèm tỷ lệ,
 * tức cột mới là tập cha của cột cũ chứ không mất thông tin.
 *
 * Định dạng chốt với PO: `Dương Mạnh Linh 60% - Phan Đức Long 20% - Lương Như Quỳnh 20%`.
 * Cùng dấu phân cách " - " với cột trùng tên trong file export `bc-chi-tiet-bang-hang.xlsx`,
 * nên hai nơi đọc ra một chuỗi giống nhau (chỉ khác: file export chưa kèm tỷ lệ).
 *
 * Tỷ lệ cắt đuôi số 0 (`60.00` → `60%`) — dùng `formatPercent`, KHÔNG tự `toFixed`.
 */

import { formatPercent } from '@/utils/common'

export type DealSaleParticipantSummary = {
  readonly name?: string | null
  readonly participation_percentage?: string | number | null
}

const SEPARATOR = ' - '

/**
 * Ghép danh sách sale + tỷ lệ tham gia thành chuỗi hiển thị của cột.
 * Trả `''` khi không có sale nào có tên — nơi gọi tự quyết định fallback (`-`).
 */
export function formatSalesParticipantsSummary(
  participants: readonly DealSaleParticipantSummary[] | null | undefined
): string {
  if (!participants?.length) return ''

  return participants
    .map((participant) => {
      const name = participant.name?.trim()
      if (!name) return ''
      // Thiếu tỷ lệ thì hiện mỗi tên — "Tên 0%" đọc thành "không tham gia", sai nghĩa.
      const pct = participant.participation_percentage
      if (pct === null || pct === undefined || pct === '') return name
      return `${name} ${formatPercent(pct)}`
    })
    .filter(Boolean)
    .join(SEPARATOR)
}
