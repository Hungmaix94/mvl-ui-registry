import type { components } from '@/api/schema'
import type { ImportJob } from '@/services/export-service'

type ResultFiles = components['schemas']['ResultFiles']

/**
 * Bộ chuẩn hoá thuần cho kết quả job import danh sách căn.
 *
 * Tách khỏi hook dialog để test được trực tiếp: import file `.tsx` kia sẽ kéo
 * theo cả chuỗi UI/store và vỡ ở khâu collect (circular import).
 */

/** `result_files` đôi khi về dạng chuỗi JSON — chuẩn hoá trước khi đọc. */
export function parseResultFiles(raw: ResultFiles | string | null | undefined): ResultFiles | null {
  if (!raw) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ResultFiles
    } catch {
      return null
    }
  }
  return raw
}

/**
 * Thông báo hỏng của job, hoặc `null` khi job thành công.
 *
 * Chỉ `succeeded` mới là kết thúc thành công. `cancelled` (job bị huỷ giữa chừng)
 * cũng là trạng thái kết thúc và được đẩy sang dialog kết quả — nếu chỉ kiểm tra
 * `status === 'failed'` thì job huỷ sẽ hiện "Thêm thành công 0 căn" màu xanh,
 * khiến người dùng tưởng file rỗng.
 */
export function resolveImportOutcomeMessage(job: ImportJob): string | null {
  if (job.status === 'succeeded') return null
  if (job.error_message) return job.error_message
  if (job.status === 'cancelled') return 'Tiến trình nhập đã bị huỷ.'
  return 'Nhập dữ liệu thất bại.'
}
