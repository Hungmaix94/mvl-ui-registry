import { PageTitle } from '@/components/ui'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useRecruitmentChannelDetail } from '@/hooks/useRecruitmentChannelDetail.ts'
import { useRecruitmentChannelDelete } from '@/features/recruitment/channel'
import RecruitmentChannelDetail from '@/features/recruitment/channel/view-details/RecruitmentChannelDetail.tsx'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

import { useAbility } from '@/lib/ability.ts'

const RecruitmentChannelDetailPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { channel, isLoading, isNotFound, isError, channelId } = useRecruitmentChannelDetail()

  const { openDeleteDialog } = useRecruitmentChannelDelete(() => {
    navigate(APP_PATH.RECRUITMENT_CHANNEL)
  })

  const handleEdit = useCallback(() => {
    const path = APP_PATH.RECRUITMENT_CHANNEL_EDIT.replace(':id', channelId.toString())
    navigate(path)
  }, [navigate, channelId])

  const handleDelete = useCallback(() => {
    if (channel) {
      openDeleteDialog(channel)
    }
  }, [openDeleteDialog, channel])

  const handleShowHistory = useCallback(() => {
    const path = APP_PATH.RECRUITMENT_CHANNEL_HISTORY.replace(':id', channelId.toString())
    navigate(path)
  }, [navigate, channelId])

  // Dynamic title: "Kênh tuyển dụng {code}"
  const pageTitle = channel ? `Kênh tuyển dụng ${channel.code}` : undefined

  return (
    <>
      <PageTitle
        idLabel={channel?.name}
        enableBackButton
        title={pageTitle}
        handleEdit={ability.can('update', 'recruitment_channel') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'recruitment_channel') ? handleDelete : undefined}
        handleShowHistory={
          ability.can('histories', 'recruitment_channel') ? handleShowHistory : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'recruitment_channel')}
      >
        {channel && <RecruitmentChannelDetail channel={channel} />}
      </DetailPageWrapper>
    </>
  )
}

export default RecruitmentChannelDetailPage
