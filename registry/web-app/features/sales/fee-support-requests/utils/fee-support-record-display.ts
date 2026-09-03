import type { FeeSupportRequest } from '../services/fee-support-request-service'

/**
 * Nhãn dự án / mã căn của phiếu hỗ trợ phí.
 *
 * BE snapshot `project` / `product_inventory` ngay lúc tạo và trả kèm
 * `project_name` / `unit_number` (+ `*_detail`), nên KHÔNG cần deal để hiển thị.
 * Trước CR STT16 màn chi tiết resolve qua `deal-workspace`; phiếu tạo từ HĐ cọc có
 * `deal = null` ⇒ workspace không chạy ⇒ Dự án / Mã căn rỗng (`—`).
 *
 * Serializer khai báo `project_name` / `unit_number` là `string` (không nullable)
 * nhưng trả CHUỖI RỖNG khi chưa snapshot — vì vậy phải lọc chuỗi trắng thay vì
 * dựa vào `??`.
 */
function firstNonBlank(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return null
}

/** Tên dự án của phiếu; `null` khi BE chưa snapshot (caller tự fallback/`—`). */
export function feeSupportProjectName(
  record: Pick<FeeSupportRequest, 'project_name' | 'project_detail'> | null | undefined
): string | null {
  if (!record) return null
  return firstNonBlank(record.project_name, record.project_detail?.name)
}

/** Mã căn của phiếu; `null` khi BE chưa snapshot (caller tự fallback/`—`). */
export function feeSupportUnitNumber(
  record: Pick<FeeSupportRequest, 'unit_number' | 'product_inventory_detail'> | null | undefined
): string | null {
  if (!record) return null
  return firstNonBlank(record.unit_number, record.product_inventory_detail?.unit_number)
}

/**
 * Nhãn khách nhận chiết khấu và CTV mà khách trở thành (ClickUp 86ey4vjmp).
 *
 * Trước 20/08/2026 màn chi tiết in thẳng id CSDL — `KH #10`, `CTV #132` — vì
 * serializer chỉ trả FK thô. Tệ hơn: `132` cũng KHÔNG phải mã nghiệp vụ, mã thật
 * của CTV đó là `CTV000000131`, nên con số trên màn không tra cứu được ở đâu cả.
 * BE nay trả kèm `customer_detail` / `customer_collaborator_detail`.
 *
 * ⚠️ Hai field này khai `CustomerNested` / `CollaboratorNested` **không nullable**
 * nhưng BE trả `null` khi phiếu không có khách / chưa sinh CTV (cùng bẫy với
 * `project_name` ở trên) — nên phải `?.` chứ đừng tin kiểu.
 */
export function feeSupportCustomerLabel(
  record: Pick<FeeSupportRequest, 'customer_detail'> | null | undefined,
  fallbackName?: string | null
): string | null {
  if (!record) return null
  return firstNonBlank(record.customer_detail?.name, fallbackName, record.customer_detail?.code)
}

/** Nhãn CTV mà khách đã trở thành; `null` khi phiếu không có chiết khấu khách. */
export function feeSupportCustomerCollaboratorLabel(
  record: Pick<FeeSupportRequest, 'customer_collaborator_detail'> | null | undefined
): string | null {
  if (!record) return null
  return firstNonBlank(
    record.customer_collaborator_detail?.name,
    record.customer_collaborator_detail?.code
  )
}
