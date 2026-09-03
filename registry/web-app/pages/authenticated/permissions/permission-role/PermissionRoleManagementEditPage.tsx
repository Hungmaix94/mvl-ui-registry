import { PageTitle } from '@/components/ui'
import { useRoleDetail } from '@/hooks/useRoleDetail.ts'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import RoleEditForm from '@/features/permissions/permission-role/update/RoleEditForm.tsx'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import type { RoleEditFormData } from '@/features/permissions/permission-role/_shares/schemas/role-schema.ts'
import { useEffect } from 'react'

const extractScopeIds = (scopes: unknown): number[] => {
  if (!scopes) return []
  if (Array.isArray(scopes))
    return scopes
      .map((s) =>
        typeof s === 'object' && s !== null && 'id' in s ? Number((s as { id: number }).id) : NaN
      )
      .filter((n) => Number.isFinite(n))
  if (typeof scopes === 'object' && 'id' in (scopes as object))
    return [Number((scopes as { id: number }).id)].filter(Number.isFinite)
  return []
}

type DetailLocationState = {
  /** Full list URL with query (pathname + search) — see url-driven-filter-dialog-refactor-guide.md §8 */
  from?: string
}

const PermissionRoleManagementEditPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()

  const { role, isLoading, error, isNotFound } = useRoleDetail()
  const ability = useAbility()
  const backToListTarget =
    (location.state as DetailLocationState | null)?.from ?? APP_PATH.PERMISSION_ROLE_MANAGEMENT

  useEffect(() => {
    if (!isLoading && role?.is_system_role) {
      const detailPath = APP_PATH.PERMISSION_ROLE_MANAGEMENT_DETAIL.replace(':id', id || '')
      navigate(detailPath)
    }
  }, [role, isLoading, navigate, id])

  if (error) {
    console.log('API error, using mock data:', error)
  }

  return (
    <>
      <PageTitle enableBackButton idLabel={role?.name} />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound || !role}
        hasPermission={ability.can('update', 'role')}
      >
        <RoleEditForm
          initialData={
            {
              id: role?.id,
              name: role?.name,
              description: role?.description,
              permission_ids: role?.permissions_detail
                ? role.permissions_detail.map((p) => p.id)
                : [],
              data_scope_level: role?.data_scope_level,
              branch_scope_ids: extractScopeIds(role?.branch_scopes),
              block_scope_ids: extractScopeIds(role?.block_scopes),
              department_scope_ids: extractScopeIds(role?.department_scopes),
            } as RoleEditFormData
          }
          onSuccess={() => navigate(backToListTarget)}
          onCancel={() => navigate(-1)}
        />
      </DetailPageWrapper>
    </>
  )
}

export default PermissionRoleManagementEditPage
