import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { type Customer, useDeleteCustomer } from '@/services/sales-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'

export function useCustomerDelete(onSuccess?: () => void) {
  const { displayConfirm, setLoading } = useDialog()
  const deleteMutation = useDeleteCustomer()
  const invalidateQueries = useInvalidateQueries()

  const openDeleteDialog = useCallback(
    (customer: Customer) => {
      displayConfirm({
        title: 'Xóa khách hàng',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xóa{' '}
            <b className="typo-body-lg-regular text-content-dark-2">
              {customer.full_name || customer.business_name || customer.code}
            </b>{' '}
            không?
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
            await deleteMutation.mutateAsync(customer.id)
            await invalidateQueries.invalidateByPrefix('sales/customers')
            toastService.success('Xóa khách hàng thành công')
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
