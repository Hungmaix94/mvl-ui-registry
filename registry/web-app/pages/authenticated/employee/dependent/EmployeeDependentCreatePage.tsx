import { PageTitle } from '@/components/ui'
import DependentCreateForm from '@/features/employee/dependent/create/DependentCreateForm.tsx'
import { Flex } from '@radix-ui/themes'

const EmployeeDependentCreatePage = () => {
  return (
    <>
      <PageTitle enableBackButton />
      <Flex flexGrow={'1'} direction="column" gap="4" p={'7'}>
        <DependentCreateForm />
      </Flex>
    </>
  )
}

export default EmployeeDependentCreatePage
