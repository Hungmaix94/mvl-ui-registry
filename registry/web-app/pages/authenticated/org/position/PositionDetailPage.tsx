import { PageTitle } from '@/components/ui'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { usePositionDetail } from '@/hooks/usePositionDetail.ts'
import { usePositionDelete } from '@/features/org/position/_shares/hooks/usePositionDelete.tsx'
import PositionDetailWrapper from '@/features/org/position/view-details/PositionDetailWrapper.tsx'

import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

const PositionDetailPage = () => {
  const navigate = useNavigate()

  const { position, isLoading, error, isNotFound, isError, positionId } = usePositionDetail()

  const { openDeleteDialog } = usePositionDelete(() => {
    navigate(APP_PATH.POSITION_MANAGEMENT)
  })

  const ability = useAbility()

  const handleEdit = useCallback(() => {
    const path = APP_PATH.POSITION_MANAGEMENT_EDIT.replace(':id', positionId.toString())
    navigate(path)
  }, [navigate, positionId])

  const handleDelete = useCallback(() => {
    if (position) {
      openDeleteDialog(position)
    }
  }, [openDeleteDialog, position])

  const handleShowHistory = useCallback(() => {
    const path = APP_PATH.POSITION_MANAGEMENT_HISTORY.replace(':id', positionId.toString())
    navigate(path)
  }, [navigate, positionId])

  if (error) {
    console.log('API error, using mock data:', error)
  }

  return (
    <>
      <PageTitle
        idLabel={position?.name}
        enableBackButton
        title={position?.name || undefined}
        handleEdit={ability.can('update', 'position') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'position') ? handleDelete : undefined}
        handleShowHistory={ability.can('histories', 'position') ? handleShowHistory : undefined}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'position')}
      >
        {position ? <PositionDetailWrapper position={position} /> : null}
      </DetailPageWrapper>
    </>
  )
}

export default PositionDetailPage
