import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { ProjectLocationForm } from '@/features/attendance/project-location/_shares/components/ProjectLocationForm.tsx'
import { withRememberedSearch } from '@/utils/list-url-memory'

const ProjectLocationCreatePage = () => {
  const navigate = useNavigate()

  const handleSuccess = () => {
    navigate(APP_PATH.PROJECT_LOCATION_MANAGEMENT)
  }

  const handleCancel = () => {
    navigate(withRememberedSearch(APP_PATH.PROJECT_LOCATION_MANAGEMENT))
  }

  return (
    <>
      <PageTitle
        title={'Tạo mới định vị dự án'}
        currentPageBreadcrumbTitle={'Tạo mới'}
        enableBackButton
      />
      <Flex className="flex-1 px-10 py-4">
        <ProjectLocationForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </Flex>
    </>
  )
}

export default ProjectLocationCreatePage
