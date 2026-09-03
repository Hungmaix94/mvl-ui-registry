import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import RelationForm from '@/features/employee/relation/_shares/components/RelationForm.tsx'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'

const EmployeeRelationCreatePage = () => {
  const navigate = useNavigate()

  return (
    <>
      <PageTitle enableBackButton />
      <Flex flexGrow={'1'} direction="column" gap="4" className="w-full" py={'4'}>
        <RelationForm
          onSuccess={() => navigate(APP_PATH.EMPLOYEE_RELATION)}
          onCancel={() => navigate(-1)}
        />
      </Flex>
    </>
  )
}

export default EmployeeRelationCreatePage
