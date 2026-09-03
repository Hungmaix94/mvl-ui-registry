import { PageTitle } from '@/components/ui'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useBranchDetail } from '@/hooks/useBranchDetail.ts'
import { useBranchDelete } from '@/features/org/branch/_shares/hooks/useBranchDelete.tsx'
import BranchDetail from '@/features/org/branch/view-details/BranchDetail.tsx'

import { useAbility } from '@/lib/ability.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

const BranchDetailPage = () => {
  const navigate = useNavigate()

  const { branch, isLoading, error, isNotFound, isError, branchId } = useBranchDetail()

  const { openDeleteDialog } = useBranchDelete(() => {
    navigate(APP_PATH.BRANCH_MANAGEMENT)
  })

  const ability = useAbility()

  const handleEdit = useCallback(() => {
    const path = APP_PATH.BRANCH_MANAGEMENT_EDIT.replace(':id', branchId.toString())
    navigate(path)
  }, [navigate, branchId])

  const handleDelete = useCallback(() => {
    if (branch) {
      openDeleteDialog(branch)
    }
  }, [openDeleteDialog, branch])

  if (error) {
    console.log('API error, using mock data:', error)
  }

  const handleShowHistory = useCallback(() => {
    const path = APP_PATH.BRANCH_MANAGEMENT_HISTORY.replace(':id', branchId.toString())
    navigate(path)
  }, [navigate, branchId])

  return (
    <>
      <PageTitle
        idLabel={branch?.name}
        enableBackButton
        title={branch?.name || undefined}
        handleEdit={ability.can('update', 'branch') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'branch') ? handleDelete : undefined}
        handleShowHistory={ability.can('histories', 'branch') ? handleShowHistory : undefined}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'branch')}
      >
        {branch ? <BranchDetail branch={branch} /> : null}
      </DetailPageWrapper>
    </>
  )
}

export default BranchDetailPage
