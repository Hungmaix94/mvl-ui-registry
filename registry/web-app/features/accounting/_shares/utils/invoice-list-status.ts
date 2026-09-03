import { InputInvoiceStatus, SalesInvoiceStatus } from '@/constants/api-schema-aliases'

/**
 * Trạng thái mặc định của hai màn Danh sách hoá đơn (CR STT58, ClickUp `86eyqrn7k`).
 *
 * Nghiệp vụ: màn danh sách **mặc định không hiển thị hoá đơn đã huỷ**; muốn xem thì chọn
 * trạng thái đó trong bộ lọc. Cùng luật đã chốt cho danh sách phiếu đối chiếu F2/CTV
 * (SRS `sales/18.5-reconciliation/fsd.md` §4.4 — *"mặc định ẩn sheet VOIDED; vẫn tra được
 * bằng `?status=voided`"*), chỉ khác chỗ thực thi: ở đây lọc từ FE qua `status__in` chứ
 * không `.exclude()` ở BE, vì cùng endpoint còn phục vụ dropdown/wizard phiếu chi — ẩn ở
 * BE là đổi hành vi của cả những chỗ đó, ngoài phạm vi CR.
 *
 * Danh sách "mặc định" được **suy ra từ enum**, không liệt kê tay: BE thêm một trạng thái
 * mới mà FE liệt kê thiếu thì dòng mang trạng thái đó **biến mất im lặng** khỏi màn hình —
 * không lỗi, không cảnh báo. Guard trong `invoice-list-status.test.ts` chặn đúng ca đó.
 */
// Đóng băng: các hằng dưới đây là module-level và được truyền THẲNG vào query params của cả
// list, `/summary/` lẫn `/export/`. Một lần `sort()`/`push()` vô ý ở bất kỳ đâu là đổi bộ lọc
// của mọi màn cùng lúc, mà lỗi đó không nổ ở chỗ gây ra.
function visibleStatuses<T extends string>(all: T[], hidden: readonly string[]): readonly T[] {
  return Object.freeze(all.filter((status) => !hidden.includes(status)))
}

/**
 * Hoá đơn đầu vào: chỉ có `VOIDED` ("Đã huỷ"). Enum **không có** `CANCELLED` — đừng thêm
 * theo trí nhớ từ màn bán ra.
 */
export const INPUT_INVOICE_CANCELLED_STATUSES: readonly string[] = Object.freeze([
  InputInvoiceStatus.VOIDED,
])

export const INPUT_INVOICE_DEFAULT_STATUSES = visibleStatuses(
  Object.values(InputInvoiceStatus),
  INPUT_INVOICE_CANCELLED_STATUSES
)

/**
 * Hoá đơn bán ra: `CANCELLED` ("Đã hủy") **và** `VOIDED` ("Đã hủy (cũ)"). Hai giá trị, cùng
 * một nghĩa với người dùng, nên cùng bị ẩn.
 */
export const SALES_INVOICE_CANCELLED_STATUSES: readonly string[] = Object.freeze([
  SalesInvoiceStatus.CANCELLED,
  SalesInvoiceStatus.VOIDED,
])

export const SALES_INVOICE_DEFAULT_STATUSES = visibleStatuses(
  Object.values(SalesInvoiceStatus),
  SALES_INVOICE_CANCELLED_STATUSES
)
