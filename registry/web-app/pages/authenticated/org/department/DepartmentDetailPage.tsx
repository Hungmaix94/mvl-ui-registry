import { PageTitle } from '@/components/ui'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useDepartmentDetail } from '@/hooks/useDepartmentDetail.ts'
import { useDepartmentDelete } from '@/features/org/department/delete/DeleteDepartmentManagement.tsx'
import DepartmentDetail from '@/features/org/department/view-details/DepartmentDetail.tsx'

import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

const DepartmentDetailPage = () => {
  const navigate = useNavigate()

  const { department, isLoading, error, isNotFound, isError, departmentId } = useDepartmentDetail()

  const { openDeleteDialog } = useDepartmentDelete(() => {
    navigate(APP_PATH.DEPARTMENT_MANAGEMENT)
  })

  const ability = useAbility()

  const handleEdit = useCallback(() => {
    const path = APP_PATH.DEPARTMENT_MANAGEMENT_EDIT.replace(':id', departmentId.toString())
    navigate(path)
  }, [navigate, departmentId])

  const handleDelete = useCallback(() => {
    if (department) {
      openDeleteDialog(department)
    }
  }, [openDeleteDialog, department])

  const handleShowHistory = useCallback(() => {
    const path = APP_PATH.DEPARTMENT_MANAGEMENT_HISTORY.replace(':id', departmentId.toString())
    navigate(path)
  }, [navigate, departmentId])

  if (error) {
    console.log('API error, using mock data:', error)
  }

  return (
    <>
      <PageTitle
        idLabel={department?.name}
        enableBackButton
        title={department?.name || undefined}
        handleEdit={ability.can('update', 'department') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'department') ? handleDelete : undefined}
        handleShowHistory={ability.can('histories', 'department') ? handleShowHistory : undefined}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'department')}
      >
        {department ? <DepartmentDetail department={department} /> : null}
      </DetailPageWrapper>
    </>
  )
}

export default DepartmentDetailPage
