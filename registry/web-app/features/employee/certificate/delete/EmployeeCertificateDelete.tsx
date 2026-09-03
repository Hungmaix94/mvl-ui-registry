import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteEmployeeCertificate,
  type EmployeeCertificate,
} from '@/features/employee/services/employee-certificate-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export const useEmployeeCertificateDelete = (onSuccessfullyDelete?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const deleteEmployeeCertificateMutation = useDeleteEmployeeCertificate()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (certificate: EmployeeCertificate) => {
      displayConfirm({
        title: 'Xoá bằng cấp, chứng chỉ',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá bằng cấp, chứng chỉ{' '}
            <b className="typo-body-lg-regular text-content-dark-2">
              {certificate.certificate_name ||
                certificate.certificate_code ||
                certificate.certificate_type_display}
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
            await deleteEmployeeCertificateMutation.mutateAsync(certificate.id)

            // Invalidate employee certificate list queries
            await invalidateQueries.invalidateByPrefix('hrm/employee-certificates')

            toastService.success('Xoá bằng cấp, chứng chỉ thành công')

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
    [
      displayConfirm,
      deleteEmployeeCertificateMutation,
      invalidateQueries,
      onSuccessfullyDelete,
      setLoading,
    ]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteEmployeeCertificateMutation.isPending,
  }
}
