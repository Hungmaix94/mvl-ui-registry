import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { useToast } from '@/hooks/useToast.ts'
import {
  useSendInterviewInvite,
  type InterviewSchedule,
  type InterviewInviteSendRequest,
} from '@/features/recruitment/services/interview-service'
import InterviewInviteDialog from '@/features/recruitment/interview-schedule/_shares/components/interview-invite/InterviewInviteDialog.tsx'
import { extractErrorMessage } from '@/utils/error-utils'

export function useInterviewInviteDialog() {
  const { displayCustom, displayClose, setLoading } = useDialog()
  const { success: showSuccessToast, error: showErrorToast } = useToast()
  const sendMutation = useSendInterviewInvite()

  const openInterviewInviteDialog = useCallback(
    (schedule: InterviewSchedule) => {
      const handleSendEmail = async (payload: { candidateIds: number[]; subject?: string }) => {
        try {
          setLoading(true)
          await sendMutation.mutateAsync({
            id: schedule.id,
            data: {
              candidate_ids: payload.candidateIds,
              subject: payload.subject,
            } as InterviewInviteSendRequest,
          })
          showSuccessToast('Gửi mail thành công')
          displayClose()
        } catch (error: unknown) {
          showErrorToast(extractErrorMessage(error, 'Không thể gửi email cho ứng viên'))
        } finally {
          setLoading(false)
        }
      }

      displayCustom({
        size: '2xl',
        title: 'Gửi email ứng viên',
        scrollable: true,
        hideFooter: true,
        dialogContentClassName: 'p-0',
        content: (
          <InterviewInviteDialog
            schedule={schedule}
            onCancel={displayClose}
            onSend={handleSendEmail}
          />
        ),
      })
    },
    [displayClose, displayCustom, sendMutation, setLoading, showErrorToast, showSuccessToast]
  )

  return {
    openInterviewInviteDialog,
  }
}
