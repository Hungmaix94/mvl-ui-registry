import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { InterviewScheduleEmployeeNested, useUpdateInterviewScheduleInterviewers } from '@/services'
import { useToast } from '@/hooks/useToast.ts'
import { useDialog } from '@/hooks/useDialog.ts'
import { QUERY_KEYS } from '@/constants'

export function useInterviewerDelete() {
  const { success: showSuccessToast } = useToast()
  const { displayConfirm } = useDialog()
  const updateInterviewersMutation = useUpdateInterviewScheduleInterviewers()
  const queryClient = useQueryClient()

  const deleteInterviewer = useCallback(
    async (
      scheduleId: number,
      interviewerId: number,
      currentInterviewers: InterviewScheduleEmployeeNested[]
    ) => {
      try {
        // Filter out the interviewer to be deleted
        const newInterviewerIds = currentInterviewers
          .filter((interviewer) => interviewer.id !== interviewerId)
          .map((interviewer) => interviewer.id)

        await updateInterviewersMutation.mutateAsync({
          id: scheduleId,
          data: { interviewer_ids: newInterviewerIds },
        })

        // Invalidate schedule detail query to refetch updated data
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.HRM.INTERVIEW_SCHEDULES.DETAIL(scheduleId),
        })

        showSuccessToast('Xoá người phỏng vấn thành công')
      } catch {
        // Error toast is handled by service layer
      }
    },
    [updateInterviewersMutation, queryClient, showSuccessToast]
  )

  const confirmDeleteInterviewer = useCallback(
    (
      scheduleId: number,
      interviewerId: number,
      currentInterviewers: InterviewScheduleEmployeeNested[],
      interviewerName: string
    ) => {
      displayConfirm({
        title: 'Xác nhận xoá',
        description: `Bạn có chắc chắn muốn xoá người phỏng vấn "${interviewerName}"?`,
        onConfirm: () => deleteInterviewer(scheduleId, interviewerId, currentInterviewers),
        confirmText: 'Xoá',
        cancelText: 'Huỷ',
      })
    },
    [displayConfirm, deleteInterviewer]
  )

  return {
    deleteInterviewer,
    confirmDeleteInterviewer,
  }
}
