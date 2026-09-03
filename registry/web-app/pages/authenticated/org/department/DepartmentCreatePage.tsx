import { Flex } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import DepartmentForm from '@/features/org/department/_shares/components/DepartmentForm.tsx'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { withRememberedSearch } from '@/utils/list-url-memory'

const CreateNewDepartmentPage = () => {
  const navigate = useNavigate()

  return (
    <>
      <PageTitle enableBackButton />
      <Flex className="" flexGrow={'1'} direction="column" gap="4">
        <DepartmentForm
          onSuccess={() => navigate(APP_PATH.DEPARTMENT_MANAGEMENT)}
          onCancel={() => navigate(withRememberedSearch(APP_PATH.DEPARTMENT_MANAGEMENT))}
        />
      </Flex>
    </>
  )
}

export default CreateNewDepartmentPage
