import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteAttendanceDevice,
  type AttendanceDevice,
} from '@/features/attendance/services/attendance-device-service'
import toastService from '@/services/toast-service.tsx'
import { QUERY_KEYS } from '@/constants'

export const useAttendanceDeviceDelete = (onSuccess?: () => void) => {
  const { displayConfirm, displayClose, setLoading } = useDialog()
  const queryClient = useQueryClient()
  const deleteMutation = useDeleteAttendanceDevice()

  const openDeleteDialog = useCallback(
    (device: AttendanceDevice) => {
      displayConfirm({
        title: 'Xoá máy chấm công',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn xoá{' '}
            <b className="typo-body-lg-regular text-content-dark-2">{device.name}</b> không?
            <br />
            Thao tác này không thể hoàn tác.
          </div>
        ),
        onConfirm: async () => {
          try {
            setLoading(true)
            await deleteMutation.mutateAsync(device.id)
            toastService.success('Xoá thiết bị chấm công thành công')
            await queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.HRM.ATTENDANCE_DEVICES.LIST({}),
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
    [displayClose, deleteMutation, displayConfirm, queryClient, setLoading, onSuccess]
  )

  return {
    openDeleteDialog,
  }
}
