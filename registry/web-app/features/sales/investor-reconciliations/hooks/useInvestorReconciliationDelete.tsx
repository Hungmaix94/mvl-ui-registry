import { useCallback } from 'react'

import { useDialog } from '@/hooks/useDialog'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import toastService from '@/services/toast-service'
import { useDeleteInvestorReconciliationSheet } from '@/features/sales/investor-reconciliations/services/investor-reconciliation-service'
import type { InvestorReconciliationSheet } from '@/features/sales/investor-reconciliations/types/investor-reconciliation'

export function useInvestorReconciliationDelete(onSuccess?: () => void) {
  const { displayConfirm, setLoading } = useDialog()
  const deleteMutation = useDeleteInvestorReconciliationSheet()
  const { invalidateByPrefix } = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (row: InvestorReconciliationSheet) => {
      displayConfirm({
        title: 'Xóa đối chiếu chủ đầu tư',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xóa đối chiếu{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{row.code}</b> không?
            <br />
            Thao tác này không thể hoàn tác.
          </div>
        ),
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        size: 'xl',
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteMutation.mutateAsync(row.id)
            await invalidateByPrefix('sales')
            toastService.success('Xóa đối chiếu thành công')
            onSuccess?.()
          } catch {
            // Error toast handled by mutation layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [deleteMutation, displayConfirm, invalidateByPrefix, onSuccess, setLoading]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteMutation.isPending,
  }
}

export default useInvestorReconciliationDelete
