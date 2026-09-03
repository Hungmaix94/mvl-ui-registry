import { useCallback } from 'react'

import { useDialog } from '@/hooks/useDialog'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { useDeleteInvestorReconciliationLine } from '@/features/sales/investor-reconciliations/services/investor-reconciliation-line-service'
import type { InvestorReconciliationLine } from '@/features/sales/investor-reconciliations/services/investor-reconciliation-line-service'

/**
 * Xoá một căn (line) đã lưu trong phiếu đối chiếu — dùng chung pattern với
 * useInvestorReconciliationDelete (xoá phiếu) nhưng gọi endpoint nested
 * `/investor-reconciliation-sheets/{sheet_pk}/lines/{id}/`.
 */
export function useInvestorReconciliationLineDelete(sheetId: number) {
  const { displayConfirm, setLoading } = useDialog()
  const deleteMutation = useDeleteInvestorReconciliationLine()
  const { invalidateByPrefix } = useInvalidateQueries()

  const openDeleteLineDialog = useCallback(
    (line: InvestorReconciliationLine) => {
      const label = line.deal_detail?.code || line.code

      displayConfirm({
        title: 'Xoá căn',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá căn{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{label}</b> khỏi đối chiếu này
            không?
            <br />
            Thao tác này không thể hoàn tác.
          </div>
        ),
        confirmText: 'Xoá',
        cancelText: 'Hủy',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        size: 'xl',
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteMutation.mutateAsync({ sheetPk: sheetId, id: line.id })
            await invalidateByPrefix('sales')
            toastService.success('Xoá căn thành công')
          } catch (error) {
            toastService.error(extractErrorMessage(error))
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [deleteMutation, displayConfirm, invalidateByPrefix, setLoading, sheetId]
  )

  return { openDeleteLineDialog, isDeleting: deleteMutation.isPending }
}

export default useInvestorReconciliationLineDelete
