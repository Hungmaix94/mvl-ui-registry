/**
 * Dòng nào `set-period-progress` LOẠI KHỎI lượt tính lại — tiền của dòng đó bị giữ nguyên.
 *
 * Trước ClickUp 86eyjxwd3, hệ thống chỉ chừa dòng đã CHI tiền (PAID); dòng đã duyệt "Chia
 * hoa hồng thực nhận" (PBTV APPROVED) nhưng CHƯA chi vẫn bị tính lại và ghi đè âm thầm. Quyết
 * định: không chặn cả lượt lưu, chỉ loại các dòng này ra và báo cho kế toán biết vì sao.
 *
 * Đọc qua `unknown` như `readDialSideEffects` — payload BE cũ (chưa có field) trả về rỗng,
 * không cần chờ field xuất hiện trong schema generated.
 */

export type DialSkippedRals = {
  /** Số dòng đã CHI tiền (PAID) — giữ nguyên vì tiền đã ra khỏi hệ thống. */
  paidCount: number
  /** Số dòng đã duyệt "Chia hoa hồng thực nhận" nhưng CHƯA chi — giữ nguyên vì đã chốt. */
  approvedNotPaidCount: number
}

const readIdArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

/** Đọc `skipped_paid_ral_ids` / `skipped_approved_not_paid_ral_ids` khỏi response của set-period-progress. */
export function readDialSkippedRals(response: unknown): DialSkippedRals {
  const r = response as
    | { skipped_paid_ral_ids?: unknown; skipped_approved_not_paid_ral_ids?: unknown }
    | null
    | undefined
  return {
    paidCount: readIdArray(r?.skipped_paid_ral_ids).length,
    approvedNotPaidCount: readIdArray(r?.skipped_approved_not_paid_ral_ids).length,
  }
}
