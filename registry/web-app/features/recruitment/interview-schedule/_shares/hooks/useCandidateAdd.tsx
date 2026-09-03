import { useCallback, useEffect, useRef } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  type InterviewSchedule,
  useCreateInterviewCandidate,
} from '@/features/recruitment/services/interview-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import toastService from '@/services/toast-service.tsx'
import CandidateForm, {
  IRefCandidateForm,
} from '@/features/recruitment/interview-schedule/_shares/components/candidate/CandidateForm.tsx'
import { extractErrorMessage } from '@/utils/error-utils'

export function useCandidateAdd() {
  const ref = useRef<IRefCandidateForm>(null)

  const { displayFormContent, displayClose, setLoading: setLoadingDialog } = useDialog()
  const createMutation = useCreateInterviewCandidate()
  const invalidateQueries = useInvalidateQueries()

  const openAddCandidateDialog = useCallback(
    (schedule: InterviewSchedule) => {
      displayFormContent({
        size: 'lg',
        title: 'Thêm ứng viên',
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

                  await createMutation.mutateAsync({
                    recruitment_candidate_id: data.recruitment_candidate_id,
                    interview_schedule_id: schedule.id,
                    interview_time: interviewDateTime.toISOString(),
                  })

                  toastService.success('Thêm ứng viên thành công')
                  await invalidateQueries.invalidateByPrefix('hrm')
                  // Close dialog after success
                  displayClose()
                } catch (error) {
                  console.error('Error adding candidate:', error)
                  toastService.error(extractErrorMessage(error))
                }
              }}
            />
          </>
        ),
        cancelText: 'Hủy',
        onCancel: () => {
          displayClose()
        },
        confirmText: 'Thêm',
        onConfirm: () => ref?.current?.handleFormSubmit(),
        footerFlexJustify: 'end',
      })
    },
    [displayFormContent, createMutation, invalidateQueries, displayClose]
  )

  useEffect(() => {
    setLoadingDialog(createMutation.isPending)
  }, [createMutation.isPending, setLoadingDialog])

  return {
    openAddCandidateDialog,
  }
}
