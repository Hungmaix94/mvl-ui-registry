import { PageTitle } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import RecruitmentChannelCreateForm from '@/features/recruitment/channel/create/RecruitmentChannelCreateForm.tsx'
import { APP_PATH } from '@/routes'

const RecruitmentChannelCreatePage = () => {
  const navigate = useNavigate()

  return (
    <>
      <PageTitle enableBackButton />

      <RecruitmentChannelCreateForm
        onSuccess={() => navigate(APP_PATH.RECRUITMENT_CHANNEL)}
        onCancel={() => navigate(-1)}
      />
    </>
  )
}

export default RecruitmentChannelCreatePage
