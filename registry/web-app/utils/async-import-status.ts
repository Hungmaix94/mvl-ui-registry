import { ImportJobStatus } from '@/api/schema'

/**
 * Trạng thái vòng đời của một job import bất đồng bộ. Dùng thẳng enum
 * `ImportJobStatus` sinh từ schema BE (`queued | running | succeeded | failed |
 * cancelled`) để không tự khai lại chuỗi rồi lệch khi BE đổi.
 *
 * Để ở module thuần, không phụ thuộc React/UI, nên vừa test được trực tiếp vừa
 * dùng chung được cho cả dialog tiến trình lẫn dialog kết quả.
 */

/** Job dừng hẳn ở các trạng thái này — ngừng poll và trả job cuối về cho caller. */
export const IMPORT_TERMINAL_STATUSES = [
  ImportJobStatus.succeeded,
  ImportJobStatus.failed,
  ImportJobStatus.cancelled,
] as const

export type ImportTerminalStatus = (typeof IMPORT_TERMINAL_STATUSES)[number]

export function isTerminalImportStatus(status: string | undefined | null): boolean {
  return IMPORT_TERMINAL_STATUSES.includes(status as ImportTerminalStatus)
}
