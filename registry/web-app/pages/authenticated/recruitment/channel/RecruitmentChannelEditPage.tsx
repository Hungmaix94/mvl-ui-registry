import { PageTitle, Button } from '@/components/ui'
import { useRecruitmentChannelDetail } from '@/hooks/useRecruitmentChannelDetail.ts'
import { useNavigate } from 'react-router-dom'
import RecruitmentChannelEditForm from '@/features/recruitment/channel/update/RecruitmentChannelEditForm.tsx'
import { APP_PATH } from '@/routes'
import { FullScreenLoading } from '@/components/Loading.tsx'
import { Flex, Text } from '@radix-ui/themes'
import { useAbility } from '@/lib/ability.ts'

const RecruitmentChannelEditPage = () => {
  const navigate = useNavigate()

  const { channel, isLoading, error, isNotFound, channelId } = useRecruitmentChannelDetail()
  const ability = useAbility()

  if (error) {
    console.log('API error, using mock data:', error)
  }

  // Permission check
  if (!ability.can('update', 'recruitment_channel')) {
    return (
      <Flex direction="column" align="center" justify="center" gap="4" className="h-full">
        <Text className="typo-body-xl-semibold text-content-dark-3">
          Bạn không có quyền chỉnh sửa kênh tuyển dụng này.
        </Text>
        <Button onClick={() => navigate(APP_PATH.HOME)}>Quay lại trang chủ</Button>
      </Flex>
    )
  }

  return (
    <>
      <PageTitle enableBackButton idLabel={channel?.name} />

      {isLoading ? (
        <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
      ) : isNotFound || !channel ? (
        <Flex direction="column" gap="5" className="px-10 pt-4 pb-8">
          <Text className="typo-body-xl-semibold text-content-dark-3">
            Không tìm thấy thông tin kênh tuyển dụng với ID: {channelId}
          </Text>
        </Flex>
      ) : (
        <RecruitmentChannelEditForm
          initialData={channel}
          onSuccess={() => navigate(APP_PATH.RECRUITMENT_CHANNEL)}
          onCancel={() => navigate(-1)}
        />
      )}
    </>
  )
}

export default RecruitmentChannelEditPage
