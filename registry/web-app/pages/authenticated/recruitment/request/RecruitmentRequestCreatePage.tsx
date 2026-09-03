import { PageTitle } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import RecruitmentRequestCreateForm from '@/features/recruitment/request/create/RecruitmentRequestCreateForm.tsx'

const RecruitmentRequestCreatePage = () => {
  const navigate = useNavigate()

  return (
    <>
      <PageTitle enableBackButton />

      <RecruitmentRequestCreateForm
        onSuccess={() => navigate(APP_PATH.RECRUITMENT_REQUEST)}
        onCancel={() => navigate(-1)}
      />
    </>
  )
}

export default RecruitmentRequestCreatePage
