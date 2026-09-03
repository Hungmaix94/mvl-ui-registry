import { PageTitle } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { RecoveryVoucherForm } from '@/features/payroll/recovery-voucher'
import { APP_PATH } from '@/routes'

const RecoveryVoucherCreatePage = () => {
  const navigate = useNavigate()

  return (
    <>
      <PageTitle enableBackButton />

      <RecoveryVoucherForm
        onSuccess={() => navigate(APP_PATH.RECOVERY_VOUCHER)}
        onCancel={() => navigate(-1)}
      />
    </>
  )
}

export default RecoveryVoucherCreatePage
