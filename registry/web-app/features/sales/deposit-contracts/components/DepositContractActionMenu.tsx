import { FC } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui'
import {
  ChevronDown,
  Check,
  X,
  Trash2,
  Pencil,
  Ban,
  Undo,
  BadgeCheck,
  Mail,
  Eye,
  FileText,
  Percent,
} from 'lucide-react'

export type DepositContractActionMenuProps = {
  onAdminLeadApprove?: () => void // Trưởng nhóm Admin duyệt (pending_admin_lead)
  onAdminLeadReject?: () => void // Trưởng nhóm Admin từ chối
  onAccountantApprove?: () => void // Kế toán duyệt (pending_accountant)
  onAccountantReject?: () => void // Kế toán từ chối
  onApprove?: () => void // Admin phê duyệt
  onReject?: () => void // Admin từ chối
  onEdit?: () => void
  onDelete?: () => void
  onAbandon?: () => void // Hủy hợp đồng
  onRefund?: () => void // Hoàn tiền (ra lệnh — tiền CHƯA chuyển)
  onConfirmRefundPayment?: () => void // Xác nhận đã chi (tiền thực rời tài khoản)
  onConfirmInvestorRecovery?: () => void // Đã đòi lại được tiền từ CĐT
  onReclaimedEmailPreview?: () => void // Xem trước email thu hồi
  onReclaimedEmailSend?: () => void // Gửi email thu hồi
  onCreateTransactionSheet?: () => void // Tạo phiếu TTGD
  onCreateFeeSupportRequest?: () => void // Tạo phiếu hỗ trợ bán hàng (cờ bật mà chưa có phiếu)
  /**
   * Lý do các mục DUYỆT bị khoá (undefined = không khoá). Có giá trị thì 3 mục duyệt
   * hiện ra nhưng disabled kèm tooltip — ẩn hẳn thì người duyệt không hiểu vì sao mất
   * nút. Các mục TỪ CHỐI luôn để nguyên vì đó là lối thoát.
   */
  approveDisabledReason?: string
}

const ActionButton: FC<{
  label: string
  onClick: () => void
  leftIcon: React.ReactNode
  disabled?: boolean
  disabledReason?: string
}> = ({ label, onClick, leftIcon, disabled, disabledReason }) => (
  <Button
    variant="text"
    className="hover:bg-background-3 flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    onClick={onClick}
    leftIcon={leftIcon}
    disabled={disabled}
    title={disabled ? disabledReason : undefined}
  >
    <span className="typo-body-base text-content-dark-1">{label}</span>
  </Button>
)

export const DepositContractActionMenu: FC<DepositContractActionMenuProps> = ({
  onAdminLeadApprove,
  onAdminLeadReject,
  onAccountantApprove,
  onAccountantReject,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onAbandon,
  onRefund,
  onConfirmRefundPayment,
  onConfirmInvestorRecovery,
  onReclaimedEmailPreview,
  onReclaimedEmailSend,
  onCreateTransactionSheet,
  onCreateFeeSupportRequest,
  approveDisabledReason,
}) => {
  const approveBlocked = !!approveDisabledReason
  const hasActions =
    onAdminLeadApprove ||
    onAdminLeadReject ||
    onAccountantApprove ||
    onAccountantReject ||
    onApprove ||
    onReject ||
    onEdit ||
    onDelete ||
    onAbandon ||
    onRefund ||
    onReclaimedEmailPreview ||
    onReclaimedEmailSend ||
    onCreateTransactionSheet ||
    onCreateFeeSupportRequest

  if (!hasActions) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="medium" rightIcon={<ChevronDown size={18} />}>
          Thao tác
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        className="min-w-[240px] rounded-[3px] border-none bg-white p-2 shadow-lg"
      >
        <div className="flex flex-col">
          {onAdminLeadApprove && (
            <ActionButton
              label="Xác nhận (Trưởng nhóm Admin)"
              onClick={onAdminLeadApprove}
              leftIcon={<Check size={18} className="text-green-600" />}
              disabled={approveBlocked}
              disabledReason={approveDisabledReason}
            />
          )}
          {onAdminLeadReject && (
            <ActionButton
              label="Từ chối (Trưởng nhóm Admin)"
              onClick={onAdminLeadReject}
              leftIcon={<X size={18} className="text-orange-500" />}
            />
          )}
          {onAccountantApprove && (
            <ActionButton
              label="Kế toán phê duyệt"
              onClick={onAccountantApprove}
              leftIcon={<Check size={18} className="text-green-600" />}
              disabled={approveBlocked}
              disabledReason={approveDisabledReason}
            />
          )}
          {onAccountantReject && (
            <ActionButton
              label="Kế toán từ chối"
              onClick={onAccountantReject}
              leftIcon={<X size={18} className="text-orange-500" />}
            />
          )}
          {onApprove && (
            <ActionButton
              label="Phê duyệt"
              onClick={onApprove}
              leftIcon={<Check size={18} className="text-green-700" />}
              disabled={approveBlocked}
              disabledReason={approveDisabledReason}
            />
          )}
          {onReject && (
            <ActionButton
              label="Từ chối"
              onClick={onReject}
              leftIcon={<X size={18} className="text-red-500" />}
            />
          )}
          {onAbandon && (
            <ActionButton
              label="Hủy bỏ"
              onClick={onAbandon}
              leftIcon={<Ban size={18} className="text-red-600" />}
            />
          )}
          {onRefund && (
            <ActionButton
              label="Hoàn tiền"
              onClick={onRefund}
              leftIcon={<Undo size={18} className="text-orange-600" />}
            />
          )}
          {onConfirmRefundPayment && (
            <ActionButton
              label="Xác nhận đã chi"
              onClick={onConfirmRefundPayment}
              leftIcon={<BadgeCheck size={18} className="text-green-600" />}
            />
          )}
          {onConfirmInvestorRecovery && (
            <ActionButton
              label="Xác nhận đã đòi lại từ CĐT"
              onClick={onConfirmInvestorRecovery}
              leftIcon={<Undo size={18} className="text-blue-600" />}
            />
          )}
          {onReclaimedEmailPreview && (
            <ActionButton
              label="Xem trước Email thu hồi cọc"
              onClick={onReclaimedEmailPreview}
              leftIcon={<Eye size={18} className="text-blue-500" />}
            />
          )}
          {onReclaimedEmailSend && (
            <ActionButton
              label="Gửi Email thu hồi cọc"
              onClick={onReclaimedEmailSend}
              leftIcon={<Mail size={18} className="text-blue-600" />}
            />
          )}
          {onCreateTransactionSheet && (
            <ActionButton
              label="Tạo phiếu TTGD"
              onClick={onCreateTransactionSheet}
              leftIcon={<FileText size={18} className="text-blue-600" />}
            />
          )}
          {onCreateFeeSupportRequest && (
            <ActionButton
              label="Tạo phiếu hỗ trợ bán hàng"
              onClick={onCreateFeeSupportRequest}
              leftIcon={<Percent size={18} className="text-blue-600" />}
            />
          )}
          {onEdit && (
            <ActionButton
              label="Chỉnh sửa"
              onClick={onEdit}
              leftIcon={<Pencil size={18} className="text-gray-600" />}
            />
          )}
          {onDelete && (
            <ActionButton
              label="Xóa hợp đồng"
              onClick={onDelete}
              leftIcon={<Trash2 size={18} className="text-red-500" />}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
