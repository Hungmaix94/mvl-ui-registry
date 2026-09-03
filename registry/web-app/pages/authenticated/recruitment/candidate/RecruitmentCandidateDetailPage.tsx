import { useNavigate, useParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import {
  useDeleteRecruitmentCandidate,
  useRecruitmentCandidate,
} from '@/features/recruitment/services/recruitment-candidate-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { APP_PATH } from '@/routes'
import toastService from '@/services/toast-service.tsx'
import RecruitmentCandidateDetail from '@/features/recruitment/candidate/view-details/RecruitmentCandidateDetail.tsx'
import ReferrerTable from '@/features/recruitment/candidate/_shares/components/referrer/ReferrerTable.tsx'
import ContactPersonTable from '@/features/recruitment/candidate/_shares/components/contact-person/ContactPersonTable.tsx'
import InterviewLogTable from '@/features/recruitment/candidate/_shares/components/interview-log/InterviewLogTable.tsx'
import { useRecruitmentCandidateConvert } from '@/features/recruitment/candidate/_shares/hooks'
import { useCallback, useMemo } from 'react'
import { isNotFoundError, extractErrorMessage } from '@/utils/error-utils'

import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

const RecruitmentCandidateDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const invalidateQueries = useInvalidateQueries()
  const deleteCandidateMutation = useDeleteRecruitmentCandidate()

  const ability = useAbility()

  const { data: recruitmentCandidate, isLoading, error } = useRecruitmentCandidate(Number(id))

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !recruitmentCandidate
  }, [isLoading, error, recruitmentCandidate])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const { openConvertDialog } = useRecruitmentCandidateConvert(Number(id))

  const handleShowHistory = useCallback(() => {
    if (id) {
      const path = APP_PATH.RECRUITMENT_CANDIDATE_HISTORY.replace(':id', id.toString())
      navigate(path)
    }
  }, [navigate, id])

  const handleConvertCandidateToEmployee = () => {
    openConvertDialog()
  }

  const handleDelete = async () => {
    if (!recruitmentCandidate?.id) return

    try {
      await deleteCandidateMutation.mutateAsync(recruitmentCandidate.id)
      toastService.success('Xóa ứng viên thành công!')
      await invalidateQueries.invalidateByPrefix('hrm/recruitment-candidates')
      navigate(APP_PATH.RECRUITMENT_CANDIDATE)
    } catch (error: unknown) {
      console.error('Error deleting recruitment candidate:', error)
      toastService.error(extractErrorMessage(error, 'Có lỗi xảy ra khi xóa ứng viên.'))
    }
  }

  const handleEdit = () => {
    navigate(APP_PATH.RECRUITMENT_CANDIDATE_EDIT.replace(':id', id!))
  }

  return (
    <>
      {/* Page Header using PageTitle component */}
      <PageTitle
        enableBackButton
        title={
          recruitmentCandidate
            ? `${recruitmentCandidate.code} - ${recruitmentCandidate.name}`
            : undefined
        }
        idLabel={recruitmentCandidate?.name}
        titleConvert={'Chuyển thành nhân viên'}
        handleConvert={
          ability.can('to_employee', 'recruitment_candidate') &&
          recruitmentCandidate &&
          !recruitmentCandidate.is_employee_created
            ? handleConvertCandidateToEmployee
            : undefined
        }
        handleShowHistory={
          ability.can('histories', 'recruitment_candidate') ? handleShowHistory : undefined
        }
        handleDelete={
          ability.can('destroy', 'recruitment_candidate') &&
          (recruitmentCandidate?.colored_status?.value || '').toUpperCase() === 'REJECTED'
            ? handleDelete
            : undefined
        }
        handleEdit={ability.can('update', 'recruitment_candidate') ? handleEdit : undefined}
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'recruitment_candidate')}
      >
        {/* Content */}
        <div className="flex w-full flex-col items-center gap-9 px-10 py-0 pb-[130px]">
          {recruitmentCandidate && <RecruitmentCandidateDetail candidate={recruitmentCandidate} />}

          {recruitmentCandidate && (
            <div className="flex w-full flex-col gap-9">
              {ability.can('retrieve', 'recruitment_candidate') && (
                <>
                  <hr className="border-border-1 w-full" />
                  <ReferrerTable candidate={recruitmentCandidate} />
                  <hr className="border-border-1 w-full" />
                  <ContactPersonTable candidate={recruitmentCandidate} />
                </>
              )}

              {ability.can('list', 'interview_schedule') && (
                <>
                  <hr className="border-border-1 w-full" />
                  <InterviewLogTable candidateId={recruitmentCandidate.id} />
                </>
              )}
            </div>
          )}
        </div>
      </DetailPageWrapper>
    </>
  )
}

export default RecruitmentCandidateDetailPage
