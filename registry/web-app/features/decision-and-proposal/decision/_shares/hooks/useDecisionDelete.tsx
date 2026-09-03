import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteDecision,
  type Decision,
} from '@/features/decision-and-proposal/services/decision-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export const useDecisionDelete = (onSuccessfullyDelete?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const deleteDecisionMutation = useDeleteDecision()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (decision: Decision) => {
      displayConfirm({
        title: 'Xoá quyết định',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{decision.name}</b> không?
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
            await deleteDecisionMutation.mutateAsync(decision.id)

            // Note: Invalidation is handled in useDeleteDecision mutation's onSuccess
            // No need to invalidate here as it's already done in the mutation

            toastService.success('Xoá quyết định thành công')

            if (typeof onSuccessfullyDelete === 'function' && onSuccessfullyDelete) {
              onSuccessfullyDelete()
            }
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, deleteDecisionMutation, invalidateQueries, onSuccessfullyDelete, setLoading]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteDecisionMutation.isPending,
  }
}
