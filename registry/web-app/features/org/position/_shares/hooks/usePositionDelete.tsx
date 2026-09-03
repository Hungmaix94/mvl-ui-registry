import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useDeletePosition, type Position } from '@/features/org/services/position-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export const usePositionDelete = (onSuccessfullyDelete?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const deletePositionMutation = useDeletePosition()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (position: Position) => {
      displayConfirm({
        title: 'Xoá chức vụ',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá <b className="text-content-dark-2">{position.name}</b> không?
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
            await deletePositionMutation.mutateAsync(position.id)

            // Invalidate all positions queries to refresh the list
            await invalidateQueries.invalidateByPrefix('hrm')

            toastService.success('Xoá chức vụ thành công')

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
    [displayConfirm, deletePositionMutation, invalidateQueries, onSuccessfullyDelete, setLoading]
  )

  return {
    openDeleteDialog,
    isDeleting: deletePositionMutation.isPending,
  }
}
