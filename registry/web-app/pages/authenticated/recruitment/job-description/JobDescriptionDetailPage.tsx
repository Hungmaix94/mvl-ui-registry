import { useNavigate, useParams } from 'react-router-dom'
import { useJobDescription, useJobDescriptionDelete } from '@/features/recruitment/job-description'
import { APP_PATH } from '@/routes'
import PageTitle from '@/components/ui/page-title/PageTitle.tsx'
import JobDescriptionDetail from '@/features/recruitment/job-description/view-details/JobDescriptionDetail.tsx'
import { useCallback, useMemo } from 'react'
import { isNotFoundError } from '@/utils/error-utils'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

import { useAbility } from '@/lib/ability.ts'

const JobDescriptionDetailPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { id } = useParams<{ id: string }>()
  const { data: jobDescription, isLoading, error } = useJobDescription(Number(id))

  const { openDeleteDialog } = useJobDescriptionDelete()

  // Determine if job description was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !jobDescription
  }, [isLoading, error, jobDescription])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const handleEdit = () => {
    if (jobDescription) {
      navigate(
        `${APP_PATH.RECRUITMENT_JOB_DESCRIPTION_EDIT.replace(':id', String(jobDescription.id))}`
      )
    }
  }

  const handleCopy = () => {
    if (!jobDescription) return

    // Navigate to create page with initial data for copying
    navigate(APP_PATH.RECRUITMENT_JOB_DESCRIPTION_CREATE, {
      state: {
        copyFrom: jobDescription,
      },
    })
  }

  const handleDelete = () => {
    if (jobDescription) {
      openDeleteDialog(jobDescription)
    }
  }

  const handleShowHistory = useCallback(() => {
    if (jobDescription) {
      const path = APP_PATH.RECRUITMENT_JOB_DESCRIPTION_HISTORY.replace(
        ':id',
        jobDescription.id.toString()
      )
      navigate(path)
    }
  }, [navigate, jobDescription])

  return (
    <>
      <PageTitle
        title={jobDescription ? `Mô tả công việc ${jobDescription.code}` : undefined}
        idLabel={jobDescription?.title}
        enableBackButton
        handleCopy={ability.can('create', 'job_description') ? handleCopy : undefined}
        handleDelete={ability.can('destroy', 'job_description') ? handleDelete : undefined}
        handleEdit={ability.can('update', 'job_description') ? handleEdit : undefined}
        handleShowHistory={
          ability.can('histories', 'job_description') ? handleShowHistory : undefined
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'job_description')}
      >
        {jobDescription && (
          <div className="flex flex-col items-start gap-9 px-10">
            <JobDescriptionDetail jobDescription={jobDescription} />
          </div>
        )}
      </DetailPageWrapper>
    </>
  )
}

export default JobDescriptionDetailPage
