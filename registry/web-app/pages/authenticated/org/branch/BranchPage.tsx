import { useCallback, useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import BranchTable from '@/features/org/branch/view/BranchTable.tsx'
import { useBranchDelete } from '@/features/org/branch/_shares/hooks/useBranchDelete.tsx'
import { useBranchExport } from '@/features/org/branch/_shares/hooks/useBranchExport.tsx'
import {
  type Branch,
  type GetBranchesExportParams,
  type GetBranchesParams,
  useBranches,
} from '@/features/org/services/branch-service'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { useDebounceValue } from 'usehooks-ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'

/**
 * Build API params from URL search params
 */
function buildApiParamsFromUrl(searchParams: URLSearchParams): NonNullable<GetBranchesParams> {
  const params: NonNullable<GetBranchesParams> = {}

  // Pagination
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  // Ordering - URL format: -field for desc, field for asc
  const ordering = searchParams.get('ordering')
  if (ordering) {
    params.ordering = ordering
  }

  // Search
  const search = searchParams.get('search')
  if (search) {
    params.search = search
  }

  return params
}

function buildBranchesExportParamsFromListQuery(
  apiParams: NonNullable<GetBranchesParams> | undefined
): GetBranchesExportParams {
  const exportParams: GetBranchesExportParams = {}

  if (apiParams) {
    if (apiParams.search && apiParams.search.trim() !== '') {
      exportParams.search = apiParams.search
    }
  }

  return exportParams
}

const OrgBranchManagement = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useBranchDelete()
  const { openExportDialog } = useBranchExport()

  // Initialize URL with defaults when empty; ensure page/page_size when URL has other params
  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else if (!hasPage || !hasPageSize) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    }

    setIsUrlReady(true)
  }, []) // Only run once on mount

  // Sync search input when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

  // Update URL when debounced search changes
  useEffect(() => {
    if (!isUrlReady) return

    const currentSearchTerm = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearchTerm) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch)
      } else {
        newParams.delete('search')
      }
      // Reset to page 1 when search changes
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady])

  // Build API params from URL
  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  // Call API with params derived from URL
  const {
    data: branchesData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useBranches(isUrlReady && apiParams ? apiParams : undefined)

  // Get pagination info from URL
  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Handle sorting change
  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (!field || !direction) {
        newParams.delete('ordering')
      } else {
        const ordering = direction === 'desc' ? `-${field}` : field
        newParams.set('ordering', ordering)
      }
      // Reset to page 1 when sorting changes
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.BRANCH_MANAGEMENT_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleDeleteBranch = useCallback(
    (branch: Branch) => {
      openDeleteDialog(branch)
    },
    [openDeleteDialog]
  )

  // Handle export
  const handleExport = useCallback(() => {
    openExportDialog(buildBranchesExportParamsFromListQuery(apiParams))
  }, [openExportDialog, apiParams])

  // Handle clear all (search) - reset to defaults
  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = branchesData?.results ?? []
    const count = branchesData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [branchesData, pageSize])

  const isTableLoading = isLoading || isFetching || isRefetching

  return (
    <>
      <PageTitle
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm theo mã chi nhánh, tên chi nhánh"
        searchClassName="!w-[350px]"
        handleCreateNew={ability.can('create', 'branch') ? handleCreateNew : undefined}
        handleExportBtnFull={ability.can('export', 'branch') ? handleExport : undefined}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <BranchTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onDeleteBranch={handleDeleteBranch}
          onClearFilter={handleClearAll}
          hasFilter={!!searchInput && searchInput.trim() !== ''}
        />
      </Flex>
    </>
  )
}

export default OrgBranchManagement
