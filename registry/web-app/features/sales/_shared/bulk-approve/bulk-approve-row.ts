// Hai mảnh mà cả ba màn "Duyệt nhiều" (CR STT35) đều cần: suy bàn duyệt từ trạng thái, và mô
// tả một bản ghi thành một dòng chữ nhận diện được trong dialog xác nhận.
import { BULK_APPROVE_STEP, type BulkApproveStep } from './bulk-approve-model'

/**
 * Tạo hàm suy bàn duyệt từ trạng thái của bản ghi.
 *
 * Mỗi màn tự truyền vào ba giá trị trạng thái của chính nó (HĐ cọc và HĐ đặt chỗ khoá theo
 * `approval_status`, hoàn tiền khoá theo `status`) thay vì dùng chung một bảng chuỗi: ba thang
 * duyệt là ba miền khác nhau, và chỉ ba trạng thái này được BE nhận.
 *
 * Trạng thái nào không có trong bảng ⇒ `null` ⇒ dòng đó không tích được. Nhờ vậy các bàn mà BE
 * cố ý loại (bàn xác nhận của sale, bàn thủ quỹ chi tiền) tự động nằm ngoài, không cần liệt kê.
 */
export function createStepResolver<TStatus extends string>(statuses: {
  pendingAdmin: TStatus
  pendingAdminLead: TStatus
  pendingAccountant: TStatus
}) {
  const byStatus = new Map<string, BulkApproveStep>([
    [statuses.pendingAdmin, BULK_APPROVE_STEP.ADMIN],
    [statuses.pendingAdminLead, BULK_APPROVE_STEP.ADMIN_LEAD],
    [statuses.pendingAccountant, BULK_APPROVE_STEP.ACCOUNTANT],
  ])

  return (status: string | null | undefined): BulkApproveStep | null =>
    (status && byStatus.get(status)) || null
}

/** Hình dạng chung của ba serializer danh sách, ở phần cần để nhận diện bản ghi. */
type SalesRowLike = {
  code?: string | null
  customer_detail?: { name?: string | null } | null
  potential_customer_detail?: { full_name?: string | null } | null
  cust_full_name?: string | null
  cust_business_name?: string | null
  product_inventory_detail?: { unit_number?: string | null; code?: string | null } | null
}

/**
 * Tên khách hiển thị: **bản ghi khách liên kết trước, snapshot sau**.
 *
 * `customer_detail` là bản ghi Customer thật; `cust_full_name`/`cust_business_name` là ảnh chụp
 * lưu trên chính hợp đồng, tồn tại cho bản ghi tạo từ mobile mà không gắn Customer nào. Nên khi
 * có cả hai, bản ghi liên kết mới là nguồn chuẩn.
 *
 * ⚠️ Ba cột "Khách hàng" trên ba bảng KHÔNG cùng thứ tự: HĐ cọc và Hoàn tiền ưu tiên
 * `customer_detail` (khớp hàm này), còn HĐ đặt chỗ lại ưu tiên snapshot. Với HĐ đặt chỗ có cả
 * hai giá trị và chúng khác nhau, dialog xác nhận sẽ hiện tên khác cột trên bảng — đây là chỗ
 * lệch có sẵn của `BookingContractTable`, đừng "sửa" hàm này theo nó mà hãy thống nhất bảng đó.
 */
export function salesRowCustomerName(row: SalesRowLike): string {
  return (
    row.customer_detail?.name ||
    row.potential_customer_detail?.full_name ||
    row.cust_full_name ||
    row.cust_business_name ||
    ''
  ).trim()
}

/**
 * Dòng phụ nhận diện bản ghi trong dialog xác nhận: `Nguyễn Văn A · A-12.05`.
 *
 * `extras` để mỗi màn thêm thứ đặc thù của nó (vd số tiền hoàn) — mảnh rỗng bị bỏ, nên không
 * bao giờ hiện ra dấu `·` lửng.
 */
export function describeSalesRow(
  row: SalesRowLike,
  extras: readonly (string | null | undefined)[] = []
): { code: string; subject: string } {
  const unit = row.product_inventory_detail?.unit_number || row.product_inventory_detail?.code || ''
  const parts = [salesRowCustomerName(row), unit, ...extras]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)

  return { code: row.code || '', subject: parts.join(' · ') }
}
