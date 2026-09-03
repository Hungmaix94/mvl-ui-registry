import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDeleteAttendanceWifiDevice,
  type AttendanceWifiDevice,
} from '@/features/attendance/services/attendance-wifi-service'
import toastService from '@/services/toast-service.tsx'
import { QUERY_KEYS } from '@/constants'

export const useWifiAttendanceDeviceDelete = (onSuccess?: () => void) => {
  const { displayConfirm, displayClose, setLoading } = useDialog()
  const queryClient = useQueryClient()
  const deleteMutation = useDeleteAttendanceWifiDevice()

  const openDeleteDialog = useCallback(
    (device: AttendanceWifiDevice) => {
      displayConfirm({
        title: 'Xoá wifi chấm công',
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
            toastService.success('Xoá wifi chấm công thành công')
            await queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.HRM.WIFI_ATTENDANCE_DEVICES.LIST({}),
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

  return { openDeleteDialog }
}

export default useWifiAttendanceDeviceDelete
