import { useCallback } from 'react'
import { InterviewerForm } from '@/features/recruitment/interview-schedule/_shares/components/interviewer/InterviewerForm.tsx'
import type { InterviewSchedule } from '@/features/recruitment/services/interview-service'
import { useDialog } from '@/hooks/useDialog.ts'

export function useInterviewerDialogAdd() {
  const { displayFormContent } = useDialog()

  const openAddInterviewerDialog = useCallback(
    (schedule: InterviewSchedule) => {
      displayFormContent({
        size: 'lg',
        title: 'Thêm người phỏng vấn',
        content: <InterviewerForm schedule={schedule} mode="add" />,
        hideFooter: true,
        dialogContentClassName: 'p-0',
      })
    },
    [displayFormContent]
  )

  return {
    openAddInterviewerDialog,
  }
}
