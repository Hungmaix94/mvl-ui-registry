/**
 * Vai quản lý không tìm được người nhận lúc BE tính HHQL.
 *
 * Phần hoa hồng của vai đó KHÔNG sinh phiếu và rơi khỏi kỳ — nên mọi chỗ hiển thị phải nói
 * thẳng, không để dấu gạch ngang (đọc như "chưa nhập tên") hay số tiền trần (mời kế toán cộng
 * vào một khoản không có phiếu nào đứng sau).
 *
 * Cờ này BE đóng băng tại thời điểm tính: gán người phụ trách sau đó KHÔNG xoá được nó, chỉ
 * tính lại kỳ mới xoá.
 */
export const UNRESOLVED_REASON_LABELS: Record<string, string> = {
  missing_dept_leader: 'Phòng chưa có trưởng phòng',
  missing_block_director: 'Khối chưa có giám đốc',
  missing_branch_director: 'Chi nhánh chưa có giám đốc',
  missing_system_config: 'Chưa cấu hình Tổng giám đốc / phòng Thư ký Dự án',
}

/** Nhãn hiển thị cho một mã lý do, kể cả mã BE thêm sau mà FE chưa biết. */
export function unresolvedReasonLabel(reason?: string | null): string {
  return UNRESOLVED_REASON_LABELS[reason ?? ''] ?? 'Chưa rõ nguyên nhân'
}

/**
 * Đọc hai trường `unresolved` / `unresolved_reason` khỏi một `manager_splits[]`.
 *
 * Ép kiểu tại chỗ vì hai trường vừa thêm ở BE và `schema.ts` chỉ sinh lại từ BE đã deploy —
 * AGENTS.md cấm bơm field tự chế vào type sinh sẵn.
 */
export function readUnresolved(split: unknown): { unresolved: boolean; reasonLabel: string } {
  const raw = split as { unresolved?: boolean; unresolved_reason?: string | null } | undefined
  return {
    unresolved: !!raw?.unresolved,
    reasonLabel: unresolvedReasonLabel(raw?.unresolved_reason),
  }
}
