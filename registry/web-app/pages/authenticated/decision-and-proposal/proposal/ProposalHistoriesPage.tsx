import { useCallback, useMemo, useState } from 'react'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { useDebounceValue } from 'usehooks-ts'
import { useParams, useSearchParams } from 'react-router-dom'
import BaseHistoryTable from '@/features/object-history/components/BaseHistoryTable.tsx'
import { useHistoriesFilter } from '@/features/object-history/hooks/useHistoriesFilter.tsx'
import {
  getProposalHistoriesPath,
  urlParamToProposalType,
} from '@/features/decision-and-proposal/proposal/_shares/utils/proposal-type-utils.ts'
import { APP_PATH } from '@/routes'
import type { BreadcrumbItemData } from '@/components/ui/breadcrumb'

const ProposalHistoriesPage = () => {
  const { id } = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const proposalId = id ? Number(id) : NaN
  // Get proposal_type from query params
  const proposalTypeParam = searchParams.get('proposal_type') || ''
  const proposalType = urlParamToProposalType(proposalTypeParam)

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

  // Get histories path based on proposal type
  const historiesPath = proposalType ? getProposalHistoriesPath(proposalType) : null

  if (Number.isNaN(proposalId) || !proposalType || !historiesPath) {
    return (
      <div className="p-8">
        <div className="text-content-dark-3">ID hoặc loại đề xuất không hợp lệ.</div>
      </div>
    )
  }

  const activeFilterCount = Object.values(filterParams).filter((value) => {
    if (value === undefined || value === null || value === '') return false
    if (Array.isArray(value) && value.length === 0) return false
    return true
  }).length

  // Create custom breadcrumb
  const breadcrumb = useMemo<BreadcrumbItemData[]>(() => {
    const items: BreadcrumbItemData[] = [
      {
        label: 'Quản lý quyết định/đề xuất',
        // No href for first item
      },
      {
        label: 'Đề xuất',
        // No href for second item
      },
      {
        label: 'Danh sách cần duyệt',
        href: APP_PATH.PROPOSAL_MANAGE,
      },
    ]

    // Add proposal name if available
    if (objectName) {
      const detailPath = APP_PATH.PROPOSAL_MANAGE_DETAIL.replace(':id', String(proposalId))
      items.push({
        label: objectName,
        href: `${detailPath}?proposal_type=${proposalType}`,
      })
    }

    // Add "Lịch sử" as current page
    items.push({
      label: 'Lịch sử',
      isCurrentPage: true,
    })

    return items
  }, [objectName, proposalId, proposalType])

  return (
    <>
      <PageTitle
        breadcrumb={breadcrumb}
        handleFilter={handleFilter}
        filterBadgeCount={activeFilterCount}
        enableBackButton
      />
      <Flex flexGrow="1" direction="column" gap="4">
        <BaseHistoryTable
          channelId={proposalId}
          searchQuery={debouncedSearch}
          filterParams={filterParams}
          onClearAll={handleClearAll}
          path={historiesPath}
          objectName={setObjectName}
          detailSearchParams={proposalType ? { proposal_type: proposalType } : undefined}
        />
      </Flex>
    </>
  )
}

export default ProposalHistoriesPage
