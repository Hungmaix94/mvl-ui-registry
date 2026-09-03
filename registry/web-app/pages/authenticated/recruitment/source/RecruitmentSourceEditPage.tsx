import { PageTitle } from '@/components/ui'
import { useRecruitmentSourceDetail } from '@/hooks/useRecruitmentSourceDetail.ts'
import { useNavigate } from 'react-router-dom'
import RecruitmentSourceForm from '@/features/recruitment/source/components/RecruitmentSourceForm.tsx'
import { APP_PATH } from '@/routes'
import { FullScreenLoading } from '@/components/Loading.tsx'
import { Flex, Text } from '@radix-ui/themes'

const RecruitmentSourceEditPage = () => {
  const navigate = useNavigate()

  const { source, isLoading, error, isNotFound, sourceId } = useRecruitmentSourceDetail()

  if (error) {
    console.log('API error, using mock data:', error)
  }

  return (
    <>
      <PageTitle enableBackButton idLabel={source?.name} />

      {isLoading ? (
        <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
      ) : isNotFound || !source ? (
        <Flex direction="column" gap="5" className="px-10 pt-4 pb-8">
          <Text className="typo-body-xl-semibold text-content-dark-3">
            Không tìm thấy thông tin nguồn tuyển dụng với ID: {sourceId}
          </Text>
        </Flex>
      ) : (
        <RecruitmentSourceForm
          initialData={source}
          onSuccess={() => navigate(APP_PATH.RECRUITMENT_SOURCE)}
          onCancel={() => navigate(-1)}
        />
      )}
    </>
  )
}

export default RecruitmentSourceEditPage
