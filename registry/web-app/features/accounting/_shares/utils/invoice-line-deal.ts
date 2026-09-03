/**
 * Nhãn cho ô "Giao dịch / Deal" ở bảng dòng của hai màn Chi tiết hoá đơn (bán ra + đầu vào).
 *
 * Trước CR này hai màn in `#<id>` — con số khoá nội bộ, không tra cứu được ở bất kỳ đâu khác.
 * Chỏi nhất là bảng "Chứng từ liên kết MVL" nằm ngay dưới trên CÙNG màn thì in mã tử tế
 * (`HDOUT000001474`): một màn, hai bảng, một bên mã một bên id.
 *
 * `deal_code` do BE bổ sung (PR #3410) trên chính serializer dòng, đi cùng đường `deal.*` mà
 * `unit_number` / `project_name` đã dùng nên không tốn thêm query nào.
 *
 * Vì sao vẫn giữ nhánh `#<id>`: `deal` cho phép null và BE có thể chưa trả mã (bản deploy cũ,
 * hoặc deal bị xoá mã). Trả về chuỗi rỗng ở những ca đó sẽ làm ô trống trơn — người dùng mất luôn
 * cả cái link. `#<id>` xấu nhưng bấm được và truy được, nên nó là mức lùi đúng.
 */
export function dealLabel(line: {
  deal?: number | null
  deal_code?: string | null
}): string | null {
  // Chuỗi rỗng cũng phải rơi xuống nhánh id: BE trả `""` thì `deal_code` vẫn "có" theo nghĩa
  // `in`, nhưng in ra là một ô trống — đúng thứ nhánh dưới sinh ra để tránh.
  if (line.deal_code) return line.deal_code
  return line.deal ? `#${line.deal}` : null
}
