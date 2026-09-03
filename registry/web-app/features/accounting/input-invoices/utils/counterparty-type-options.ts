export type CounterpartyTypeOption = {
  value: string
  label: string
}

/**
 * Dựng ô "Đối tượng" của form hóa đơn đầu vào — value LẪN nhãn đều từ backend.
 *
 * Trước đây form giữ một mảng 4 loại tự chế, nên nó chào cả những loại mà API không nhận:
 * kế toán chọn "Cộng tác viên" rồi mới ăn 400 (ClickUp 86eyr4wt3). Giờ hai danh sách đều đến
 * từ `/api/constants/` và frontend không tự đặt ra giá trị nào:
 *
 * - `allOptions` ← `InputInvoice_COUNTERPARTY_TYPE_CHOICES` (đủ loại, kèm nhãn của BE)
 * - `allowedValues` ← `INPUT_INVOICE_MANUAL_COUNTERPARTY_TYPES` (tập được nhập tay)
 *
 * Constants chưa nạp xong thì trả mảng rỗng — ô đang tải, không bịa danh sách thay BE.
 *
 * @param allowedValues Giá trị thô đọc từ constants — cố ý nhận `unknown` vì nó đến từ API.
 */
export function buildCounterpartyTypeOptions({
  isEditMode,
  allOptions,
  allowedValues,
  currentValue,
}: {
  isEditMode: boolean
  allOptions: CounterpartyTypeOption[]
  allowedValues: unknown
  currentValue?: string | null
}): CounterpartyTypeOption[] {
  // Màn Sửa giữ đủ loại: hóa đơn cũ mang loại mà lượt tạo tay từ chối (đo dev 26/08: 210/213
  // bản ghi), lọc đi là ô "Đối tượng" hiện rỗng khi mở chúng lên.
  if (isEditMode) return allOptions

  if (!Array.isArray(allowedValues)) return []

  // Giữ loại ĐANG chọn kể cả khi nó ngoài danh sách: màn HH F2 tháng điều hướng sang form này
  // kèm sẵn `counterparty_type: 'EXCHANGE'` (nút "Nhận HĐ" / "Nhận thêm HĐ"), lọc thẳng tay
  // thì ô hiện rỗng và người dùng không hiểu chuyện gì vừa xảy ra. Giá trị vẫn của BE.
  return allOptions.filter(
    (option) => allowedValues.includes(option.value) || option.value === currentValue
  )
}
