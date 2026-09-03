import AppDialog from '@/components/dialog/AppDialog'

interface PromoteDemoteConfirmDialogProps {
  open: boolean
  onClose: () => void
  targetUser: { user_id: number; display_name: string }
  actionType: 'promote' | 'demote'
  onConfirm: () => Promise<void> | void
  loading?: boolean
}

export const PromoteDemoteConfirmDialog = ({
  open,
  onClose,
  targetUser,
  actionType,
  onConfirm,
  loading,
}: PromoteDemoteConfirmDialogProps) => {
  const isPromote = actionType === 'promote'

  return (
    <AppDialog
      variant="alert"
      open={open}
      onOpenChange={onClose}
      onCancel={onClose}
      onConfirm={onConfirm}
      loading={loading}
      title={isPromote ? 'Phong quyền Admin' : 'Tước quyền Admin'}
      titleDescription={
        isPromote
          ? `Bạn có chắc muốn phong ${targetUser.display_name} làm Admin?`
          : `Bạn có chắc muốn tước quyền Admin của ${targetUser.display_name}?`
      }
      content=""
      confirmText="Xác nhận"
      cancelText="Hủy"
    />
  )
}
