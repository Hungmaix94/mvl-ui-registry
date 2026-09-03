import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes'
import {
  useCreatePaymentVoucher,
  type PaymentVoucherRequest,
} from '@/features/accounting/payment-vouchers/services/payment-voucher-service.ts'
import { PaymentVoucherWizard } from '@/features/accounting/payment-vouchers/components/PaymentVoucherWizard'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { withRememberedSearch } from '@/utils/list-url-memory'

export default function PaymentVoucherCreatePage() {
  const navigate = useNavigate()
  const { mutateAsync: createPaymentVoucher, isPending: isSubmitting } = useCreatePaymentVoucher()

  // "Huỷ" cùng ý định với nút back: thoát mà không lưu, quay về đúng chỗ vừa rời đi.
  // Không bọc thì nó đẩy về đường dẫn danh sách TRẦN và mất bộ lọc, trong khi mũi tên back
  // ngay trên cùng màn này lại giữ được — hai nút cạnh nhau hành xử khác nhau.
  const handleCancel = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.PAYMENT_VOUCHER_MANAGEMENT))
  }, [navigate])

  const handleSubmit = useCallback(
    async (payload: PaymentVoucherRequest) => {
      try {
        const data = await createPaymentVoucher(payload)
        toastService.success('Tạo phiếu chi thành công')
        navigate(APP_PATH.PAYMENT_VOUCHER_DETAIL.replace(':id', String(data.id)))
      } catch (error) {
        toastService.error(extractErrorMessage(error))
      }
    },
    [createPaymentVoucher, navigate]
  )

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle title="Tạo phiếu chi" enableBackButton />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <PaymentVoucherWizard
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  )
}
