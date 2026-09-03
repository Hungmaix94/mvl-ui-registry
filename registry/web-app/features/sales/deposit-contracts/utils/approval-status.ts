import { ColoredValueVariant } from '@/api/schema.ts'
import { DepositContractApprovalStatus } from '@/constants/api-schema-aliases'

/**
 * Biến thể màu cho chip "Trạng thái phê duyệt" của hợp đồng cọc.
 *
 * Vì sao phải là một bảng RIÊNG, không dùng chung `STATUS_VARIANTS` của vòng đời:
 * hai enum chỉ giao nhau ở `approved` / `rejected`. `DepositContract_STATUS_CHOICES` có 6 mục
 * (`new` · `pending_approval` · `approved` · `abandoned` · `refunded` · `rejected`), trong khi
 * `DepositContract_APPROVAL_STATUS_CHOICES` có 7 và chứa 5 bàn duyệt `pending_*`. Lấy bảng vòng
 * đời gán cho cột phê duyệt thì `pending_admin` và `pending_admin_lead` không khớp mục nào ⇒ rơi
 * về xám, đứng lẫn giữa các bàn chờ khác đang màu cam. Chi tiết bảng đối chiếu:
 * `docs/ai/patterns.md` § "One entity can own SEVERAL `*_CHOICES` keys".
 *
 * Đặt ở đây để màn Danh sách và màn Chi tiết dùng chung đúng một nguồn — trước đó mỗi màn giữ
 * một bản riêng và đã trôi khỏi nhau thật (86eymkje9).
 */
export const DEPOSIT_APPROVAL_STATUS_VARIANTS: Record<string, ColoredValueVariant> = {
  [DepositContractApprovalStatus.pending_confirm]: ColoredValueVariant.ORANGE,
  [DepositContractApprovalStatus.pending_manager]: ColoredValueVariant.ORANGE,
  [DepositContractApprovalStatus.pending_admin]: ColoredValueVariant.ORANGE,
  [DepositContractApprovalStatus.pending_admin_lead]: ColoredValueVariant.ORANGE,
  [DepositContractApprovalStatus.pending_accountant]: ColoredValueVariant.ORANGE,
  [DepositContractApprovalStatus.approved]: ColoredValueVariant.GREEN,
  [DepositContractApprovalStatus.rejected]: ColoredValueVariant.RED,
}

/** Màu của một trạng thái phê duyệt; giá trị lạ về xám thay vì vỡ giao diện. */
export function getDepositApprovalStatusVariant(status: string): ColoredValueVariant {
  return DEPOSIT_APPROVAL_STATUS_VARIANTS[status] || ColoredValueVariant.GREY
}
