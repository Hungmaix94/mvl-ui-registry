import { PageTitle } from '@/components/ui'
import { usePositionDetail } from '@/hooks/usePositionDetail.ts'
import { useNavigate } from 'react-router-dom'
import PositionForm from '@/features/org/position/_shares/components/PositionForm.tsx'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

const PositionEditPage = () => {
  const navigate = useNavigate()

  const { position, isLoading, error, isNotFound } = usePositionDetail()
  const ability = useAbility()

  if (error) {
    console.log('API error, using mock data:', error)
  }

  return (
    <>
      <PageTitle enableBackButton idLabel={position?.name} />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound || !position}
        hasPermission={ability.can('update', 'position')}
      >
        <PositionForm
          initialData={position!}
          onSuccess={() => navigate(APP_PATH.POSITION_MANAGEMENT)}
          onCancel={() => navigate(-1)}
        />
      </DetailPageWrapper>
    </>
  )
}

export default PositionEditPage
