import { BookingRefundSaleSale_type as DepositContractSaleType } from '@/api/schema'

/** Shape tối thiểu để xét khoá theo loại nhân sự bán (DepositContractSale / BookingSale). */
type StaffLike = {
  id: number
  sale_type?: DepositContractSaleType
}

/**
 * CR STT14 (ClickUp 86eyd8p2b, SRS 18.8 fsd §3.2) — danh sách nhân sự tham gia bán trên
 * phiếu hỗ trợ phí hiển thị **đầy đủ** (kể cả F2 `partner` và CTV tuyến sàn liên kết),
 * nhưng **khoá không cho bỏ tích** với:
 * - **sale MV** (`sale_type=mv`), và
 * - **CTV của sale** (`sale_type=collaborator`).
 *
 * F2 (`partner`) KHÔNG bị khoá — vẫn tích/bỏ tích được.
 */
export function isFeeSupportLockedStaff(staff: StaffLike): boolean {
  return (
    staff.sale_type === DepositContractSaleType.mv ||
    staff.sale_type === DepositContractSaleType.collaborator
  )
}

/**
 * Dòng F2 (`partner` — sàn liên kết). BE từ chối MỌI id `partner` trong `sales[]`
 * (`_is_eligible_participant` ở `apps/sales/api/serializers/fee_support_request.py`),
 * nên tích F2 không có đường nào ra payload hợp lệ — nó chỉ dẫn tới 400.
 *
 * ClickUp 86eyqv8yu: trước đây ô tích F2 để tự do đúng theo FSD 18.8 §3.2 (chốt
 * 2026-07-27), nhưng vế còn lại của chốt đó — "cần BE xử lý: nhận hay từ chối id
 * partner" — chưa bao giờ được quyết. Trong lúc BE vẫn từ chối thì ô tích tự do
 * là một affordance không dẫn tới đâu, nên khoá hẳn.
 */
export function isFeeSupportF2Staff(staff: StaffLike): boolean {
  return staff.sale_type === DepositContractSaleType.partner
}

/**
 * Giao dịch không còn nhân sự nào tích được ⇒ KHÔNG tạo được phiếu, không phải
 * "người dùng quên chọn". Đo 2026-08-25 trên dev: 30/435 hợp đồng cọc rơi vào ca
 * này. Danh sách rỗng KHÔNG tính — đó là ca "đang tải" / "chưa có dữ liệu", có
 * lời nhắn riêng.
 */
export function hasNoSelectableFeeSupportStaff(staffList: readonly StaffLike[]): boolean {
  return staffList.length > 0 && lockedFeeSupportStaffIds(staffList).length === 0
}

/** Id của những nhân sự bị khoá (MV + CTV) — luôn phải nằm trong payload `sales`. */
export function lockedFeeSupportStaffIds(staffList: readonly StaffLike[]): number[] {
  return staffList.filter(isFeeSupportLockedStaff).map((staff) => staff.id)
}

/**
 * Bổ sung các id bị khoá còn thiếu vào danh sách đang chọn — giữ nguyên thứ tự cũ và
 * trả về CHÍNH mảng cũ khi không thiếu gì (để effect so sánh tham chiếu, không lặp vô hạn).
 * Dùng chung cho cả hai màn tạo trước khi submit.
 */
export function withLockedFeeSupportStaffIds(
  selectedIds: readonly number[],
  staffList: readonly StaffLike[]
): readonly number[] {
  const missing = lockedFeeSupportStaffIds(staffList).filter((id) => !selectedIds.includes(id))
  return missing.length === 0 ? selectedIds : [...selectedIds, ...missing]
}
