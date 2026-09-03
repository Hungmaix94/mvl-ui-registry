import InvestorReconciliationListPage from '@/pages/authenticated/sales/investor-reconciliations/InvestorReconciliationListPage'
import { APP_PATH } from '@/routes'

/**
 * Đối chiếu chủ đầu tư (bản 2.0 — bản duy nhất còn định tuyến) — màn List. Danh sách giống hệt v1 nên
 * tái sử dụng nguyên component v1, chỉ truyền route override cho "Tạo phiếu" / "Chi tiết" /
 * "Chỉnh sửa" (xem props `createPath`/`detailPathTemplate`/`editPathTemplate` trên
 * InvestorReconciliationListPage).
 *
 * KHÔNG có route edit riêng: nút "Chỉnh sửa" ở list trỏ thẳng về màn Chi tiết (sửa thông tin chung
 * ngay tại đó) → `editPathTemplate` = route DETAIL, không phải EDIT.
 */
const InvestorReconciliationListPageV2 = () => (
  <InvestorReconciliationListPage
    createPath={APP_PATH.INVESTOR_RECONCILIATION_CREATE}
    detailPathTemplate={APP_PATH.INVESTOR_RECONCILIATION_DETAIL}
    editPathTemplate={APP_PATH.INVESTOR_RECONCILIATION_DETAIL}
  />
)

export default InvestorReconciliationListPageV2
