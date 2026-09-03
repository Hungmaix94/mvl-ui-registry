import { PageTitle } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import RecruitmentSourceForm from '@/features/recruitment/source/components/RecruitmentSourceForm.tsx'

const RecruitmentSourceCreatePage = () => {
  const navigate = useNavigate()

  return (
    <>
      <PageTitle enableBackButton />
      <RecruitmentSourceForm
        onSuccess={() => navigate(APP_PATH.RECRUITMENT_SOURCE)}
        onCancel={() => navigate(-1)}
      />
    </>
  )
}

export default RecruitmentSourceCreatePage
