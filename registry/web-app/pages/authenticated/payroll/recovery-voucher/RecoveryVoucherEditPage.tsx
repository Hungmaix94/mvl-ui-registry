import { PageTitle } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { RecoveryVoucherForm } from '@/features/payroll/recovery-voucher'
import { APP_PATH } from '@/routes'
import { FullScreenLoading } from '@/components/Loading.tsx'
import { Flex, Text } from '@radix-ui/themes'
import { useRecoveryVoucherDetail } from '@/hooks/useRecoveryVoucherDetail.ts'

const RecoveryVoucherEditPage = () => {
  const navigate = useNavigate()

  const { voucher, isLoading, error, isNotFound, voucherId } = useRecoveryVoucherDetail()

  if (error) {
    console.log('API error:', error)
  }

  return (
    <>
      <PageTitle enableBackButton idLabel={voucher?.name} />

      {isLoading ? (
        <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
      ) : isNotFound || !voucher ? (
        <Flex direction="column" gap="5" className="px-10 pt-4 pb-8">
          <Text className="typo-body-xl-semibold text-content-dark-3">
            Không tìm thấy thông tin phiếu với ID: {voucherId}
          </Text>
        </Flex>
      ) : (
        <RecoveryVoucherForm
          initialData={voucher}
          onSuccess={() => navigate(APP_PATH.RECOVERY_VOUCHER)}
          onCancel={() => navigate(-1)}
        />
      )}
    </>
  )
}

export default RecoveryVoucherEditPage
