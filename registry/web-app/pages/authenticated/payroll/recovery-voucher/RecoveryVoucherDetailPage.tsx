import { PageTitle } from '@/components/ui'
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useRecoveryVoucherDelete } from '@/features/payroll/recovery-voucher/_shares/hooks/useRecoveryVoucherDelete.tsx'
import RecoveryVoucherDetail from '@/features/payroll/recovery-voucher/view-details/RecoveryVoucherDetail.tsx'
import { useAbility } from '@/lib/ability.ts'
import { useRecoveryVoucherDetail } from '@/hooks/useRecoveryVoucherDetail.ts'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'

const RecoveryVoucherDetailPage = () => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { voucher, isLoading, isNotFound, isError, voucherId } = useRecoveryVoucherDetail()

  const { openDeleteDialog } = useRecoveryVoucherDelete(() => {
    navigate(APP_PATH.RECOVERY_VOUCHER)
  })

  const handleEdit = useCallback(() => {
    const path = APP_PATH.RECOVERY_VOUCHER_EDIT.replace(':id', voucherId.toString())
    navigate(path)
  }, [navigate, voucherId])

  const handleDelete = useCallback(() => {
    if (voucher) {
      openDeleteDialog(voucher)
    }
  }, [openDeleteDialog, voucher])

  const handleShowHistory = useCallback(() => {
    const path = APP_PATH.RECOVERY_VOUCHER_HISTORY.replace(':id', voucherId.toString())
    navigate(path)
  }, [navigate, voucherId])

  const pageTitle = voucher ? `Phiếu ${voucher?.code}` : undefined

  return (
    <>
      <PageTitle
        idLabel={voucher?.name}
        enableBackButton
        title={pageTitle}
        handleEdit={ability.can('update', 'payroll.recovery_voucher') ? handleEdit : undefined}
        handleDelete={ability.can('destroy', 'payroll.recovery_voucher') ? handleDelete : undefined}
        handleShowHistory={
          ability.can('histories', 'payroll.recovery_voucher') ? handleShowHistory : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'payroll.recovery_voucher')}
      >
        {voucher && <RecoveryVoucherDetail voucher={voucher} />}
      </DetailPageWrapper>
    </>
  )
}

export default RecoveryVoucherDetailPage
