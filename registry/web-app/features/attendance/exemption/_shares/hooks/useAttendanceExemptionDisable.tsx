import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  useDisableAttendanceExemption,
  type AttendanceExemption,
} from '@/features/attendance/services/attendance-exemption-service'
import toastService from '@/services/toast-service.tsx'
import { QUERY_KEYS } from '@/constants'
import { useQueryClient } from '@tanstack/react-query'
import { extractErrorMessage } from '@/utils/error-utils'

export const useAttendanceExemptionDisable = (onSuccessfullyDisable?: () => void) => {
  const { displayConfirm, setLoading, displayClose } = useDialog()
  const disableAttendanceExemptionMutation = useDisableAttendanceExemption()
  const queryClient = useQueryClient()

  const openDisableDialog = useCallback(
    (exemption: AttendanceExemption) => {
      displayConfirm({
        title: 'Vô hiệu hoá miễn chấm công',
        content: (
          <div className="text-content-dark-2">
            Bạn có chắc muốn vô hiệu hoá miễn chấm công cho{' '}
            <b className="typo-body-lg-regular text-content-dark-2">
              {exemption.employee.fullname} ({exemption.employee.code})
            </b>{' '}
            không?
          </div>
        ),
        confirmText: 'Vô hiệu hoá',
        cancelText: 'Huỷ',
        size: 'xl',
        onConfirm: async () => {
          try {
            setLoading(true)
            await disableAttendanceExemptionMutation.mutateAsync(exemption.id)
            toastService.success('Vô hiệu hoá miễn chấm công thành công')
            await queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.HRM.ATTENDANCE_EXEMPTIONS.ALL(),
            })
            displayClose()
            onSuccessfullyDisable?.()
          } catch (error) {
            console.error('Lỗi khi vô hiệu hoá miễn chấm công:', error)
            toastService.error(extractErrorMessage(error))
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [
      displayConfirm,
      disableAttendanceExemptionMutation,
      onSuccessfullyDisable,
      setLoading,
      queryClient,
      displayClose,
    ]
  )

  return {
    openDisableDialog,
    isDisabling: disableAttendanceExemptionMutation.isPending,
  }
}
