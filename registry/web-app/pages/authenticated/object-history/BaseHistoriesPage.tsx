import { useCallback, useState } from 'react'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { useDebounceValue } from 'usehooks-ts'
import { useParams } from 'react-router-dom'
import BaseHistoryTable from '../../../features/object-history/components/BaseHistoryTable.tsx'
import { useHistoriesFilter } from '@/features/object-history/hooks/useHistoriesFilter.tsx'
import { HistoriesPaths } from '@/services/histories-service.ts'

const BaseHistoriesPage = ({
  path,
  idLabel: externalIdLabel,
}: {
  path: HistoriesPaths
  idLabel?: string
}) => {
  const { id } = useParams<{ id?: string }>()
  const channelId = id ? Number(id) : NaN
  const { openDialog, filterParams, clearFilter } = useHistoriesFilter()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch] = useDebounceValue(searchQuery, 500)

  const [objectName, setObjectName] = useState<string | null | undefined>()

  const handleFilter = useCallback(() => {
    openDialog()
  }, [openDialog])

  const handleClearAll = useCallback(() => {
    setSearchQuery('')
    clearFilter()
  }, [clearFilter])

  if (Number.isNaN(channelId)) {
    return (
      <div className="p-8">
        <div className="text-red-500">id không hợp lệ.</div>
      </div>
    )
  }

  const activeFilterCount = Object.values(filterParams).filter((value) => {
    if (value === undefined || value === null || value === '') return false
    if (Array.isArray(value) && value.length === 0) return false
    return true
  }).length

  return (
    <>
      <PageTitle
        idLabel={externalIdLabel ?? objectName ?? ''}
        handleFilter={handleFilter}
        filterBadgeCount={activeFilterCount}
        enableBackButton
      />
      <Flex flexGrow="1" direction="column" gap="4">
        <BaseHistoryTable
          channelId={channelId}
          searchQuery={debouncedSearch}
          filterParams={filterParams}
          onClearAll={handleClearAll}
          path={path}
          objectName={setObjectName}
        />
      </Flex>
    </>
  )
}

export default BaseHistoriesPage
