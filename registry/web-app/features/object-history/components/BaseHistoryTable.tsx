import HistoryTable from '@/features/object-history/components/HistoryTable.tsx'
import { HistoriesPaths } from '@/services/histories-service.ts'

type BaseHistoriesProps = {
  channelId: number | string
  searchQuery?: string
  filterParams?: Record<string, any>
  onClearAll?: () => void
  path: HistoriesPaths
  objectName?: (objectName?: string | null) => void
  detailSearchParams?: Record<string, string>
}

const BaseHistoriesTable = ({
  channelId,
  searchQuery,
  filterParams,
  onClearAll,
  path,
  objectName,
  detailSearchParams,
}: BaseHistoriesProps) => {
  return (
    <HistoryTable
      path={path}
      extraParams={Number(channelId)}
      searchQuery={searchQuery}
      filterParams={filterParams}
      onClearAll={onClearAll}
      objectName={objectName}
      detailSearchParams={detailSearchParams}
    />
  )
}

export default BaseHistoriesTable
