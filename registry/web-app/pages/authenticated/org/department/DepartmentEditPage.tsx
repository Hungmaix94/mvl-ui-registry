import { PageTitle } from '@/components/ui'
import { useDepartmentDetail } from '@/hooks/useDepartmentDetail.ts'
import { useNavigate } from 'react-router-dom'
import DepartmentForm from '@/features/org/department/_shares/components/DepartmentForm.tsx'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

const DepartmentEditPage = () => {
  const navigate = useNavigate()

  const { department, isLoading, error, isNotFound } = useDepartmentDetail()

  const isAllDataLoading = isLoading
  const ability = useAbility()

  if (error) {
    console.log('API error, using mock data:', error)
  }

  return (
    <>
      <PageTitle enableBackButton idLabel={department?.name} />

      <DetailPageWrapper
        isLoading={isAllDataLoading}
        isNotFound={isNotFound || !department}
        hasPermission={ability.can('update', 'department')}
      >
        <DepartmentForm
          initialData={department!}
          onSuccess={() => navigate(APP_PATH.DEPARTMENT_MANAGEMENT)}
          onCancel={() => navigate(-1)}
        />
      </DetailPageWrapper>
    </>
  )
}

export default DepartmentEditPage
