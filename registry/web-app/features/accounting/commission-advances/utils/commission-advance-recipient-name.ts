import type { components } from '@/api/schema'

type RecipientLine = components['schemas']['CommissionAdvanceRecipientLine']

/**
 * Tên hiển thị của một dòng thụ hưởng.
 *
 * Một dòng là nhân viên HOẶC cộng tác viên (xem `commission-advance-types.ts`), nên phải thử
 * lần lượt cả hai trước khi rơi về `recipient_label` — nhãn FE prefill từ bảng chia cho dòng CTV
 * chưa có hồ sơ. Hết đường thì hiện `Dòng #id`, KHÔNG để trống: ô trống trong danh sách duyệt
 * tiền đọc ra như một dòng hỏng, còn số hiệu dòng thì vẫn tra ngược được về bản ghi.
 *
 * Gom về đây vì trước 19/08 hàm này tồn tại hai bản chép tay — màn Chi tiết và màn Danh sách —
 * và hai bản đã lệch nhau: bản ở màn Danh sách thiếu hẳn nhánh `recipient_label`, nên dòng CTV
 * prefill hiện `Dòng #12` trong khi màn Chi tiết hiện đúng tên.
 */
export function getRecipientName(line: RecipientLine): string {
  if (line.recipient_employee_detail?.fullname) {
    return line.recipient_employee_detail.fullname
  }
  const l = line as Record<string, unknown>
  if (l.recipient_collaborator_detail && typeof l.recipient_collaborator_detail === 'object') {
    const colab = l.recipient_collaborator_detail as { name?: string }
    if (colab.name) return colab.name
  }
  if (typeof l.recipient_label === 'string' && l.recipient_label) {
    return l.recipient_label
  }
  return `Dòng #${line.id}`
}
