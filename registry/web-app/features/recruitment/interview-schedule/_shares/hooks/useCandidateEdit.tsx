import { useCallback, useEffect, useRef } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  type InterviewCandidate,
  type InterviewSchedule,
  useUpdateInterviewCandidate,
} from '@/features/recruitment/services/interview-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import CandidateForm, {
  IRefCandidateForm,
} from '@/features/recruitment/interview-schedule/_shares/components/candidate/CandidateForm.tsx'
import { extractErrorMessage } from '@/utils/error-utils'

export function useCandidateEdit() {
  const ref = useRef<IRefCandidateForm>(null)

  const { displayFormContent, displayClose, setLoading: setLoadingDialog } = useDialog()
  const updateMutation = useUpdateInterviewCandidate()
  const invalidateQueries = useInvalidateQueries()

  const openEditCandidateDialog = useCallback(
    (schedule: InterviewSchedule, candidate: InterviewCandidate) => {
      displayFormContent({
        size: 'lg',
        title: 'Chỉnh sửa ứng viên',
        content: (
          <>
            <CandidateForm
              ref={ref}
              onSubmit={async (data) => {
                try {
                  // Combine schedule.time (date) with selected time (HH:MM)
                  const scheduleDate = new Date(schedule.time)
                  const [hours, minutes] = data.interview_time.split(':').map(Number)

                  // Create new date with schedule date but selected time
                  const interviewDateTime = new Date(
                    scheduleDate.getFullYear(),
                    scheduleDate.getMonth(),
                    scheduleDate.getDate(),
                    hours,
                    minutes
                  )

                  await updateMutation.mutateAsync({
                    id: candidate.id,
                    data: {
                      recruitment_candidate_id: data.recruitment_candidate_id,
                      interview_schedule_id: schedule.id,
                      interview_time: interviewDateTime.toISOString(),
                    },
                  })

                  toastService.success('Cập nhật ứng viên thành công')
                  await invalidateQueries.invalidateByPrefix('hrm')
                  // Close dialog after success
                  displayClose()
                } catch (error) {
                  console.error('Error updating candidate:', error)
                  toastService.error(extractErrorMessage(error))
                }
              }}
              initialData={{
                recruitment_candidate_id: candidate.recruitment_candidate?.id,
                interview_time: candidate.interview_time
                  ? new Date(candidate.interview_time).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })
                  : '08:00',
              }}
            />
          </>
        ),
        cancelText: 'Hủy',
        onCancel: () => {
          displayClose()
        },
        confirmText: 'Cập nhật',
        onConfirm: () => ref?.current?.handleFormSubmit(),
        footerFlexJustify: 'end',
      })
    },
    [displayFormContent, updateMutation, invalidateQueries, displayClose]
  )

  useEffect(() => {
    setLoadingDialog(updateMutation.isPending)
  }, [updateMutation.isPending])

  return {
    openEditCandidateDialog,
  }
}
