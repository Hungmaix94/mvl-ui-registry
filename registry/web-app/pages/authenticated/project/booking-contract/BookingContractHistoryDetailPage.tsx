import BaseHistoryDetailPage from '@/pages/authenticated/object-history/BaseHistoryDetailPage'

const BookingContractHistoryDetailPage = () => {
  return <BaseHistoryDetailPage path="/api/sales/bookings/{id}/history/{log_id}/" />
}

export default BookingContractHistoryDetailPage
