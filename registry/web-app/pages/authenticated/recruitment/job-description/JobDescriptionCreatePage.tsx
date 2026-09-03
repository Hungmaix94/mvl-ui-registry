import { PageTitle } from '@/components/ui'
import JobDescriptionCreateForm from '@/features/recruitment/job-description/create/JobDescriptionCreateForm.tsx'
import { APP_PATH } from '@/routes'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import type { JobDescription } from '@/features/recruitment/services/job-description-service'

type LocationState = {
  copyFrom?: JobDescription
}

const JobDescriptionCreatePage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null

  const isCopyMode = !!state?.copyFrom
  const copyFromJobDescription = state?.copyFrom

  const pageTitle = useMemo(() => {
    if (isCopyMode && copyFromJobDescription) {
      return `Sao chép ${copyFromJobDescription.title || copyFromJobDescription.code || ''}`
    }
    return undefined // Default title will be used
  }, [isCopyMode, copyFromJobDescription])

  return (
    <>
      {/* Page Header using PageTitle component */}
      <PageTitle enableBackButton title={pageTitle} />

      {/* Form Content */}
      <JobDescriptionCreateForm
        initialData={copyFromJobDescription}
        isCopyMode={isCopyMode}
        onSuccess={() => {
          // Normal create mode - navigate to list
          navigate(APP_PATH.RECRUITMENT_JOB_DESCRIPTION)
        }}
        onCancel={() => navigate(-1)}
      />
    </>
  )
}

export default JobDescriptionCreatePage
