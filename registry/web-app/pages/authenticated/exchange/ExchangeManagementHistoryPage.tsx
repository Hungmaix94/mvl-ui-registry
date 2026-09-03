import BaseHistoriesPage from '@/pages/authenticated/object-history/BaseHistoriesPage'
import { ApiPaths } from '@/api/schema'

export const ExchangeManagementHistoryPage = ({ type = 'f2' }: { type?: 'f0' | 'f2' }) => {
  const viewType = type

  const path =
    viewType === 'f0'
      ? ApiPaths.realestate_source_exchanges_histories_retrieve
      : ApiPaths.realestate_exchanges_histories_retrieve

  return <BaseHistoriesPage path={path} />
}

export default ExchangeManagementHistoryPage
