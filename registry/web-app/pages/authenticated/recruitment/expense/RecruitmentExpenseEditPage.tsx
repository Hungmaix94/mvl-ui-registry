import { PageTitle, Button } from '@/components/ui'
import { useRecruitmentExpenseDetail } from '@/hooks/useRecruitmentExpenseDetail.ts'
import { useNavigate } from 'react-router-dom'
import { RecruitmentExpenseForm } from '@/features/recruitment/cost'
import { APP_PATH } from '@/routes'
import { FullScreenLoading } from '@/components/Loading.tsx'
import { Flex, Text } from '@radix-ui/themes'
import { useAbility } from '@/lib/ability.ts'

const RecruitmentExpenseEditPage = () => {
  const navigate = useNavigate()

  const { expense, isLoading, error, isNotFound, expenseId } = useRecruitmentExpenseDetail()
  const ability = useAbility()

  if (error) {
    console.log('API error, using mock data:', error)
  }

  // Permission check
  if (!ability.can('update', 'recruitment_expense')) {
    return (
      <Flex direction="column" align="center" justify="center" gap="4" className="h-full">
        <Text className="typo-body-xl-semibold text-content-dark-3">
          Bạn không có quyền chỉnh sửa chi phí tuyển dụng này.
        </Text>
        <Button onClick={() => navigate(APP_PATH.HOME)}>Quay lại trang chủ</Button>
      </Flex>
    )
  }

  return (
    <>
      <PageTitle enableBackButton idLabel={`Chỉnh sửa chi phí tuyển dụng`} />

      {isLoading ? (
        <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
      ) : isNotFound || !expense ? (
        <Flex direction="column" gap="5" className="px-10 pt-4 pb-8">
          <Text className="typo-body-xl-semibold text-content-dark-3">
            Không tìm thấy thông tin chi phí tuyển dụng với ID: {expenseId}
          </Text>
        </Flex>
      ) : (
        <RecruitmentExpenseForm
          initialData={expense}
          onSuccess={() => navigate(APP_PATH.RECRUITMENT_EXPENSE)}
          onCancel={() => navigate(-1)}
        />
      )}
    </>
  )
}

export default RecruitmentExpenseEditPage
