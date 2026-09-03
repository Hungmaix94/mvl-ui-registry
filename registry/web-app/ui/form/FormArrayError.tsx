type FormArrayErrorProps = {
  errors?: unknown
  fallbackMessage?: string
  className?: string
}

/**
 * Gom mọi message thật nằm bên trong lỗi của MỘT dòng.
 *
 * react-hook-form lồng lỗi theo đúng hình dạng của giá trị, nên lỗi một dòng có thể là
 * `{ exchange: { message } }`, `{ f2_source: { message } }`, hay sâu hơn nữa. Đi đệ quy
 * để không phải liệt kê tay từng tên field — danh sách đó chắc chắn sẽ lạc hậu.
 */
const collectMessages = (node: unknown, out: string[], depth = 0, seen = new WeakSet()): void => {
  if (!node || typeof node !== 'object' || depth > 6) return

  // Node DOM là ngõ cụt PHẢI chặn. Lỗi của react-hook-form mang theo `ref` trỏ tới ô
  // input thật; React gắn `__reactFiber$…` lên chính node đó, và cây fiber có tham chiếu
  // vòng. Đi tiếp vào đấy là tràn stack, treo hẳn form.
  if ((node as { nodeType?: number }).nodeType !== undefined) return
  if (seen.has(node as object)) return
  seen.add(node as object)

  const rec = node as Record<string, unknown>
  if (typeof rec.message === 'string' && rec.message.trim()) {
    out.push(rec.message.trim())
    return
  }

  for (const [key, value] of Object.entries(rec)) {
    if (key === 'ref') continue
    collectMessages(value, out, depth + 1, seen)
  }
}

/**
 * Hiện lỗi cấp mảng của một field array (vd `sales_staff`).
 *
 * Trước đây component này nuốt mọi message cụ thể: hễ lỗi là một mảng (tức lỗi nằm ở
 * từng dòng) mà không có message ở gốc thì nó in đúng một câu chung chung, dù message
 * thật của BE đang nằm ngay bên trong. Người dùng bị chặn lưu mà không biết vì sao —
 * bug 86eyez5z6: BE nói rõ "sàn F2 chưa có tỷ lệ hoa hồng trên TBC hiệu lực ngày…",
 * màn hình chỉ nói "Vui lòng kiểm tra lại thông tin nhân sự".
 *
 * Giờ câu chung chung chỉ còn là phương án cuối, khi thật sự không moi được message nào.
 */
export const FormArrayError = ({
  errors,
  fallbackMessage = 'Vui lòng kiểm tra lại thông tin nhân sự',
  className = 'text-xs text-data-red-default mt-2',
}: FormArrayErrorProps) => {
  if (!errors) return null

  const arrayErr = errors as Record<string, any>

  // Lỗi gắn ở gốc mảng (vd "Tổng tỷ lệ doanh thu phải bằng 100%") — ưu tiên tuyệt đối.
  const rootMessage =
    arrayErr?.root?.message ||
    (typeof arrayErr?.message === 'string' && arrayErr.message.trim() ? arrayErr.message : null)
  if (rootMessage) return <p className={className}>{rootMessage}</p>

  if (!Array.isArray(arrayErr)) return null

  // Lỗi theo từng dòng: nêu đúng dòng nào hỏng và hỏng vì sao.
  const perRow: { row: number; message: string }[] = []
  arrayErr.forEach((rowErr, index) => {
    const messages: string[] = []
    collectMessages(rowErr, messages)
    for (const message of new Set(messages)) perRow.push({ row: index + 1, message })
  })

  if (perRow.length === 0) return <p className={className}>{fallbackMessage}</p>

  // Một dòng thì nói thẳng, khỏi đánh số cho rườm rà.
  if (perRow.length === 1 && arrayErr.length <= 1) {
    return <p className={className}>{perRow[0].message}</p>
  }

  return (
    <ul className={className}>
      {perRow.map(({ row, message }) => (
        <li key={`${row}-${message}`}>{`Dòng ${row}: ${message}`}</li>
      ))}
    </ul>
  )
}
