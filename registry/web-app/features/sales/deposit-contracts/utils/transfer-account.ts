import { TRANSFER_TO_ACCOUNT_OPTIONS } from '@/features/project/refund-booking/types/refund-payment-types'

/**
 * "Nguồn tiền" (`transfer_to_account`) của hợp đồng cọc — tiền khách đã VÀO tài khoản nào,
 * khác hẳn nhóm `source_account_*` là tài khoản khách chuyển ĐI.
 *
 * Nhãn giao diện đổi thành "Nguồn tiền" theo CR 86eymm20f; tên cột giữ nguyên
 * `transfer_to_account` vì BE, báo cáo thu-chi và bước hoàn đều đang gọi theo tên đó.
 *
 * Danh sách lựa chọn lấy thẳng từ `TRANSFER_TO_ACCOUNT_OPTIONS` (nơi form đang dùng) chứ
 * không chép lại — chép lại là hai bên trôi khỏi nhau, và bên trôi sẽ là bên im lặng.
 */

/**
 * Nhãn tiếng Việt để hiển thị.
 *
 * Từ 14/08/2026 cột này chỉ nhận `mv` hoặc `investor`, có CheckConstraint chốt ở DB, nên
 * nhánh fallback ở đây là lưới an toàn cho dữ liệu lạ chứ không phải một trạng thái thật:
 * `custom` và `unknown` đã bị gỡ khỏi enum và migration cùng đợt đã dọn hết dòng mang chúng.
 */
export function getTransferToAccountLabel(value: string | null | undefined): string {
  if (!value) return '-'
  return TRANSFER_TO_ACCOUNT_OPTIONS.find((o) => o.value === value)?.label ?? '-'
}
