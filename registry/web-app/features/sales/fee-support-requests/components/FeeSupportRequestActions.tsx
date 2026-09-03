import { Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useAbility } from '@/lib/ability'

import {
  FEE_SUPPORT_ACTION,
  FEE_SUPPORT_PENDING_STATUSES,
  FEE_SUPPORT_PERMISSION_SUBJECT,
  FEE_SUPPORT_WEB_EDITABLE_STATUSES,
  FeeSupportRequestOrigin,
  FeeSupportRequestStatus,
} from '../constants/fee-support-request-constants'

type Props = {
  status: FeeSupportRequestStatus
  origin: FeeSupportRequestOrigin | undefined
  createdBy: number | null
  onApprove: () => void
  onReject: () => void
  onEdit: () => void
}

/**
 * Nút Sửa/Duyệt/Từ chối cho PageTitle customActions.
 *
 * Duyệt/Từ chối: endpoint approve duy nhất tự đẩy cấp hiện hành theo origin (D19)
 * nên FE chỉ gate: (1) phiếu đang ở trạng thái chờ, (2) quyền `fee_support.approve` /
 * `fee_support.reject`. Sai cấp/role → BE trả ValidationError và FE surface qua
 * toast (không tự đoán cấp).
 *
 * Sửa (86eyqf9m3): chỉ CREATOR của chính phiếu `web_secretary` này, khi còn
 * DRAFT/PENDING_TP_ADMIN — một phiếu `mobile_sale` cũng có thể dừng ở
 * PENDING_TP_ADMIN (bước cuối ladder mobile) nên phải chặn origin ở FE, không chỉ
 * dựa status, kẻo hiện nút cho phiếu BE chắc chắn sẽ trả 400 (`_authorize_edit`
 * đòi origin=web_secretary cho nhánh này). BE vẫn là nguồn xác nhận cuối (ownership
 * + status được re-check trong service) — FE chỉ ẩn/hiện nút cho gọn UI.
 */
export function FeeSupportRequestActions({
  status,
  origin,
  createdBy,
  onApprove,
  onReject,
  onEdit,
}: Props) {
  const ability = useAbility()
  const { user } = useAuth()

  const isPending = FEE_SUPPORT_PENDING_STATUSES.includes(status)
  const canApprove =
    isPending && ability.can(FEE_SUPPORT_ACTION.APPROVE, FEE_SUPPORT_PERMISSION_SUBJECT)
  const canReject =
    isPending && ability.can(FEE_SUPPORT_ACTION.REJECT, FEE_SUPPORT_PERMISSION_SUBJECT)
  const canEdit =
    origin === FeeSupportRequestOrigin.web_secretary &&
    FEE_SUPPORT_WEB_EDITABLE_STATUSES.includes(status) &&
    createdBy != null &&
    createdBy === user?.id &&
    ability.can(FEE_SUPPORT_ACTION.PARTIAL_UPDATE, FEE_SUPPORT_PERMISSION_SUBJECT)

  if (!canApprove && !canReject && !canEdit) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <Button variant="secondary" onClick={onEdit}>
          Sửa
        </Button>
      )}
      {canReject && (
        <Button
          variant="secondary"
          onClick={onReject}
          className="border-action-primary-red-default text-action-primary-red-default hover:bg-action-primary-red-disabled"
        >
          Từ chối
        </Button>
      )}
      {canApprove && (
        <Button variant="primary" onClick={onApprove}>
          Duyệt đề xuất
        </Button>
      )}
    </div>
  )
}

export default FeeSupportRequestActions
