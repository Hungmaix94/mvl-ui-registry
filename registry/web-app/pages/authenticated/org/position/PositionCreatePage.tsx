import { PageTitle } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import PositionForm from '@/features/org/position/_shares/components/PositionForm.tsx'

const PositionCreatePage = () => {
  const navigate = useNavigate()

  return (
    <>
      <PageTitle title="Tạo mới chức vụ" currentPageBreadcrumbTitle="Tạo mới" enableBackButton />

      <PositionForm
        onSuccess={() => navigate(APP_PATH.POSITION_MANAGEMENT)}
        onCancel={() => navigate(-1)}
      />
    </>
  )
}

export default PositionCreatePage
