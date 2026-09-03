import { PageTitle } from '@/components/ui'
import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import DependentDetailView from '@/features/employee/dependent/view-details/DependentDetailView.tsx'
import { useEmployeeDependent } from '@/features/employee/services/employee-dependent-service'
import { useDependentDelete } from '@/features/employee/dependent/_shares/hooks/useDependentDelete.tsx'
import { isNotFoundError } from '@/utils/error-utils'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

import { useAbility } from '@/lib/ability.ts'

const EmployeeDependentDetailPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { state } = useLocation()
  const dependentId = Number(id)
  const ability = useAbility()

  // Fetch employee dependent data
  const { data: dependent, isLoading, error } = useEmployeeDependent(dependentId)

  // Navigate back after successful delete
  const handleDeleteSuccess = useCallback(() => {
    // Check if we came from employee detail page
    const fromEmployeeId = (state as any)?.fromEmployeeDetail
    if (fromEmployeeId) {
      // Navigate back to employee detail page with dependent tab
      navigate(
        APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(fromEmployeeId)) +
          '?tab=dependent'
      )
    } else {
      // Navigate to dependent list page
      navigate(APP_PATH.EMPLOYEE_DEPENDENT)
    }
  }, [navigate, state])

  // Use dependent delete hook with success callback
  const { openDeleteDialog } = useDependentDelete(handleDeleteSuccess)

  // Determine if dependent was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !dependent
  }, [isLoading, error, dependent])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  const handleEdit = useCallback(() => {
    if (dependentId) {
      const path = APP_PATH.EMPLOYEE_DEPENDENT_EDIT.replace(':id', dependentId.toString())
      navigate(path)
    }
  }, [navigate, dependentId])

  const handleDelete = useCallback(() => {
    if (dependent) {
      openDeleteDialog(dependent)
    }
  }, [openDeleteDialog, dependent])

  const handleShowHistory = useCallback(() => {
    if (id) {
      const path = APP_PATH.EMPLOYEE_DEPENDENT_HISTORY.replace(':id', id.toString())
      navigate(path)
    }
  }, [navigate, id])

  // Dynamic title: "Người phụ thuộc {dependent_name}"
  const pageTitle = dependent ? `${dependent.dependent_name}` : undefined

  return (
    <>
      <PageTitle
        enableBackButton
        title={pageTitle}
        handleEdit={ability.can('update', 'employee_dependent') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'employee_dependent') ? handleDelete : undefined}
        handleShowHistory={
          ability.can('histories', 'employee_dependent') ? handleShowHistory : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'employee_dependent')}
      >
        {dependent && <DependentDetailView dependent={dependent} />}
      </DetailPageWrapper>
    </>
  )
}

export default EmployeeDependentDetailPage
