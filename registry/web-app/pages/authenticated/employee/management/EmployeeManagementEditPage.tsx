import { PageTitle, Button } from '@/components/ui'
import { Flex, Text } from '@radix-ui/themes'
import { useParams, useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import EmployeeForm from '@/features/employee/management/create/EmployeeForm.tsx'
import { useEmployee } from '@/services'
import { useAbility } from '@/lib/ability.ts'
import { useRef } from 'react'
import { PageTitleRef } from '@/components/ui/page-title/PageTitle.tsx'

const EmployeeManagementEditPage = () => {
  const refPageTitle = useRef<PageTitleRef>(null)

  const { id } = useParams<{ id: string }>()

  const employeeId = id ? parseInt(id, 10) : 0

  // Fetch employee data for edit mode
  const { data: employeeData, isLoading: employeeLoading } = useEmployee(employeeId || 0)

  const navigate = useNavigate()
  const ability = useAbility()

  // Permission check
  if (!ability.can('update', 'employee')) {
    return (
      <Flex direction="column" align="center" justify="center" gap="4" className="h-full">
        <Text className="typo-body-xl-semibold text-content-dark-3">
          Bạn không có quyền chỉnh sửa nhân viên này.
        </Text>
        <Button onClick={() => navigate(APP_PATH.HOME)}>Quay lại trang chủ</Button>
      </Flex>
    )
  }

  return (
    <>
      <PageTitle ref={refPageTitle} enableBackButton idLabel={`${employeeData?.fullname}`} />
      <Flex className="flex-1 px-10 py-4">
        <EmployeeForm
          mode="edit"
          employeeData={employeeData}
          employeeLoading={employeeLoading}
          onSuccess={(id) =>
            navigate(APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(id)))
          }
        />
      </Flex>
    </>
  )
}

export default EmployeeManagementEditPage
