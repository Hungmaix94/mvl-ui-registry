import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteEmployeeRelationship,
  type EmployeeRelationship,
} from '@/features/employee/services/employee-relationship-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export function useRelationDelete(onSuccessfullyDelete?: () => void) {
  const { displayConfirm, setLoading } = useDialog()
  const deleteRelationMutation = useDeleteEmployeeRelationship()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (relation: EmployeeRelationship) => {
      displayConfirm({
        title: 'Xoá quan hệ thân nhân',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá quan hệ thân nhân{' '}
            <b className="typo-body-lg-regular text-content-dark-2">
              {relation.relative_name || `${relation.employee_name} - ${relation.relative_name}`}
            </b>{' '}
            không?
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
            await deleteRelationMutation.mutateAsync(relation.id)

            // Invalidate employee relationships list queries
            await invalidateQueries.invalidateByPrefix('hrm/employee-relationships')

            toastService.success('Xoá quan hệ thân nhân thành công')

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
    [displayConfirm, deleteRelationMutation, invalidateQueries, setLoading, onSuccessfullyDelete]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteRelationMutation.isPending,
  }
}
