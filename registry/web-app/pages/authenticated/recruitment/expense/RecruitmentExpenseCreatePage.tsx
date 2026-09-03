import { PageTitle } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { RecruitmentExpenseForm } from '@/features/recruitment/cost'
import { APP_PATH } from '@/routes'

const RecruitmentExpenseCreatePage = () => {
  const navigate = useNavigate()

  return (
    <>
      <PageTitle enableBackButton />

      <RecruitmentExpenseForm
        onSuccess={() => navigate(APP_PATH.RECRUITMENT_EXPENSE)}
        onCancel={() => navigate(-1)}
      />
    </>
  )
}

export default RecruitmentExpenseCreatePage
