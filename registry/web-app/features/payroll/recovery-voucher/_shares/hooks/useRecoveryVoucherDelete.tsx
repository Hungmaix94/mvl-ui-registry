import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteRecoveryVoucher,
  type RecoveryVoucher,
} from '@/features/payroll/services/recovery-voucher-service'
import toastService from '@/services/toast-service.tsx'
import { QUERY_KEYS } from '@/constants'
import { useQueryClient } from '@tanstack/react-query'

export const useRecoveryVoucherDelete = (onSuccessfullyDelete?: () => void) => {
  const { displayConfirm, setLoading, displayClose } = useDialog()
  const deleteMutation = useDeleteRecoveryVoucher()
  const queryClient = useQueryClient()

  const openDeleteDialog = useCallback(
    (voucher: RecoveryVoucher) => {
      displayConfirm({
        title: 'Xóa phiếu truy thu/truy lĩnh',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{voucher.name}</b> không?
            <br />
            Thao tác này không thể hoàn tác.
          </div>
        ),
        confirmText: 'Xoá',
        cancelText: 'Huỷ',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        size: 'xl',
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteMutation.mutateAsync(voucher.id)
            toastService.success('Xoá phiếu thành công')
            await queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.PAYROLL.RECOVERY_VOUCHERS.LIST({}),
            })
            displayClose()
            onSuccessfullyDelete?.()
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [deleteMutation, displayClose, displayConfirm, onSuccessfullyDelete, queryClient, setLoading]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteMutation.isPending,
  }
}
