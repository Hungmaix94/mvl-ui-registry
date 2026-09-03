import { UseFormSetValue } from 'react-hook-form'

type SetValue = UseFormSetValue<any>

/**
 * Các field phụ thuộc Chủ đầu tư ở form HĐ đặt chỗ, theo đúng thứ tự cha → con:
 * Dự án lọc theo CĐT, Mã BĐS lọc theo Dự án, Thông tin bán hàng cũng lọc theo Dự án.
 */
const DEPENDENT_FIELDS = ['project_id', 'product_inventory_id', 'sales_allocation'] as const

/**
 * Có phải đổi sang một Chủ đầu tư KHÁC không (gồm cả trường hợp xoá trắng).
 *
 * So bằng `Number` vì Select có thể trả `'81'` (chuỗi) trong khi form đang giữ `81` (số) —
 * so bằng `!==` trần sẽ coi là "đã đổi" và xoá oan lựa chọn của user.
 */
export function isInvestorChanged(prev: unknown, next: unknown): boolean {
  if (prev == null && next == null) return false
  if (prev == null || next == null) return true
  return Number(prev) !== Number(next)
}

/**
 * Đổi Chủ đầu tư ⇒ bỏ mọi lựa chọn phụ thuộc CĐT cũ (ClickUp 86eyqrk7h).
 *
 * Trước đây form chỉ dọn khi **xoá trắng** CĐT (`if (!val)`), không dọn khi **đổi sang CĐT khác**.
 * Hậu quả: chọn CĐT A → chọn Dự án của A → đổi sang CĐT B thì ô Dự án vẫn giữ dự án của A, và
 * dự án đó còn nằm lẫn trong danh sách xổ xuống của B (nó là giá trị đang chọn nên Select vẫn
 * phải render). Người dùng nhìn thấy "danh sách Dự án hiển thị dữ liệu của CĐT cũ" — đúng ảnh QA:
 * CĐT `Vinaconex8` mà Dự án lại là `Legacy Hòa Lạc` của `An Thịnh Group`.
 *
 * Đây chính là luật chung ở AGENTS.md: đổi/clear thực thể cha thì reset lựa chọn con.
 *
 * ⚠️ Chỉ gọi từ `onChange` của ô Chủ đầu tư (thao tác THẬT của người dùng). Các luồng autofill
 * ngược (chọn Dự án hoặc Mã BĐS rồi tự điền ngược CĐT) ghi bằng `setValue` nên không chạm hàm này
 * — nếu gọi cả ở đó thì chúng sẽ tự xoá đúng thứ vừa điền.
 */
export function clearInvestorDependents(setValue: SetValue): void {
  for (const field of DEPENDENT_FIELDS) {
    setValue(field, null, { shouldValidate: false })
  }
}
