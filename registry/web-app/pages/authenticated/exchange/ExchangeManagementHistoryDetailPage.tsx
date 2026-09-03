import BaseHistoryDetailPage from '@/pages/authenticated/object-history/BaseHistoryDetailPage'
import { ApiPaths } from '@/api/schema'

export const ExchangeManagementHistoryDetailPage = ({ type = 'f2' }: { type?: 'f0' | 'f2' }) => {
  const viewType = type

  const path =
    viewType === 'f0'
      ? ApiPaths.realestate_source_exchanges_history_retrieve
      : ApiPaths.realestate_exchanges_history_retrieve

  return <BaseHistoryDetailPage path={path} />
}

export default ExchangeManagementHistoryDetailPage
