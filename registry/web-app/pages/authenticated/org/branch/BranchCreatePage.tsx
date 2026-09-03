import { PageTitle } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import BranchForm from '@/features/org/branch/_shares/components/BranchForm.tsx'

const BranchCreatePage = () => {
  const navigate = useNavigate()

  return (
    <>
      <PageTitle title="Tạo mới chi nhánh" currentPageBreadcrumbTitle="Tạo mới" enableBackButton />

      <BranchForm
        onSuccess={() => navigate(APP_PATH.BRANCH_MANAGEMENT)}
        onCancel={() => navigate(-1)}
      />
    </>
  )
}

export default BranchCreatePage
