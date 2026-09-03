import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import {
  type Collaborator,
  useDeleteCollaborator,
} from '@/features/accounting/collaborators/services/collaborator-service.ts'

export function useCollaboratorDelete(onSuccess?: () => void) {
  const { displayConfirm, setLoading } = useDialog()
  const deleteMutation = useDeleteCollaborator()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (collaborator: Collaborator) => {
      displayConfirm({
        title: 'Xóa cộng tác viên',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xóa{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{collaborator.name}</b> không?
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
            await deleteMutation.mutateAsync(collaborator.id)
            await invalidateQueries.invalidateByPrefix('sales/collaborators')
            toastService.success('Xóa cộng tác viên thành công')
            onSuccess?.()
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, deleteMutation, invalidateQueries, onSuccess, setLoading]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteMutation.isPending,
  }
}
