import type { InputInvoice } from '../services/input-invoice-service'

/**
 * Tên dự án ở CẤP HOÁ ĐƠN, đọc qua shim vì `schema.ts` chưa có field này.
 *
 * BE **đã deploy** `project_name` cho `InputInvoice` / `InputInvoiceList`
 * (MVL-ERP-3/backend#3340) và endpoint live trả về đủ. Nhưng bản `schema.ts` đang check-in
 * được sinh từ một nguồn KHÁC — nó chứa `F2PaymentListResponse` / `F2PaymentRow` của báo cáo
 * 20.9, mà BE của 20.9 thì CHƯA lên môi trường dùng để generate. Chạy `yarn api:update` ở đây
 * sẽ thêm `project_name` nhưng đồng thời **xoá** hai type kia và làm đỏ `tsc` ở
 * `report-service.ts` + `F2PaymentReportTable.tsx` — hai file vừa merge. Đo 24/08: `dev` đang
 * sạch 0 lỗi, regen làm nó thành 2 file đỏ.
 *
 * Nên đi theo đúng luật của AGENTS.md cho ca "BE có field mà schema chưa có": cast **tại một
 * chỗ duy nhất**, không bẩn type dùng chung.
 *
 * TODO(schema): khi BE của báo cáo 20.9 lên dev, chạy `yarn api:update` rồi **xoá cả file
 * này** và đọc thẳng `invoice.project_name`. Cùng lúc đó gỡ luôn shim
 * `override_per_deal_revenue` ở `LadStep4Reason.tsx` — cùng một nguyên nhân.
 *
 * Nguồn giá trị (BE `InputInvoiceSerializer.get_project_name`): dự án của PHIẾU đối chiếu F2
 * trước, không có phiếu thì lùi về dòng đầu tiên có dự án. `null` khi không nguồn nào biết.
 */
export function inputInvoiceProjectName(
  invoice: Pick<InputInvoice, 'id'> | Record<string, unknown>
): string | null {
  const value = (invoice as { project_name?: unknown }).project_name
  return typeof value === 'string' && value !== '' ? value : null
}
