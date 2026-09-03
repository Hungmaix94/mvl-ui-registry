import { PageTitle } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { TravelExpenseForm } from '@/features/payroll/travel-expense'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { Flex, Text } from '@radix-ui/themes'
import { Button } from '@/components/ui'

const TravelExpenseCreatePage = () => {
  const navigate = useNavigate()
  const ability = useAbility()

  // Permission check
  if (!ability.can('create', 'payroll.travel_expense')) {
    return (
      <Flex direction="column" align="center" justify="center" gap="4" className="h-full">
        <Text className="typo-body-xl-semibold text-content-dark-3">
          Bạn không có quyền tạo công tác phí.
        </Text>
        <Button onClick={() => navigate(APP_PATH.HOME)}>Quay lại trang chủ</Button>
      </Flex>
    )
  }

  return (
    <>
      <PageTitle enableBackButton />

      <TravelExpenseForm
        onSuccess={() => navigate(APP_PATH.TRAVEL_EXPENSE)}
        onCancel={() => navigate(-1)}
      />
    </>
  )
}

export default TravelExpenseCreatePage
