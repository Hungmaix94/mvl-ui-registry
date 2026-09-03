import { PageTitle } from '@/components/ui'
import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import RelationDetailView from '@/features/employee/relation/view-details/RelationDetailView.tsx'
import { useEmployeeRelationship } from '@/features/employee/services/employee-relationship-service'
import { useRelationDelete } from '@/features/employee/relation/_shares/hooks/useRelationDelete.tsx'
import { isNotFoundError } from '@/utils/error-utils'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

import { useAbility } from '@/lib/ability.ts'

const EmployeeRelationDetailPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const relationId = Number(id)
  const ability = useAbility()

  // Fetch employee relationship data
  const { data: relation, isLoading, error } = useEmployeeRelationship(relationId)

  // Navigate back after successful delete
  const handleDeleteSuccess = useCallback(() => {
    navigate(APP_PATH.EMPLOYEE_RELATION)
  }, [navigate])

  // Use relation delete hook with success callback
  const { openDeleteDialog } = useRelationDelete(handleDeleteSuccess)

  // Determine if relation was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !relation
  }, [isLoading, error, relation])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const handleEdit = useCallback(() => {
    if (relationId) {
      const path = APP_PATH.EMPLOYEE_RELATION_EDIT.replace(':id', relationId.toString())
      navigate(path)
    }
  }, [navigate, relationId])

  const handleDelete = useCallback(() => {
    if (relation) {
      openDeleteDialog(relation)
    }
  }, [openDeleteDialog, relation])

  const handleShowHistory = useCallback(() => {
    if (id) {
      const path = APP_PATH.EMPLOYEE_RELATION_HISTORY.replace(':id', id.toString())
      navigate(path)
    }
  }, [navigate, id])

  // Dynamic title: "Quan hệ nhân thân {relative_name}"
  const pageTitle = relation ? `Quan hệ nhân thân ${relation.relative_name}` : undefined

  return (
    <>
      <PageTitle
        enableBackButton
        title={pageTitle}
        handleEdit={ability.can('update', 'employee_relationship') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'employee_relationship') ? handleDelete : undefined}
        handleShowHistory={
          ability.can('histories', 'employee_relationship') ? handleShowHistory : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'employee_relationship')}
      >
        {relation && <RelationDetailView relation={relation} />}
      </DetailPageWrapper>
    </>
  )
}

export default EmployeeRelationDetailPage
