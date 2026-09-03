import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  type AttendanceGeolocation,
  useDeleteAttendanceGeolocation,
} from '@/features/attendance/services/attendance-geolocation-service'
import toastService from '@/services/toast-service.tsx'
import { QUERY_KEYS } from '@/constants'

export const useProjectLocationDelete = (onSuccess?: () => void) => {
  const { displayConfirm, setLoading } = useDialog()
  const queryClient = useQueryClient()
  const deleteProjectLocationMutation = useDeleteAttendanceGeolocation()

  const openDeleteDialog = useCallback(
    (projectLocation: AttendanceGeolocation) => {
      displayConfirm({
        title: 'Xác nhận xóa',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc chắn muốn xóa định vị dự án{' '}
            <b className="text-content-dark-2">{projectLocation.name}</b> không?
            <br />
            Hành động này không thể hoàn tác.
          </div>
        ),
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteProjectLocationMutation.mutateAsync(projectLocation.id)
            toastService.success('Đã xóa định vị dự án thành công')

            // Invalidate relevant queries
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.HRM.ATTENDANCE_GEOLOCATIONS.LIST({}),
            })

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
    [displayConfirm, setLoading, deleteProjectLocationMutation, queryClient, onSuccess]
  )

  return {
    openDeleteDialog,
  }
}
