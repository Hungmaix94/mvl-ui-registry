import { ColoredValueVariant } from '@/api/schema.ts'
import {
  ElibraryAccessRequestRole,
  ElibraryAccessRequestStatus,
} from '@/constants/api-schema-aliases'
/**
 * Dùng thẳng enum generated từ schema (khớp query param `role`/`status` và field
 * `status` của LibraryAccessRequestRead) để tránh lệch kiểu string ↔ enum.
 */
export {
  ElibraryAccessRequestRole as AccessRequestRole,
  ElibraryAccessRequestStatus as AccessRequestStatus,
}

export type AccessRequestRoleValue = ElibraryAccessRequestRole

const STATUS_LABEL: Record<string, string> = {
  [ElibraryAccessRequestStatus.pending]: 'Đang chờ',
  [ElibraryAccessRequestStatus.approved]: 'Đã duyệt',
  [ElibraryAccessRequestStatus.rejected]: 'Đã từ chối',
  [ElibraryAccessRequestStatus.cancelled]: 'Đã huỷ',
}

const STATUS_VARIANT: Record<string, ColoredValueVariant> = {
  [ElibraryAccessRequestStatus.pending]: ColoredValueVariant.YELLOW,
  [ElibraryAccessRequestStatus.approved]: ColoredValueVariant.GREEN,
  [ElibraryAccessRequestStatus.rejected]: ColoredValueVariant.RED,
  [ElibraryAccessRequestStatus.cancelled]: ColoredValueVariant.GREY,
}

/** Nhãn + màu Chip cho một trạng thái yêu cầu truy cập. */
export function getAccessRequestStatusDisplay(status?: string | null): {
  label: string
  variant: ColoredValueVariant
} {
  const key = status ?? ''
  return {
    label: STATUS_LABEL[key] ?? (key || '-'),
    variant: STATUS_VARIANT[key] ?? ColoredValueVariant.GREY,
  }
}
