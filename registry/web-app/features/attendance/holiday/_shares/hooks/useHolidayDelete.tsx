import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '@/hooks/useDialog.ts'
import { type Holiday, useDeleteHoliday } from '@/features/attendance/services/holiday-service'
import toastService from '@/services/toast-service.tsx'
import { QUERY_KEYS } from '@/constants'

export const useHolidayDelete = (onSuccess?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const queryClient = useQueryClient()
  const deleteHolidayMutation = useDeleteHoliday()

  const openDeleteDialog = useCallback(
    (holiday: Holiday) => {
      displayConfirm({
        title: 'Xoá ngày lễ',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc chắn muốn xóa ngày lễ <b className="text-content-dark-2">{holiday.name}</b>{' '}
            không?
          </div>
        ),
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteHolidayMutation.mutateAsync(holiday.id)
            toastService.success('Đã xóa ngày lễ thành công')

            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.HOLIDAYS.LIST({}) })

            // Call onSuccess callback if provided
            if (onSuccess) {
              onSuccess()
            }
          } catch {
            // Error toast is handled by service layer
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayConfirm, setLoading, deleteHolidayMutation, queryClient, onSuccess]
  )

  return {
    openDeleteDialog,
  }
}
