// Logic thuần của nút "Duyệt tất cả" trên màn Chi tiết Pool HH (CR 86eyqgr5h).
//
// Tách khỏi trang vì đây là phần duy nhất có quyết định thật: nút hiện hay không, và
// khi BE trả về dòng bị bỏ qua thì hiện tên ai. Phần còn lại ở trang chỉ là dialog + toast.
import type { components } from '@/api/schema'
import { PayoutSplitLineStatus } from '@/constants/api-schema-aliases'

type PoolLine = components['schemas']['DepartmentCommissionPoolLine']
type ConfirmLinesResult = components['schemas']['DeptPoolConfirmLinesResult']

/** Một dòng bị bỏ qua, đã ghép lại danh tính nhân sự để hiện cho kế toán đọc. */
export type SkippedLineRow = {
  lineId: number
  employeeCode: string
  employeeName: string
  reason: string
}

/**
 * Các dòng nút "Duyệt tất cả" sẽ đụng tới — đúng bằng phạm vi BE nhận (chỉ `DRAFT`).
 *
 * Dùng cho cả việc quyết định có hiện nút hay không lẫn con số in trong dialog xác nhận,
 * nên hai chỗ đó không thể lệch nhau: hiện nút "Duyệt 5 dòng" rồi chỉ duyệt 3 là lỗi khó thấy.
 */
export function selectDraftLines(lines: readonly PoolLine[]): PoolLine[] {
  return lines.filter((line) => line.status === PayoutSplitLineStatus.DRAFT)
}

/**
 * Ghép `{line_id, reason}` của BE về lại dòng đang hiển thị để lấy mã + tên nhân sự.
 *
 * BE cố ý chỉ trả id: bảng trên màn đã có sẵn `lines[]`, nên ghép ở đây tránh việc BE gửi
 * bản sao thứ hai của tên nhân sự có thể cũ hơn thứ người dùng đang nhìn. Dòng không tra
 * được (bảng đã refetch và dòng biến mất) vẫn phải hiện ra — nuốt nó đi là báo cáo thiếu
 * một dòng chưa được duyệt.
 */
export function buildSkippedRows(
  result: ConfirmLinesResult,
  lines: readonly PoolLine[]
): SkippedLineRow[] {
  const byId = new Map(lines.map((line) => [line.id, line]))
  return (result.skipped ?? []).map((row) => {
    const line = byId.get(row.line_id)
    return {
      lineId: row.line_id,
      employeeCode: line?.employee_code ?? '',
      employeeName: line?.employee_name || `Dòng #${row.line_id}`,
      reason: row.reason,
    }
  })
}
