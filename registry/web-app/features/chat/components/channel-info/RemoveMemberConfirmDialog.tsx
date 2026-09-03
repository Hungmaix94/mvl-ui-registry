import AppDialog from '@/components/dialog/AppDialog'

interface RemoveMemberConfirmDialogProps {
  open: boolean
  onClose: () => void
  targetUser: { user_id: number; display_name: string }
  onConfirm: () => Promise<void> | void
  loading?: boolean
}

export const RemoveMemberConfirmDialog = ({
  open,
  onClose,
  targetUser,
  onConfirm,
  loading,
}: RemoveMemberConfirmDialogProps) => {
  return (
    <AppDialog
      variant="alert"
      open={open}
      onOpenChange={onClose}
      onCancel={onClose}
      onConfirm={onConfirm}
      loading={loading}
      title="Xóa thành viên"
      titleDescription={`Bạn có chắc muốn xóa ${targetUser.display_name} khỏi channel?`}
      content=""
      confirmText="Xác nhận"
      cancelText="Hủy"
    />
  )
}
