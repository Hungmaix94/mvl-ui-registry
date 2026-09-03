import BaseHistoriesPage from '@/pages/authenticated/object-history/BaseHistoriesPage'

const BookingContractHistoryPage = () => {
  return <BaseHistoriesPage path="/api/sales/bookings/{id}/histories/" />
}

export default BookingContractHistoryPage
