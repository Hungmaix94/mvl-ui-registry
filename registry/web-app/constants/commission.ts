import { ColoredValueVariant } from '@/api/schema'
import { TbcApprovalStatus } from '@/constants/api-schema-aliases'

/**
 * Trạng thái theo NGÀY của một kỳ TBC (`period_status` do BE suy từ effective_from/to).
 *
 * ⚠️ Từ ClickUp 86exm4ud9, bảng "Lịch sử cấu hình" của TBC lõi hiển thị
 * `TBC_APPROVAL_STATUS_STYLES` bên dưới chứ KHÔNG dùng map này nữa: `approval_status`
 * đã bao trùm cả trục ngày (approved/active/expired), nên hiện cả hai sẽ có lúc mâu
 * thuẫn — kỳ tới ngày hiệu lực nhưng chưa ai duyệt thì `period_status` nói "Đang áp
 * dụng" trong khi thực tế nó vô hình với commission engine.
 *
 * Map này còn dùng cho TBC-F2 / HHQL / Thưởng chính sách — ba loại chưa có luồng duyệt.
 */
export const TBC_STATUS_STYLES: Record<string, { variant: ColoredValueVariant; label: string }> = {
  fallback: { variant: ColoredValueVariant.GREY, label: 'Mặc định' },
  scheduled: { variant: ColoredValueVariant.BLUE, label: 'Sắp hiệu lực' },
  upcoming: { variant: ColoredValueVariant.ORANGE, label: 'Chờ duyệt' },
  active: { variant: ColoredValueVariant.GREEN, label: 'Đang áp dụng' },
  expired: { variant: ColoredValueVariant.GREY, label: 'Đã hết hiệu lực' },
  rejected: { variant: ColoredValueVariant.RED, label: 'Từ chối' },
}

/**
 * MÀU của từng trạng thái duyệt cấu hình TBC lõi (ClickUp 86exm4ud9).
 *
 * Ba giá trị `approved` / `active` / `expired` là một trạng thái mang ba mặt — đều đã
 * được duyệt, chỉ khác chỗ hôm nay nằm đâu so với khoảng hiệu lực. Chỉ ba giá trị còn
 * lại là chưa duyệt, và cấu hình chưa duyệt thì commission engine không nhìn thấy.
 *
 * ⚠️ CHỈ có màu ở đây, KHÔNG có nhãn. Nhãn tiếng Việt là của backend, đọc qua
 * `useAppConstant(APP_CONSTANT_KEY.REALESTATE.TIME_BOUND_COMMISSION_APPROVAL_STATUS)` —
 * `docs/ai/patterns.md` cấm tự bảo trì map nhãn tiếng Việt vì nó trôi khỏi nguồn dịch
 * và vượt mặt ranh giới i18n đã có. Màu thì ngược lại: backend không biết gì về nó.
 *
 * Key lấy từ enum `TbcApprovalStatus` chứ không gõ chuỗi: BE thêm trạng thái mới mà
 * quên map ở đây là TypeScript đỏ ngay, thay vì ô trạng thái lặng lẽ mất màu.
 */
export const TBC_APPROVAL_STATUS_VARIANTS: Record<TbcApprovalStatus, ColoredValueVariant> = {
  [TbcApprovalStatus.draft]: ColoredValueVariant.GREY,
  [TbcApprovalStatus.pending]: ColoredValueVariant.ORANGE,
  [TbcApprovalStatus.approved]: ColoredValueVariant.BLUE,
  [TbcApprovalStatus.active]: ColoredValueVariant.GREEN,
  [TbcApprovalStatus.expired]: ColoredValueVariant.GREY,
  [TbcApprovalStatus.rejected]: ColoredValueVariant.RED,
}

/** Trạng thái mà cấu hình đã qua tay người duyệt — commission engine nhìn thấy được. */
export const TBC_APPROVED_STATUSES: readonly TbcApprovalStatus[] = [
  TbcApprovalStatus.approved,
  TbcApprovalStatus.active,
  TbcApprovalStatus.expired,
]

/** Trạng thái còn sửa được mà không cần duyệt lại. */
export const TBC_EDITABLE_STATUSES: readonly TbcApprovalStatus[] = [
  TbcApprovalStatus.draft,
  TbcApprovalStatus.rejected,
]

export const TBC_SOURCE = {
  SA: 'sa',
  PI: 'pi',
} as const

export type TbcSource = (typeof TBC_SOURCE)[keyof typeof TBC_SOURCE]

/**
 * Nguồn cấu hình của một kỳ TBC ở màn product-inventory.
 * BE trả `edit_scope` trên mỗi entry:
 * - `sales_allocation`: kỳ kế thừa từ bảng hàng (SA), chỉ sửa được ở workspace SA.
 * - `product_inventory`: cấu hình riêng của căn này.
 */
export const TBC_EDIT_SCOPE = {
  SALES_ALLOCATION: 'sales_allocation',
  PRODUCT_INVENTORY: 'product_inventory',
} as const

export type TbcEditScope = (typeof TBC_EDIT_SCOPE)[keyof typeof TBC_EDIT_SCOPE]

export const TBC_EDIT_SCOPE_STYLES: Record<
  string,
  { variant: ColoredValueVariant; label: string }
> = {
  [TBC_EDIT_SCOPE.SALES_ALLOCATION]: { variant: ColoredValueVariant.BLUE, label: 'Kế thừa từ SA' },
  [TBC_EDIT_SCOPE.PRODUCT_INVENTORY]: {
    variant: ColoredValueVariant.PURPLE,
    label: 'Cấu hình riêng',
  },
}

export const HOLD_REASON_OPTIONS = [
  { value: 'CARRYOVER', label: 'Chưa nhận kỳ này' },
  { value: 'MISSING_BROKER_CERT', label: 'Thiếu chứng chỉ môi giới' },
  { value: 'EXPIRED_BROKER_CERT', label: 'Chứng chỉ môi giới đã hết hạn' },
  { value: 'PENDING_BROKER_CERT', label: 'Chờ cấp chứng chỉ môi giới' },
  { value: 'OTHER', label: 'Khác' },
]

// Commission field keys hidden from ALL commission UI (ClickUp 86eycwqq1):
// "Thưởng cho sàn LK từ MV" (mv_bonus_to_f2). The BE still stores/returns the value;
// the FE only stops rendering it (config inputs, applied-config tiles, history rows).
export const HIDDEN_COMMISSION_FIELD_KEYS = new Set<string>([
  'pct_mv_bonus_to_f2',
  'amt_mv_bonus_to_f2',
])

export function isHiddenCommissionField(key: string | null | undefined): boolean {
  return key != null && HIDDEN_COMMISSION_FIELD_KEYS.has(key)
}

export const COMMISSION_ADJUSTMENT_PREFIX = {
  TRANSFER_TAG: '[ĐC]',
  TRANSFER_SENDER_PREFIX: '[ĐC] Chuyển cho nhân sự #',
  TRANSFER_RECEIVER_PREFIX: '[ĐC] Nhận từ nhân sự #',
  TRANSFER_SENDER_NOTE: (partnerId: string | number, note: string) =>
    `[ĐC] Chuyển cho nhân sự #${partnerId}: ${note}`,
  TRANSFER_RECEIVER_NOTE: (partnerId: string | number, note: string) =>
    `[ĐC] Nhận từ nhân sự #${partnerId}: ${note}`,
  BATCH_NOTE: (month: number, year: number) => `Điều chỉnh hoa hồng kỳ ${month}/${year}`,
} as const
