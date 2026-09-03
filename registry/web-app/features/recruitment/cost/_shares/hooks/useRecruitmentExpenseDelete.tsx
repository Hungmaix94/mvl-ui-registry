import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteRecruitmentExpense,
  type RecruitmentExpense,
} from '@/features/recruitment/services/recruitment-expense-service'
import toastService from '@/services/toast-service.tsx'
import { QUERY_KEYS } from '@/constants'
import { useQueryClient } from '@tanstack/react-query'

export const useRecruitmentExpenseDelete = (onSuccessfullyDelete?: () => void) => {
  const { displayConfirm, setLoading, displayClose } = useDialog()
  const deleteRecruitmentExpenseMutation = useDeleteRecruitmentExpense()
  const queryClient = useQueryClient()

  const openDeleteDialog = useCallback(
    (expense: RecruitmentExpense) => {
      displayConfirm({
        title: 'Xoá chi phí tuyển dụng',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">
              {expense.recruitment_source.name}
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
            await deleteRecruitmentExpenseMutation.mutateAsync(expense.id)
            toastService.success('Xoá chi phí tuyển dụng thành công')
            await queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.HRM.RECRUITMENT_EXPENSES.ALL,
            })
            displayClose()
            onSuccessfullyDelete?.()
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
      deleteRecruitmentExpenseMutation,
      onSuccessfullyDelete,
      setLoading,
      queryClient,
      displayClose,
    ]
  )

  return {
    openDeleteDialog,
    isDeleting: deleteRecruitmentExpenseMutation.isPending,
  }
}
