import { PageTitle } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { FullScreenLoading } from '@/components/Loading.tsx'
import { Flex, Text } from '@radix-ui/themes'
import { useRecruitmentRequestDetail } from '@/hooks/useRecruitmentRequestDetail.ts'
import RecruitmentRequestEditForm from '@/features/recruitment/request/update/RecruitmentRequestEditForm.tsx'

const RecruitmentRequestEditPage = () => {
  const navigate = useNavigate()

  // Hook detail giống useRecruitmentChannelDetail
  const { request, isLoading, error, isNotFound, requestId } = useRecruitmentRequestDetail()

  if (error) {
    console.error('API error, using mock data:', error)
  }

  return (
    <>
      {/* Tiêu đề trang với nút quay lại */}
      <PageTitle enableBackButton idLabel={request?.name} />

      {/* Trạng thái tải dữ liệu */}
      {isLoading ? (
        <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
      ) : isNotFound || !request ? (
        <Flex direction="column" gap="5" className="px-10 pt-4 pb-8">
          <Text className="typo-body-xl-semibold text-content-dark-3">
            Không tìm thấy thông tin đề nghị tuyển dụng với ID: {requestId}
          </Text>
        </Flex>
      ) : (
        <RecruitmentRequestEditForm
          initialValues={request}
          onSuccess={() => navigate(APP_PATH.RECRUITMENT_REQUEST)}
          onCancel={() => navigate(-1)}
        />
      )}
    </>
  )
}

export default RecruitmentRequestEditPage
