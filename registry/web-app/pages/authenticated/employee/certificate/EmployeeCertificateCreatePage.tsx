import { PageTitle } from '@/components/ui'
import EmployeeCertificateForm from '@/features/employee/certificate/_shares/components/EmployeeCertificateForm.tsx'
import { Flex } from '@radix-ui/themes'

const EmployeeCertificateCreatePage = () => {
  return (
    <>
      <PageTitle enableBackButton title="Tạo bằng cấp, chứng chỉ môi giới" />

      <Flex flexGrow={'1'} direction="column" gap="4" p={'7'}>
        <EmployeeCertificateForm />
      </Flex>
    </>
  )
}

export default EmployeeCertificateCreatePage
