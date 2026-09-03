import type { ColumnConfig } from '@/types/table'

/**
 * Gộp cấu hình cột người dùng đã lưu với defaults hiện tại của bảng.
 *
 * Hai thứ lấy từ hai nguồn khác nhau, cố ý:
 * - **`visible` + thứ tự tương đối** là quyết định của người dùng → lấy từ `stored`.
 * - **`label` (và mọi field khác)** là của code → luôn lấy từ `defaults`. Trước đây hàm này trả
 *   thẳng `storedCol`, nên đổi tên một cột xong người đã lưu config vẫn thấy **nhãn cũ** trong
 *   dialog cấu hình cột — bản lưu biến thành kho nhãn chết.
 *
 * Cột MỚI (chưa có trong `stored`) được chèn **ngay sau hàng xóm phía trước của nó trong
 * `defaults`**, không phải gán `order = chỉ số mảng`. Cách cũ khiến cột mới mang order trùng với
 * order cũ của các cột đuôi bảng rồi **đan xen** vào giữa chúng: CR STT17 thêm 7 cột vào giữa
 * bảng worksheet, người dùng đã lưu config thấy
 * `sales_fee_pct | invoice_no | fee_progress_pct | receipt_no | …`.
 *
 * Hàm thuần, KHÔNG phụ thuộc React — để riêng khỏi `useColumnConfig` vì import cái hook đó trong
 * test kéo theo cả cây `@/store` → `@/routes` → barrel `@/components/ui` và vỡ vì import vòng.
 */
export function mergeColumns(defaults: ColumnConfig[], stored: ColumnConfig[]): ColumnConfig[] {
  const storedById = new Map(stored.map((c) => [c.id, c]))
  const defaultIndexById = new Map(defaults.map((c, index) => [c.id, index]))

  // Thứ tự người dùng đã sắp — bỏ id không còn tồn tại trong defaults.
  const sequence = stored
    .filter((c) => defaultIndexById.has(c.id))
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((c) => c.id)

  // Duyệt defaults theo thứ tự nên nhiều cột mới liền nhau vẫn giữ đúng thứ tự của chúng.
  defaults.forEach((defaultCol, index) => {
    if (storedById.has(defaultCol.id)) return

    let anchor = -1
    for (let i = index - 1; i >= 0; i--) {
      const position = sequence.indexOf(defaults[i].id)
      if (position !== -1) {
        anchor = position
        break
      }
    }
    sequence.splice(anchor + 1, 0, defaultCol.id)
  })

  return sequence.map((id, order) => {
    const defaultCol = defaults[defaultIndexById.get(id) as number]
    const storedCol = storedById.get(id)
    return {
      ...defaultCol,
      visible: storedCol ? storedCol.visible : defaultCol.visible,
      order,
    }
  })
}
