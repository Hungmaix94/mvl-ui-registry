import { FullScreenLoading, PageTitle, Button } from '@/components/ui'
import { Flex, Text } from '@radix-ui/themes'
import RelationForm from '@/features/employee/relation/_shares/components/RelationForm.tsx'
import { useEmployeeRelationship } from '@/features/employee/services/employee-relationship-service'
import { useNavigate, useParams } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useMemo } from 'react'
import { useAbility } from '@/lib/ability.ts'

const EmployeeRelationEditPage = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const relationId = Number(id)
  const ability = useAbility()

  // Fetch employee relationship data
  const { data: relation, isLoading, error } = useEmployeeRelationship(relationId)

  // Determine if relation was not found
  const isNotFound = useMemo(() => {
    return !isLoading && !error && !relation
  }, [isLoading, error, relation])

  // Permission check
  if (!ability.can('update', 'employee_relationship')) {
    return (
      <Flex direction="column" align="center" justify="center" gap="4" className="h-full">
        <Text className="typo-body-xl-semibold text-content-dark-3">
          Bạn không có quyền chỉnh sửa quan hệ nhân thân này.
        </Text>
        <Button onClick={() => navigate(APP_PATH.HOME)}>Quay lại trang chủ</Button>
      </Flex>
    )
  }

  return (
    <>
      <PageTitle enableBackButton idLabel={relation?.relative_name} />
      {isLoading ? (
        <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
      ) : isNotFound ? (
        <Flex direction="column" gap="5" className="px-10 pt-4 pb-8">
          <Text className="typo-body-xl-semibold text-content-dark-3">
            Không tìm thấy thông tin quan hệ nhân thân với ID: {relationId}
          </Text>
        </Flex>
      ) : relation ? (
        <Flex flexGrow={'1'} direction="column" gap="4" className="w-full" py={'4'}>
          <RelationForm
            initialData={relation}
            onSuccess={() => navigate(APP_PATH.EMPLOYEE_RELATION)}
            onCancel={() => navigate(-1)}
          />
        </Flex>
      ) : null}
    </>
  )
}

export default EmployeeRelationEditPage
