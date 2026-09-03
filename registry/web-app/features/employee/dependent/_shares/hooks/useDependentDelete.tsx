import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteEmployeeDependent,
  type EmployeeDependent,
} from '@/features/employee/services/employee-dependent-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export function useDependentDelete(onSuccessfullyDelete?: () => void) {
  const { displayConfirm, setLoading } = useDialog()
  const deleteDependentMutation = useDeleteEmployeeDependent()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (dependent: EmployeeDependent) => {
      displayConfirm({
        title: 'Xoá người phụ thuộc',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá người phụ thuộc{' '}
            <b className="typo-body-lg-regular text-content-dark-2">
              {dependent.dependent_name ||
                `${dependent.employee?.fullname || ''} - ${dependent.dependent_name || ''}`}
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
            await deleteDependentMutation.mutateAsync(dependent.id)

            // Invalidate employee dependents list queries
            await invalidateQueries.invalidateByPrefix('hrm/employee-dependents')

            toastService.success('Xoá người phụ thuộc thành công')

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
    [displayConfirm, deleteDependentMutation, invalidateQueries, setLoading, onSuccessfullyDelete]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteDependentMutation.isPending,
  }
}
