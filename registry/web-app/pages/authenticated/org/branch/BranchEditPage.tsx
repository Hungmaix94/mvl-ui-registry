import { PageTitle } from '@/components/ui'
import { useBranchDetail } from '@/hooks/useBranchDetail.ts'
import { useNavigate } from 'react-router-dom'
import BranchForm from '@/features/org/branch/_shares/components/BranchForm.tsx'
import { APP_PATH } from '@/routes'
import { useProvinces } from '@/services/province-service.ts'
import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

const BranchEditPage = () => {
  const navigate = useNavigate()

  const { branch, isLoading, error, isNotFound } = useBranchDetail()

  // Preload provinces data for the edit form
  const { isLoading: isLoadingProvinces } = useProvinces()

  const isAllDataLoading = isLoading || isLoadingProvinces
  const ability = useAbility()

  if (error) {
    console.log('API error, using mock data:', error)
  }

  return (
    <>
      <PageTitle enableBackButton idLabel={branch?.name} />

      <DetailPageWrapper
        isLoading={isAllDataLoading}
        isNotFound={isNotFound || !branch}
        hasPermission={ability.can('update', 'branch')}
      >
        <BranchForm
          initialData={branch!}
          onSuccess={() => navigate(APP_PATH.BRANCH_MANAGEMENT)}
          onCancel={() => navigate(-1)}
        />
      </DetailPageWrapper>
    </>
  )
}

export default BranchEditPage
