import { PageTitle } from '@/components/ui'
import { useLocation, useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import RoleCreateForm from '@/features/permissions/permission-role/create/RoleCreateForm.tsx'

type DetailLocationState = {
  from?: string
}

const PermissionRoleManagementCreatePage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const backToListTarget =
    (location.state as DetailLocationState | null)?.from ?? APP_PATH.PERMISSION_ROLE_MANAGEMENT

  return (
    <>
      <PageTitle
        title={'Tạo mới vai trò'}
        currentPageBreadcrumbTitle={'Tạo mới'}
        enableBackButton
      />

      <RoleCreateForm onSuccess={() => navigate(backToListTarget)} onCancel={() => navigate(-1)} />
    </>
  )
}

export default PermissionRoleManagementCreatePage
