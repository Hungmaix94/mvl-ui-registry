import { useCallback, useEffect, useRef } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useCreateAttendanceExemption } from '@/features/attendance/services/attendance-exemption-service'
import toastService from '@/services/toast-service.tsx'
import { QUERY_KEYS } from '@/constants'
import { useQueryClient } from '@tanstack/react-query'
import {
  AttendanceExemptionForm,
  type AttendanceExemptionFormRef,
} from '../components/AttendanceExemptionForm.tsx'
import { formatDateToApi } from '@/utils/date-utils.ts'
import type { AttendanceExemptionRequest } from '@/features/attendance/services/attendance-exemption-service'
import { handleApiError } from '@/utils/error-utils.ts'

export const useAttendanceExemptionCreate = () => {
  const ref = useRef<AttendanceExemptionFormRef>(null)
  const { displayFormContent, displayClose, setLoading } = useDialog()
  const createMutation = useCreateAttendanceExemption()
  const queryClient = useQueryClient()

  useEffect(() => {
    setLoading(createMutation.isPending)
  }, [createMutation.isPending, setLoading])

  const openCreateDialog = useCallback(() => {
    displayFormContent({
      title: 'Thêm nhân viên miễn chấm công',
      content: (
        <AttendanceExemptionForm
          ref={ref}
          onSubmit={async (data) => {
            try {
              const requestData: AttendanceExemptionRequest = {
                employee_id: data.employee_id,
                effective_date: data.effective_date ? formatDateToApi(data.effective_date) : null,
                notes: data.notes || undefined,
              }

              await createMutation.mutateAsync(requestData)
              toastService.success('Thêm nhân viên miễn chấm công thành công')
              await queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.HRM.ATTENDANCE_EXEMPTIONS.ALL(),
              })
              displayClose()
            } catch (error: any) {
              handleApiError(error)

              // Throw error to prevent dialog from closing
              const apiError: any = new Error('API Error')
              apiError.isApiError = true
              throw apiError
            }
          }}
        />
      ),
      cancelText: 'Huỷ',
      onCancel: () => {
        displayClose()
      },
      confirmText: 'Thêm',
      onConfirm: async () => {
        await ref.current?.handleFormSubmit()
      },
      footerFlexJustify: 'end',
    })
  }, [displayFormContent, displayClose, createMutation, queryClient])

  return {
    openCreateDialog,
    isCreating: createMutation.isPending,
  }
}
