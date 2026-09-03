import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '@/hooks/useDialog.ts'
import { QUERY_KEYS } from '@/constants/query-keys.ts'
import toastService from '@/services/toast-service.tsx'
import { useDeleteBranchContactInfo } from '@/services'

export const useBranchContactInfoDelete = (branchId: number) => {
  const queryClient = useQueryClient()
  const { displayConfirm, setLoading } = useDialog()
  const deleteBranchContactInfoMutation = useDeleteBranchContactInfo()

  const openDeleteDialog = useCallback(
    (contactInfoId: number) => {
      displayConfirm({
        title: 'Xác nhận xóa',
        content: 'Bạn có chắc chắn muốn xóa thông tin liên hệ này không?',
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteBranchContactInfoMutation.mutateAsync(contactInfoId)

            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.HRM.BRANCH_CONTACT_INFOS.LIST({ branch: branchId }),
            })

            toastService.success('Đã xóa thành công')
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, setLoading, deleteBranchContactInfoMutation, queryClient, branchId]
  )

  return { openDeleteDialog }
}
