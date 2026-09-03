import { PageTitle } from '@/components/ui'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useProjectLocationDelete } from '@/features/attendance/project-location/_shares/hooks/useProjectLocationDelete'
import ProjectLocationDetail from '@/features/attendance/project-location/view-details/ProjectLocationDetail'

import { useAbility } from '@/lib/ability'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useProjectLocationDetail } from '@/features/attendance/project-location/_shares/hooks/useProjectLocationDetail'

const ProjectLocationDetailPage = () => {
  const navigate = useNavigate()

  const { projectLocation, isLoading, error, isNotFound, isError, projectLocationId } =
    useProjectLocationDetail()

  const { openDeleteDialog } = useProjectLocationDelete(() => {
    navigate(APP_PATH.PROJECT_LOCATION_MANAGEMENT)
  })

  const ability = useAbility()

  const handleEdit = useCallback(() => {
    const path = APP_PATH.PROJECT_LOCATION_EDIT.replace(':id', projectLocationId.toString())
    navigate(path)
  }, [navigate, projectLocationId])

  const handleDelete = useCallback(() => {
    if (projectLocation) {
      openDeleteDialog(projectLocation)
    }
  }, [openDeleteDialog, projectLocation])

  const handleShowHistory = useCallback(() => {
    const path = APP_PATH.PROJECT_LOCATION_HISTORY.replace(':id', projectLocationId.toString())
    navigate(path)
  }, [navigate, projectLocationId])

  if (error) {
    console.log('API error:', error)
  }

  return (
    <>
      <PageTitle
        idLabel={projectLocation?.name}
        enableBackButton
        title={projectLocation?.name || undefined}
        handleEdit={ability.can('update', 'attendance_geolocation') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'attendance_geolocation') ? handleDelete : undefined}
        handleShowHistory={
          ability.can('histories', 'attendance_geolocation') ? handleShowHistory : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'attendance_geolocation')}
      >
        {projectLocation ? <ProjectLocationDetail projectLocation={projectLocation} /> : null}
      </DetailPageWrapper>
    </>
  )
}

export default ProjectLocationDetailPage
