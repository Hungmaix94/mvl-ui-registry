import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useDeleteEmployee, type Employee } from '@/features/employee/services/employee-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export function useEmployeeDelete() {
  const { displayConfirm, setLoading } = useDialog()
  const deleteEmployeeMutation = useDeleteEmployee()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (employee: Employee) => {
      displayConfirm({
        title: 'Xoá nhân viên',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">
              {employee.fullname || employee.code}
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
            await deleteEmployeeMutation.mutateAsync(employee.id)

            // Invalidate employee list queries
            await invalidateQueries.invalidateByPrefix('hrm/employees')

            toastService.success('Xoá nhân viên thành công')
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, deleteEmployeeMutation, invalidateQueries, setLoading]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteEmployeeMutation.isPending,
  }
}
