import RoleDetailWrapper from '@/features/permissions/permission-role/view-details/RoleDetailWrapper.tsx'
import { PageTitle } from '@/components/ui'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useRoleDetail } from '@/hooks/useRoleDetail.ts'
import { usePermissionRoleDelete } from '@/features/permissions/permission-role/_shares/hooks/usePermissionRoleDelete.tsx'

import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

const PermissionRoleManagementDetailPage = () => {
  const navigate = useNavigate()

  const { role, isLoading, error, isNotFound, isError, roleId } = useRoleDetail()

  const { openDeleteDialog } = usePermissionRoleDelete(() => {
    navigate(APP_PATH.PERMISSION_ROLE_MANAGEMENT)

    console.log('triggered')
  })

  const ability = useAbility()

  const handleEdit = useCallback(() => {
    const path = APP_PATH.PERMISSION_ROLE_MANAGEMENT_EDIT.replace(':id', roleId.toString())
    navigate(path)
  }, [navigate, roleId])

  const handleDelete = useCallback(() => {
    console.log(role)
    if (role) {
      openDeleteDialog(role)
    }
  }, [openDeleteDialog, role])

  const handleShowHistory = useCallback(() => {
    const path = APP_PATH.PERMISSION_ROLE_MANAGEMENT_HISTORY.replace(':id', roleId.toString())
    navigate(path)
  }, [navigate, roleId])

  if (error) {
    console.log('API error, using mock data:', error)
  }

  return (
    <>
      <PageTitle
        idLabel={role?.name}
        enableBackButton
        title={role?.name || undefined}
        handleEdit={ability.can('update', 'role') && !role?.is_system_role ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'role') ? handleDelete : undefined}
        handleShowHistory={ability.can('histories', 'role') ? handleShowHistory : undefined}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'role')}
      >
        {role ? <RoleDetailWrapper role={role} /> : null}
      </DetailPageWrapper>
    </>
  )
}

export default PermissionRoleManagementDetailPage
