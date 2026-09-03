import { FullScreenLoading, PageTitle, Button } from '@/components/ui'
import { Flex, Text } from '@radix-ui/themes'
import DependentEditForm from '@/features/employee/dependent/edit/DependentEditForm.tsx'
import { useEmployeeDependent } from '@/features/employee/services/employee-dependent-service'
import { useNavigate, useParams } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useMemo } from 'react'
import { useAbility } from '@/lib/ability.ts'

const EmployeeDependentEditPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const dependentId = Number(id)
  const ability = useAbility()

  // Fetch employee dependent data
  const { data: dependent, isLoading, error } = useEmployeeDependent(dependentId)

  // Determine if dependent was not found
  const isNotFound = useMemo(() => {
    return !isLoading && !error && !dependent
  }, [isLoading, error, dependent])

  // Permission check
  if (!ability.can('update', 'employee_dependent')) {
    return (
      <Flex direction="column" align="center" justify="center" gap="4" className="h-full">
        <Text className="typo-body-xl-semibold text-content-dark-3">
          Bạn không có quyền chỉnh sửa người phụ thuộc này.
        </Text>
        <Button onClick={() => navigate(APP_PATH.HOME)}>Quay lại trang chủ</Button>
      </Flex>
    )
  }

  return (
    <>
      <PageTitle enableBackButton idLabel={dependent?.dependent_name} />
      {isLoading ? (
        <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
      ) : isNotFound ? (
        <Flex direction="column" gap="5" className="px-10 pt-4 pb-8">
          <Text className="typo-body-xl-semibold text-content-dark-3">
            Không tìm thấy thông tin người phụ thuộc với ID: {dependentId}
          </Text>
        </Flex>
      ) : dependent ? (
        <Flex flexGrow={'1'} direction="column" gap="4" className="w-full" p={'7'}>
          <DependentEditForm
            initialData={dependent}
            onSuccess={() => navigate(APP_PATH.EMPLOYEE_DEPENDENT)}
            onCancel={() => navigate(-1)}
          />
        </Flex>
      ) : null}
    </>
  )
}

export default EmployeeDependentEditPage
