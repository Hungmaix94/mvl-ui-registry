import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useDeleteDepartment, type Department } from '@/features/org/services/department-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export const useDepartmentDelete = (onSuccessfullyDelete?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const deleteDepartmentMutation = useDeleteDepartment()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (department: Department) => {
      displayConfirm({
        title: 'Xoá phòng ban',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá <b className="text-content-dark-2">{department.name}</b> không?
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
            await deleteDepartmentMutation.mutateAsync(department.id)

            // Invalidate all branches queries to refresh the list
            await invalidateQueries.invalidateByPrefix('hrm')

            toastService.success('Xoá phòng ban thành công')

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
    [displayConfirm, deleteDepartmentMutation, invalidateQueries, onSuccessfullyDelete, setLoading]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteDepartmentMutation.isPending,
  }
}
