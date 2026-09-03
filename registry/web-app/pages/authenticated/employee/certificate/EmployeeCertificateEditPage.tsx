import { PageTitle, Button } from '@/components/ui'
import EmployeeCertificateForm from '@/features/employee/certificate/_shares/components/EmployeeCertificateForm.tsx'
import { Flex, Text } from '@radix-ui/themes'
import { useParams, useNavigate } from 'react-router-dom'
import { useAbility } from '@/lib/ability.ts'
import { APP_PATH } from '@/routes'

const EmployeeCertificateEditPage = () => {
  const { id } = useParams<{ id: string }>()
  const certificateId = id ? parseInt(id, 10) : 0
  const navigate = useNavigate()
  const ability = useAbility()

  if (!certificateId || isNaN(certificateId)) {
    return (
      <>
        <PageTitle enableBackButton title="Chỉnh sửa bằng cấp, chứng chỉ môi giới" />
        <Flex flexGrow={'1'} direction="column" gap="4" p={'7'}>
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <p className="typo-body-base-regular text-content-dark-3">ID không hợp lệ</p>
          </div>
        </Flex>
      </>
    )
  }

  // Permission check
  if (!ability.can('update', 'employee_certificate')) {
    return (
      <Flex direction="column" align="center" justify="center" gap="4" className="h-full">
        <Text className="typo-body-xl-semibold text-content-dark-3">
          Bạn không có quyền chỉnh sửa bằng cấp, chứng chỉ này.
        </Text>
        <Button onClick={() => navigate(APP_PATH.HOME)}>Quay lại trang chủ</Button>
      </Flex>
    )
  }

  return (
    <>
      <PageTitle enableBackButton title="Chỉnh sửa bằng cấp, chứng chỉ môi giới" />

      <Flex flexGrow={'1'} direction="column" gap="4" p={'7'}>
        <EmployeeCertificateForm certificateId={certificateId} />
      </Flex>
    </>
  )
}

export default EmployeeCertificateEditPage
