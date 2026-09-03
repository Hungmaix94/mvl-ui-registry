import { FC } from 'react'
import { APP_PATH } from '@/routes'
import { useNavigate, useParams } from 'react-router-dom'
import toastService from '@/services/toast-service.tsx'
import { PageTitle } from '@/components/ui'
import RefundBookingForm from '@/features/project/refund-booking/components/RefundBookingForm'
import { RefundBookingFormValues } from '@/features/project/refund-booking/types/refund-booking-form-types'
import {
  useRefundBookingDetail,
  useUpdateRefundBooking,
} from '@/features/project/refund-booking/hooks/useRefundBookings'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { BookingRefundRequest, useBooking } from '@/services/sales-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { useSubmitOnce } from '@/hooks/useSubmitOnce'
import { useAbility } from '@/lib/ability'

const RefundBookingEditPage: FC = () => {
  const ability = useAbility()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const refundId = Number(id)

  const { data: detailData, isLoading, error } = useRefundBookingDetail(refundId)
  const bookingId = detailData?.booking || 0
  const { data: bookingData, isLoading: isLoadingBooking } = useBooking(bookingId)
  const { mutateAsync: updateRefund } = useUpdateRefundBooking()

  const submitRefund = async (values: RefundBookingFormValues) => {
    try {
      // Map form values to BookingRefundRequest
      const payload: BookingRefundRequest = {
        booking_id: values.booking_id || detailData?.booking || 0,
        refund_amount: values.refund_amount.toString(),
        receiver_account_name: values.refund_account_name,
        receiver_account_number: values.refund_account_number,
        receiver_bank_name: values.refund_bank_name,
        receiver_bank_branch: values.refund_bank_branch,
        sender_account_number: values.sender_account_number,
        sender_account_name: values.sender_account_name,
        existing_files: {
          attachments: values.kept_attachment_ids || [],
        },
        files: values.attachments?.length
          ? {
              attachments: values.attachments,
            }
          : undefined,
      }

      await updateRefund({ id: refundId, data: payload })
      toastService.success('Cập nhật đề nghị hoàn tiền thành công')
      navigate(APP_PATH.PROJECT_REFUND_BOOKING_DETAIL.replace(':id', String(refundId)))
    } catch (error: any) {
      toastService.error(extractErrorMessage(error) || 'Có lỗi xảy ra khi cập nhật đề nghị')
    }
  }

  // Chặn double-submit ở mức đồng bộ (§4.3c).
  const { submit: handleUpdateSubmit, isSubmitting } = useSubmitOnce(submitRefund)

  const isNotFound = !!error && (error as any)?.response?.status === 404

  // Map the detail API response back to form values taking information from bookingData first, then detailData
  const initialValues: Partial<RefundBookingFormValues> = detailData
    ? {
        booking_id: bookingData?.id ?? detailData.booking,
        customer_id: bookingData?.customer_detail?.id ?? detailData.customer,
        // Các field dưới đây từng đọc `(bookingData as any).customer_name / .customer_id_number /
        // .customer_phone / .customer_address / .sales_employee_detail` — KHÔNG field nào tồn tại
        // trên serializer `Booking`, nên mọi nhánh đều là `undefined` và `as any` đã che đi.
        // Nguồn thật: snapshot `cust_*` trên Booking/BookingRefundDetail, hoặc `customer_detail`.
        customer_name:
          bookingData?.customer_detail?.name ??
          bookingData?.cust_full_name ??
          detailData.customer_detail?.name ??
          detailData.cust_full_name,
        customer_cccd:
          bookingData?.customer_detail?.identify_number ??
          bookingData?.cust_id_number ??
          detailData.customer_detail?.identify_number ??
          detailData.cust_id_number,
        customer_phone: bookingData?.cust_phone || detailData.cust_phone || undefined,
        customer_address:
          bookingData?.cust_address_detail ||
          bookingData?.cust_business_address ||
          detailData.cust_address_detail ||
          detailData.cust_business_address ||
          undefined,
        sales_employee_id:
          bookingData?.sales_staff?.[0]?.employee_detail?.id ??
          detailData.sales_staff?.[0]?.employee_detail?.id,
        project_id: bookingData?.project_detail?.id ?? detailData.project,
        product_inventory_id:
          bookingData?.product_inventory_detail?.id ?? detailData.product_inventory ?? undefined,
        booking_amount: Number(bookingData?.payment_amount ?? detailData.booking_amount),
        booking_date: bookingData?.booking_date ? new Date(bookingData.booking_date) : undefined,
        sender_account_number: detailData.sender_account_number,
        sender_account_name: detailData.sender_account_name,
        refund_amount: Number(detailData.refund_amount),
        refund_account_name: detailData.receiver_account_name,
        refund_account_number: detailData.receiver_account_number,
        refund_bank_branch: detailData.receiver_bank_branch,
        refund_bank_name: detailData.receiver_bank_name,
        attachments: [], // New attachments
      }
    : {}

  return (
    <>
      <PageTitle enableBackButton />

      <DetailPageWrapper
        isLoading={isLoading || isLoadingBooking}
        isError={!!error}
        isNotFound={isNotFound}
        // Form chỉ render khi có ĐỦ `detailData && bookingData` (xem điều kiện ngay dưới), tức trang
        // cần HAI lượt GET-by-id: `useRefundBookingDetail(refundId)` → `GET /sales/booking-refunds/{id}/`
        // → `booking_refund.retrieve`, và `useBooking(bookingId)` → `GET /sales/bookings/{id}/`
        // → `booking.retrieve`. Thiếu mã nào cũng ra 403 rồi treo ở khung chờ tải.
        // KHÔNG chép lại `booking_refund.update` của route: route đã chặn mã đó nên tầng thứ hai
        // không thêm gì, mà người có quyền sửa vẫn ăn 403 nếu thiếu quyền ĐỌC.
        hasPermission={
          ability.can('retrieve', 'booking_refund') && ability.can('retrieve', 'booking')
        }
      >
        <div className="flex flex-col gap-4 px-7 py-6 pb-12">
          {!isLoading && !isLoadingBooking && detailData && bookingData && (
            <RefundBookingForm
              onSubmit={handleUpdateSubmit}
              initialValues={initialValues}
              isSubmitting={isSubmitting}
              isEdit={true}
            />
          )}
        </div>
      </DetailPageWrapper>
    </>
  )
}

export default RefundBookingEditPage
