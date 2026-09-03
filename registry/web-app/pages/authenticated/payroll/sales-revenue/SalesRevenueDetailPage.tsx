import { PageTitle } from '@/components/ui'
import { Flex, Text } from '@radix-ui/themes'
import { Button } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'

const SalesRevenueDetailPage = () => {
  const navigate = useNavigate()

  return (
    <>
      <PageTitle enableBackButton />
      <Flex direction="column" align="center" justify="center" gap="4" className="h-full">
        <Text className="typo-body-xl-semibold text-content-dark-3">
          Tính năng đang được phát triển
        </Text>
        <Button onClick={() => navigate(APP_PATH.SALES_REVENUE)}>Quay lại danh sách</Button>
      </Flex>
    </>
  )
}

export default SalesRevenueDetailPage
