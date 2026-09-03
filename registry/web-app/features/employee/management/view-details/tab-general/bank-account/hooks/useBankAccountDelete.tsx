import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useDeleteBankAccount } from '@/services/common-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { useToast } from '@/hooks/useToast.ts'

export function useBankAccountDelete() {
  const { displayConfirm } = useDialog()
  const deleteBankAccountMutation = useDeleteBankAccount()
  const invalidateQueries = useInvalidateQueries()
  const { success: showSuccessToast } = useToast()

  const openDeleteBankAccountDialog = useCallback(
    (bankAccountId: number, onSuccess?: () => void) => {
      displayConfirm({
        title: 'Xác nhận xóa',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc chắn muốn xóa tài khoản ngân hàng này?
            <br />
            Thao tác này không thể hoàn tác.
          </div>
        ),
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        onConfirm: async () => {
          try {
            await deleteBankAccountMutation.mutateAsync(bankAccountId)
            showSuccessToast('Xóa tài khoản ngân hàng thành công')
            await invalidateQueries.invalidateByPrefix('hrm')
            onSuccess?.()
          } catch {
            // Error toast is handled by service layer
          }
        },
      })
    },
    [displayConfirm, deleteBankAccountMutation, invalidateQueries, showSuccessToast]
  )

  return {
    openDeleteBankAccountDialog,
  }
}
