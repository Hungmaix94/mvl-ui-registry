import { useParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { useInterviewSchedule } from '@/features/recruitment/services/interview-service'
import { APP_PATH } from '@/routes'
import InterviewScheduleDetail from '@/features/recruitment/interview-schedule/view-details/InterviewScheduleDetail.tsx'
import CandidateTable from '@/features/recruitment/interview-schedule/_shares/components/candidate/CandidateTable.tsx'
import InterviewerTable from '@/features/recruitment/interview-schedule/_shares/components/interviewer/InterviewerTable.tsx'
import { useInterviewScheduleDelete } from '@/features/recruitment/interview-schedule/_shares/hooks/useInterviewScheduleDelete.tsx'
import { useCallback, useMemo } from 'react'
import { isNotFoundError } from '@/utils/error-utils'

import { useAbility } from '@/lib/ability.ts'
import { useInterviewInviteDialog } from '@/features/recruitment/interview-schedule'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

const InterviewScheduleDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ability = useAbility()

  const { data: scheduleResponse, isLoading, error } = useInterviewSchedule(Number(id))
  const { openDeleteDialog } = useInterviewScheduleDelete(() => {
    navigate(APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE)
  })
  const { openInterviewInviteDialog } = useInterviewInviteDialog()

  const handleEdit = useCallback(() => {
    navigate(APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_EDIT.replace(':id', id!))
  }, [navigate, id])

  const handleDelete = useCallback(() => {
    if (scheduleResponse) {
      openDeleteDialog(scheduleResponse)
    }
  }, [openDeleteDialog, scheduleResponse])

  const canSendInterviewInvite =
    ability.can('interview_invite_preview', 'interview_schedule') &&
    ability.can('interview_invite_send', 'interview_schedule')

  const handleEmail = useCallback(() => {
    if (!scheduleResponse || !canSendInterviewInvite) {
      return
    }
    openInterviewInviteDialog(scheduleResponse)
  }, [scheduleResponse, openInterviewInviteDialog])

  const handleShowHistory = useCallback(() => {
    if (id) {
      const path = APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_HISTORY.replace(':id', id.toString())
      navigate(path)
    }
  }, [navigate, id])

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !scheduleResponse
  }, [isLoading, error, scheduleResponse])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const schedule = scheduleResponse

  return (
    <>
      <PageTitle
        enableBackButton
        title={schedule?.title}
        handleMail={canSendInterviewInvite ? handleEmail : undefined}
        handleShowHistory={
          ability.can('histories', 'interview_schedule') ? handleShowHistory : undefined
        }
        handleDelete={ability.can('destroy', 'interview_schedule') ? handleDelete : undefined}
        handleEdit={ability.can('update', 'interview_schedule') ? handleEdit : undefined}
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'interview_schedule')}
      >
        <div className="flex w-full flex-col items-center gap-9 px-10 py-0 pb-[130px]">
          {schedule && <InterviewScheduleDetail schedule={schedule} />}

          {schedule && ability.can('retrieve', 'interview_candidate') && (
            <>
              <hr className="border-border-1 w-full" />
              <CandidateTable schedule={schedule} />
            </>
          )}

          {schedule && ability.can('retrieve', 'interview_schedule') && (
            <>
              <hr className="border-border-1 w-full" />
              <InterviewerTable interviewers={schedule.interviewers} schedule={schedule} />
            </>
          )}
        </div>
      </DetailPageWrapper>
    </>
  )
}

export default InterviewScheduleDetailPage
