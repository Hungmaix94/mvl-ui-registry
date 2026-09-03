import { PageTitle } from '@/components/ui'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useRecruitmentSourceDetail } from '@/hooks/useRecruitmentSourceDetail.ts'
import { useRecruitmentSourceDelete } from '@/features/recruitment/source'
import RecruitmentSourceDetail from '@/features/recruitment/source/view-details/RecruitmentSourceDetail.tsx'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

import { useAbility } from '@/lib/ability.ts'

const RecruitmentSourceDetailPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { source, isLoading, isNotFound, isError, sourceId } = useRecruitmentSourceDetail()

  const { openDeleteDialog } = useRecruitmentSourceDelete(() => {
    navigate(APP_PATH.RECRUITMENT_SOURCE)
  })

  const handleEdit = useCallback(() => {
    const path = APP_PATH.RECRUITMENT_SOURCE_EDIT.replace(':id', sourceId.toString())
    navigate(path)
  }, [navigate, sourceId])

  const handleDelete = useCallback(() => {
    if (source) {
      openDeleteDialog(source)
    }
  }, [openDeleteDialog, source])

  const handleShowHistory = useCallback(() => {
    const path = APP_PATH.RECRUITMENT_SOURCE_HISTORY.replace(':id', sourceId.toString())
    navigate(path)
  }, [navigate, sourceId])

  // Dynamic title: "Nguồn tuyển dụng {code}"
  const pageTitle = source ? `Nguồn tuyển dụng ${source.code}` : undefined

  return (
    <>
      <PageTitle
        idLabel={source?.name}
        enableBackButton
        title={pageTitle}
        handleEdit={ability.can('update', 'recruitment_source') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'recruitment_source') ? handleDelete : undefined}
        handleShowHistory={
          ability.can('histories', 'recruitment_source') ? handleShowHistory : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'recruitment_source')}
      >
        {source && <RecruitmentSourceDetail source={source} />}
      </DetailPageWrapper>
    </>
  )
}

export default RecruitmentSourceDetailPage
