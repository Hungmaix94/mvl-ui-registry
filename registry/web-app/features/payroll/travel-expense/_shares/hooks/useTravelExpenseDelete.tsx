import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteTravelExpense,
  type TravelExpense,
} from '@/features/payroll/services/travel-expense-service'
import toastService from '@/services/toast-service.tsx'
import { useQueryClient } from '@tanstack/react-query'

export const useTravelExpenseDelete = (onSuccessfullyDelete?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const deleteTravelExpenseMutation = useDeleteTravelExpense()
  const queryClient = useQueryClient()

  const openDeleteDialog = useCallback(
    (expense: TravelExpense) => {
      displayConfirm({
        title: 'Xoá công tác phí',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{expense.name}</b> không?
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
            await deleteTravelExpenseMutation.mutateAsync(expense.id)

            // Invalidate all travel expenses list queries to refresh the table
            await queryClient.invalidateQueries({
              predicate: (query) => {
                const key = query.queryKey
                return (
                  Array.isArray(key) &&
                  key.length >= 3 &&
                  key[0] === 'payroll' &&
                  key[1] === 'travel-expenses' &&
                  key[2] === 'list'
                )
              },
            })

            toastService.success('Xoá công tác phí thành công')

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
    [displayConfirm, deleteTravelExpenseMutation, queryClient, onSuccessfullyDelete, setLoading]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteTravelExpenseMutation.isPending,
  }
}
