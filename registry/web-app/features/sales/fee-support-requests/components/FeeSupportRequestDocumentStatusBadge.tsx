import { ColoredValueVariant } from '@/api/schema'
import { Chip } from '@/components/ui'

import {
  FEE_SUPPORT_DOCUMENT_STATUS_LABEL,
  FEE_SUPPORT_DOCUMENT_STATUS_VARIANT,
  FeeSupportRequestDocument_status,
} from '../constants/fee-support-request-constants'

type Props = {
  status?: FeeSupportRequestDocument_status | null
  /** Ẩn hẳn badge khi phiếu không cần hồ sơ (mặc định cho list; detail truyền false). */
  hideNotRequired?: boolean
  className?: string
}

/**
 * v3 — badge tuyến HỒ SƠ (kế toán duyệt thủ tục), render song song với badge
 * `status` (ladder chủ trương). Nhãn tạm local tới khi BE seed app-constant
 * `FeeSupportRequest_DocumentStatus` (xem constants).
 */
export function FeeSupportRequestDocumentStatusBadge({
  status,
  hideNotRequired = true,
  className,
}: Props) {
  if (!status) return null
  if (hideNotRequired && status === FeeSupportRequestDocument_status.not_required) return null

  const label = FEE_SUPPORT_DOCUMENT_STATUS_LABEL[status] ?? status
  const variant = FEE_SUPPORT_DOCUMENT_STATUS_VARIANT[status] ?? ColoredValueVariant.GREY

  return <Chip label={label} variant={variant} size="small" className={className} />
}

export default FeeSupportRequestDocumentStatusBadge
