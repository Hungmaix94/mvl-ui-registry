import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useDialog } from '@/hooks/useDialog.ts'
import { useDeleteInvestor } from '@/services/realestate-service.ts'
import type { Investor } from '@/services/realestate-service.ts'
import toastService from '@/services/toast-service.tsx'
import { QUERY_KEYS } from '@/constants'

export const useInvestorDelete = (onSuccess?: () => void) => {
  const { displayConfirm, displayClose, setLoading } = useDialog()
  const queryClient = useQueryClient()
  const deleteMutation = useDeleteInvestor()

  const openDeleteDialog = useCallback(
    (investor: Investor) => {
      displayConfirm({
        title: 'Xoá chủ đầu tư',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{investor.name}</b> không?
            <br />
            Thao tác này không thể hoàn tác.
          </div>
        ),
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteMutation.mutateAsync(investor.id)
            toastService.success('Xoá chủ đầu tư thành công')
            await queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.REALESTATE.INVESTORS.LIST({}),
            })
            displayClose()
            onSuccess?.()
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayClose, deleteMutation, displayConfirm, queryClient, onSuccess]
  )

  return {
    openDeleteDialog,
  }
}
