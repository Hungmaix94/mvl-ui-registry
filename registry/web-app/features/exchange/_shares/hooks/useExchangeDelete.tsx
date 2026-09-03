import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useDialog } from '@/hooks/useDialog.ts'
import { useDeleteExchange, useDeleteSourceExchange } from '@/services/realestate-service.ts'
import type { Exchange } from '@/services/realestate-service.ts'
import toastService from '@/services/toast-service.tsx'
import { QUERY_KEYS } from '@/constants'

export const useExchangeDelete = (type: 'f2' | 'f0' = 'f2', onSuccess?: () => void) => {
  const { displayConfirm, displayClose, setLoading } = useDialog()
  const queryClient = useQueryClient()
  const deleteF2 = useDeleteExchange()
  const deleteF0 = useDeleteSourceExchange()

  const deleteMutation = type === 'f0' ? deleteF0 : deleteF2

  const openDeleteDialog = useCallback(
    (exchange: Exchange) => {
      displayConfirm({
        title: type === 'f0' ? 'Xoá nguồn sàn' : 'Xoá sàn liên kết',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{exchange.name}</b> không?
            <br />
            Thao tác này không thể hoàn tác.
          </div>
        ),
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteMutation.mutateAsync(exchange.id)
            toastService.success(
              type === 'f0' ? 'Xoá nguồn sàn thành công' : 'Xoá sàn liên kết thành công'
            )
            await queryClient.invalidateQueries({
              queryKey:
                type === 'f0'
                  ? QUERY_KEYS.REALESTATE.SOURCE_EXCHANGES.LIST({})
                  : QUERY_KEYS.REALESTATE.EXCHANGES.LIST({}),
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
    [displayClose, deleteMutation, displayConfirm, queryClient, onSuccess, type]
  )

  return {
    openDeleteDialog,
  }
}
