import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes'
import { useCreateReceiptVoucher } from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'
import { ReceiptVoucherWizard } from '@/features/accounting/receipt-vouchers/components/ReceiptVoucherWizard'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { withRememberedSearch } from '@/utils/list-url-memory'

const ReceiptVoucherCreatePage = () => {
  const navigate = useNavigate()
  const { mutateAsync: createReceiptVoucher, isPending: isSubmitting } = useCreateReceiptVoucher()

  const handleCancel = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.RECEIPT_VOUCHER))
  }, [navigate])

  const handleSubmit = useCallback(
    async (payload: any) => {
      try {
        await createReceiptVoucher(payload)
        toastService.success('Tạo phiếu thu thành công')
        navigate(APP_PATH.RECEIPT_VOUCHER)
      } catch (error) {
        toastService.error(extractErrorMessage(error))
      }
    },
    [createReceiptVoucher, navigate]
  )

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle title="Tạo phiếu thu" enableBackButton />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <ReceiptVoucherWizard
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  )
}

export default ReceiptVoucherCreatePage
