import { FC } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import toastService from '@/services/toast-service'
import RefundBookingForm from '@/features/project/refund-booking/components/RefundBookingForm'
import { useBooking, useCreateBookingRefund } from '@/services/sales-service'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { extractErrorMessage } from '@/utils/error-utils'
import { useSubmitOnce } from '@/hooks/useSubmitOnce'
import { useAbility } from '@/lib/ability'

const BookingContractRefundPage: FC = () => {
  const ability = useAbility()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const contractId = Number(id)

  const { data: detailData, isLoading, error } = useBooking(contractId)
  const { mutateAsync: createRefund } = useCreateBookingRefund()

  // Check for error/not found states
  const isError = !!error
  const isNotFound = !!error && (error as any)?.response?.status === 404

  const submitRefund = async (values: any) => {
    try {
      const payload: any = {
        booking_id: values.booking_id,
        sales_employee_id: values.sales_employee_id,
        refund_amount: values.refund_amount.toString(),
        receiver_account_name: values.refund_account_name,
        receiver_account_number: values.refund_account_number,
        receiver_bank_name: values.refund_bank_name,
        receiver_bank_branch: values.refund_bank_branch,
        sender_account_number: values.sender_account_number,
        sender_account_name: values.sender_account_name,
        files: values.attachments?.length ? { attachments: values.attachments } : undefined,
      }
      await createRefund(payload)
      toastService.success('Đã tạo đề nghị hoàn tiền thành công')
    } catch (err: any) {
      console.error('Lỗi khi tạo hoàn tiền:', err)
      toastService.error(extractErrorMessage(err, 'Có lỗi xảy ra khi tạo đề nghị hoàn tiền'))
    }
  }

  // Chặn double-submit ở mức đồng bộ (§4.3c). Trước đây trang này không có guard
  // nào: form không nhận `isSubmitting` nên nút submit chưa từng bị disable.
  const { submit: handleRefundSubmit, isSubmitting } = useSubmitOnce(submitRefund)

  const firstStaff = detailData?.sales_staff?.[0]?.employee_detail as any

  // Quyền của trang lấy theo endpoint trang GỌI để dựng form: `useBooking(contractId)` →
  // `GET /sales/bookings/{id}/` → `booking.retrieve`. KHÔNG chép lại `booking_refund.create` của
  // route: route đã chặn mã đó rồi nên tầng thứ hai không thêm gì, còn người có quyền tạo hoàn cọc
  // mà thiếu `booking.retrieve` thì vẫn ăn 403 ngay ở lượt tải hợp đồng.
  return (
    <>
      <PageTitle title="Đề xuất Hoàn tiền đặt chỗ" enableBackButton />

      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={ability.can('retrieve', 'booking')}
      >
        {detailData && (
          <RefundBookingForm
            initialValues={{
              booking_id: detailData.id,
              customer_id: detailData.customer_detail?.id,
              customer_name: detailData.customer_detail?.name,
              customer_cccd: (detailData.customer_detail as any)?.id_number,
              customer_phone: undefined,
              sales_employee_id: firstStaff?.id,
              sales_employee_detail: firstStaff,
              sales_staff: detailData.sales_staff,
              refund_amount: Number(detailData.payment_amount), // Default to full refund
              project_id: detailData.project_detail?.id,
              product_inventory_id: detailData.product_inventory_detail?.id,
              booking_amount: Number(detailData.payment_amount),
              booking_date: new Date(detailData.booking_date),
              sender_account_name: '',
              sender_account_number: '',
              refund_account_name: detailData.customer_detail?.name || '',
              refund_account_number: '',
              refund_bank_branch: '',
            }}
            onSubmit={handleRefundSubmit}
            onCancel={() => navigate(-1)}
            isSubmitting={isSubmitting}
          />
        )}
      </DetailPageWrapper>
    </>
  )
}

export default BookingContractRefundPage
