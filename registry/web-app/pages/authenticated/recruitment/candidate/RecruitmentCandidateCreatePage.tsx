import { PageTitle } from '@/components/ui'
import { RecruitmentCandidateForm } from '@/features/recruitment/candidate/_shares/components'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'

const RecruitmentCandidateCreatePage = () => {
  const navigate = useNavigate()

  return (
    <>
      {/* Page Header using PageTitle component */}
      <PageTitle enableBackButton />

      {/* Form Content */}
      <RecruitmentCandidateForm
        mode="create"
        onSuccess={() => navigate(APP_PATH.RECRUITMENT_CANDIDATE)}
        onCancel={() => navigate(-1)}
      />
    </>
  )
}

export default RecruitmentCandidateCreatePage
