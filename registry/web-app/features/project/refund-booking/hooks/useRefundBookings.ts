import {
  useBookingRefunds as useApiBookingRefunds,
  useBookingRefund as useApiBookingRefund,
  useCreateBookingRefund as useApiCreateBookingRefund,
  useUpdateBookingRefund as useApiUpdateBookingRefund,
  useDeleteBookingRefund as useApiDeleteBookingRefund,
  useApproveBookingRefund as useApiApproveBookingRefund,
  useRejectBookingRefund as useApiRejectBookingRefund,
  useAccountantApproveBookingRefund as useApiAccountantApproveBookingRefund,
  useAdminLeadApproveBookingRefund as useApiAdminLeadApproveBookingRefund,
  useTreasurerConfirmBookingRefund as useApiTreasurerConfirmBookingRefund,
  useConfirmRefundBookingPayment as useApiConfirmRefundBookingPayment,
  useConfirmRefundBookingInvestorRecovery as useApiConfirmRefundBookingInvestorRecovery,
  GetBookingRefundsParams,
} from '@/services/sales-service'

export const useRefundBookings = (
  params: GetBookingRefundsParams = {},
  options?: { enabled?: boolean }
) => {
  return useApiBookingRefunds(params, options)
}

export const useRefundBookingDetail = (id?: number) => {
  return useApiBookingRefund(id!)
}

export const useCreateRefundBooking = () => {
  return useApiCreateBookingRefund()
}

export const useUpdateRefundBooking = () => {
  return useApiUpdateBookingRefund()
}

export const useDeleteRefundBooking = () => {
  return useApiDeleteBookingRefund()
}

export const useApproveRefundBooking = () => {
  return useApiApproveBookingRefund()
}

export const useRejectRefundBooking = () => {
  return useApiRejectBookingRefund()
}

export const useAccountantApproveRefundBooking = () => {
  return useApiAccountantApproveBookingRefund()
}

export const useAdminLeadApproveRefundBooking = () => {
  return useApiAdminLeadApproveBookingRefund()
}

export const useTreasurerConfirmRefundBooking = () => {
  return useApiTreasurerConfirmBookingRefund()
}

/**
 * Bước "xác nhận đã chi" — thay cho thao tác "Thủ quỹ xác nhận" cũ.
 *
 * Endpoint cũ `treasurer-confirm` vẫn sống một release nhưng đã đòi đúng payload
 * này, nên không có lý do gì gọi nó nữa.
 */
export const useConfirmRefundPayment = () => {
  return useApiConfirmRefundBookingPayment()
}

/** Cổng CĐT: xác nhận đã đòi lại được tiền, để mở đường cho bước chi. */
export const useConfirmRefundInvestorRecovery = () => {
  return useApiConfirmRefundBookingInvestorRecovery()
}
