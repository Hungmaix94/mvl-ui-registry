import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useDeleteRole, type Role } from '@/services/role-service.ts'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export const usePermissionRoleDelete = (onSuccessfullyDelete?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const deleteRoleMutation = useDeleteRole()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (role: Role) => {
      displayConfirm({
        title: 'Xoá vai trò',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá <b className="text-content-dark-2">{role.name}</b> không?
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
            await deleteRoleMutation.mutateAsync(role.id)

            // Invalidate all roles queries to refresh the list
            await invalidateQueries.invalidateByPrefix('roles')

            toastService.success('Xoá vai trò thành công')

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
    [displayConfirm, deleteRoleMutation, invalidateQueries, onSuccessfullyDelete, setLoading]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteRoleMutation.isPending,
  }
}
