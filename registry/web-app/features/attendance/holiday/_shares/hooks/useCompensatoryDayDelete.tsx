import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '@/hooks/useDialog.ts'
import { useDeleteCompensatoryWorkday } from '@/features/attendance/services/holiday-service'
import { QUERY_KEYS } from '@/constants/query-keys.ts'
import toastService from '@/services/toast-service.tsx'

export const useCompensatoryDayDelete = (holidayId: number) => {
  const queryClient = useQueryClient()
  const { displayConfirm, setLoading } = useDialog()
  const deleteCompensatoryWorkdayMutation = useDeleteCompensatoryWorkday()

  const openDeleteDialog = useCallback(
    (workdayId: number) => {
      displayConfirm({
        title: 'Xác nhận xóa',
        content: 'Bạn có chắc chắn muốn xóa ngày bù này không?',
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteCompensatoryWorkdayMutation.mutateAsync({ holidayId, id: workdayId })

            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.HRM.HOLIDAY_COMPENSATORY_DAYS.LIST(holidayId, {}),
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
    [displayConfirm, setLoading, deleteCompensatoryWorkdayMutation, queryClient, holidayId]
  )

  return { openDeleteDialog }
}
