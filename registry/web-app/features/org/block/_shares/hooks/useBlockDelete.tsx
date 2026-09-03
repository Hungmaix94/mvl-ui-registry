import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useDialog } from '@/hooks/useDialog.ts'
import { useDeleteBlock, type Block } from '@/features/org/services/block-service'
import toastService from '@/services/toast-service.tsx'
import { QUERY_KEYS } from '@/constants'

export const useBlockDelete = (onSuccess?: () => void) => {
  const { displayConfirm, displayClose, setLoading } = useDialog()
  const queryClient = useQueryClient()
  const deleteMutation = useDeleteBlock()

  const openDeleteDialog = useCallback(
    (block: Block) => {
      displayConfirm({
        title: 'Xoá khối',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{block.name}</b> không?
            <br />
            Thao tác này không thể hoàn tác.
          </div>
        ),
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteMutation.mutateAsync(block.id)
            toastService.success('Xoá khối thành công')
            await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.BLOCKS.ALL })
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
    [displayClose, deleteMutation, displayConfirm, queryClient]
  )

  return {
    openDeleteDialog,
  }
}
