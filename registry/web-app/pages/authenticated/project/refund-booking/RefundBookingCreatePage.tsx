import { FC } from 'react'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import toastService from '@/services/toast-service.tsx'
import RefundBookingForm from '@/features/project/refund-booking/components/RefundBookingForm'
import { RefundBookingFormValues } from '@/features/project/refund-booking/types/refund-booking-form-types'
import { useCreateRefundBooking } from '@/features/project/refund-booking/hooks/useRefundBookings'
import { BookingRefundRequest } from '@/services/sales-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { useSubmitOnce } from '@/hooks/useSubmitOnce'

const RefundBookingCreatePage: FC = () => {
  const navigate = useNavigate()
  const { mutateAsync: createRefund } = useCreateRefundBooking()

  const submitRefund = async (values: RefundBookingFormValues) => {
    try {
      if (!values.booking_id) {
        toastService.error('Vui lòng chọn giao dịch đặt chỗ')
        return
      }

      const payload: BookingRefundRequest = {
        booking_id: values.booking_id,
        refund_amount: values.refund_amount.toString(),
        receiver_account_name: values.refund_account_name,
        receiver_account_number: values.refund_account_number,
        receiver_bank_name: values.refund_bank_name,
        receiver_bank_branch: values.refund_bank_branch,
        sender_account_number: values.sender_account_number,
        sender_account_name: values.sender_account_name,
        files: values.attachments?.length
          ? {
              attachments: values.attachments,
            }
          : undefined,
      }

      await createRefund(payload)
      toastService.success('Tạo đề nghị hoàn tiền thành công')
      navigate(APP_PATH.PROJECT_BOOKING_CONTRACT_DETAIL.replace(':id', String(values.booking_id)))
    } catch (error: any) {
      toastService.error(extractErrorMessage(error) || 'Có lỗi xảy ra khi tạo đề nghị')
    }
  }

  // Chặn double-submit ở mức đồng bộ (§4.3c).
  const { submit: handleCreateSubmit, isSubmitting } = useSubmitOnce(submitRefund)

  return (
    <>
      <PageTitle enableBackButton />

      <div className="flex flex-col gap-4 px-7 py-6 pb-12">
        <RefundBookingForm onSubmit={handleCreateSubmit} isSubmitting={isSubmitting} />
      </div>
    </>
  )
}

export default RefundBookingCreatePage
