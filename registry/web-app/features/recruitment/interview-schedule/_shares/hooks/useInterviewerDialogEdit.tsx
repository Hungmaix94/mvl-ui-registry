import { useCallback } from 'react'
import { InterviewerForm } from '@/features/recruitment/interview-schedule/_shares/components/interviewer/InterviewerForm.tsx'
import type {
  InterviewSchedule,
  InterviewScheduleEmployeeNested,
} from '@/features/recruitment/services/interview-service'
import { useDialog } from '@/hooks/useDialog.ts'

export function useInterviewerDialogEdit() {
  const { displayFormContent } = useDialog()

  const openEditInterviewerDialog = useCallback(
    (schedule: InterviewSchedule, interviewer: InterviewScheduleEmployeeNested) => {
      // Prepare initial values for edit mode
      const initialValues = {
        branch_id: undefined, // Will be loaded from employee data
        block_id: undefined, // Will be loaded from employee data
        department_id: undefined, // Will be loaded from employee data
        employee_id: interviewer?.id,
      }

      displayFormContent({
        size: 'lg',
        title: 'Chỉnh sửa người phỏng vấn',
        content: <InterviewerForm schedule={schedule} mode="edit" initialValues={initialValues} />,
        hideFooter: true,
        dialogContentClassName: 'p-0',
      })
    },
    [displayFormContent]
  )

  return {
    openEditInterviewerDialog,
  }
}
