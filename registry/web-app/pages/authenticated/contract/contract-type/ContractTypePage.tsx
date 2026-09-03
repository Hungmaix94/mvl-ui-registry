import { useCallback, useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import ContractTypeTable from '@/features/contract/contract-type/view/ContractTypeTable.tsx'
import { useContractTypeDelete } from '@/features/contract/contract-type/_shares/hooks/useContractTypeDelete.tsx'
import { useContractTypeExport } from '@/features/contract/services/contract-type-service'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { useDebounceValue } from 'usehooks-ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import {
  useContractTypes,
  type GetContractTypesParams,
} from '@/features/contract/services/contract-type-service'
import { useContractTypeFilter } from '@/features/contract/contract-type/_shares/hooks/useContractTypeFilter.tsx'

/**
 * Build API params from URL search params
 */
function buildApiParamsFromUrl(searchParams: URLSearchParams): NonNullable<GetContractTypesParams> {
  const params: NonNullable<GetContractTypesParams> = {}

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
  const search = searchParams.get('search_term')
  if (search) {
    params.search = search
  }

  // Date filters
  const createdFrom = searchParams.get('created_at_from')
  if (createdFrom) {
    params.created_at__date__gte = createdFrom
  }
  const createdTo = searchParams.get('created_at_to')
  if (createdTo) {
    params.created_at__date__lte = createdTo
  }

  // Active filter
  const isActive = searchParams.get('is_active')
  if (isActive === 'true') {
    params.is_active = true
  } else if (isActive === 'false') {
    params.is_active = false
  }

  return params
}

export default function ContractTypePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search_term') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useContractTypeDelete()
  const { openExportDialog } = useContractTypeExport()

  // Filter hook with URL sync callback
  const handleFilterApply = useCallback(
    (filters: Record<string, any>) => {
      const newParams = new URLSearchParams(searchParams)

      // Reset to page 1 when filter changes
      newParams.set('page', '1')

      // Apply filters
      if (filters.created_at_from) {
        newParams.set('created_at_from', filters.created_at_from)
      } else {
        newParams.delete('created_at_from')
      }

      if (filters.created_at_to) {
        newParams.set('created_at_to', filters.created_at_to)
      } else {
        newParams.delete('created_at_to')
      }

      if (filters.is_active === 'true' || filters.is_active === 'false') {
        newParams.set('is_active', filters.is_active)
      } else {
        newParams.delete('is_active')
      }

      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const { openFilterModal, filterBadgeCount, clearFilter } =
    useContractTypeFilter(handleFilterApply)

  // Initialize URL with defaults if empty (only on direct access, not navigate back)
  useEffect(() => {
    // Check actual browser URL to avoid race condition with searchParams
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    // Check if this is a navigate back (has referrer from same origin) vs direct access
    const referrer = document.referrer
    const isNavigateBack = referrer && referrer.includes(window.location.origin)

    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    // Only apply defaults if URL is completely empty AND this is direct access (not navigate back)
    if (isUrlEmpty && !isNavigateBack) {
      const newParams = new URLSearchParams()

      // Set defaults: pagination only (no filters)
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))

      setSearchParams(newParams, { replace: true })
    } else if (isUrlEmpty && isNavigateBack) {
      // URL is empty but this is navigate back - still need pagination for API to work
      // Set minimal defaults (pagination only) to ensure API can be called
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))

      setSearchParams(newParams, { replace: true })
    } else {
      // URL has some params - only ensure page and page_size exist
      const needsUpdate = !hasPage || !hasPageSize
      if (needsUpdate) {
        const newParams = new URLSearchParams(searchParams)
        if (!hasPage) {
          newParams.set('page', '1')
        }
        if (!hasPageSize) {
          newParams.set('page_size', String(PAGE_SIZE))
        }

        setSearchParams(newParams, { replace: true })
      }
    }

    setIsUrlReady(true)
  }, []) // Only run once on mount

  // Sync search input when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search_term') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

  // Update URL when debounced search changes
  useEffect(() => {
    if (!isUrlReady) return

    const currentSearchTerm = searchParams.get('search_term') || ''
    if (debouncedSearch !== currentSearchTerm) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search_term', debouncedSearch)
      } else {
        newParams.delete('search_term')
      }
      // Reset to page 1 when search changes
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  // Build API params from URL
  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  // Call API with params derived from URL
  const {
    data: contractTypesData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useContractTypes(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

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
    navigate(APP_PATH.CONTRACT_TYPE_CREATE)
  }, [navigate])

  const handleDeleteContractType = useCallback(
    (contractType: any) => {
      openDeleteDialog(contractType)
    },
    [openDeleteDialog]
  )

  const handleExport = useCallback(() => {
    // Build filter params from URL for export
    const filterParams: Record<string, any> = {}
    const createdFrom = searchParams.get('created_at_from')
    const createdTo = searchParams.get('created_at_to')
    if (createdFrom) filterParams.created_at_from = createdFrom
    if (createdTo) filterParams.created_at_to = createdTo
    const isActive = searchParams.get('is_active')
    if (isActive === 'true') filterParams.is_active = true
    else if (isActive === 'false') filterParams.is_active = false

    openExportDialog({ ...filterParams, search: searchInput || undefined })
  }, [openExportDialog, searchInput, searchParams])

  // Handle clear all (search and filters) - reset to defaults (no filters)
  const handleClearFilter = useCallback(() => {
    setSearchInput('')
    clearFilter()
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [clearFilter, setSearchParams])

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = contractTypesData?.results ?? []
    const count = contractTypesData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [contractTypesData, pageSize])

  const isTableLoading = isLoading || isFetching || isRefetching

  return (
    <>
      <PageTitle
        title="Loại hợp đồng"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm loại hợp đồng"
        searchClassName={'!w-[356px]'}
        handleCreateNew={ability.can('create', 'contract_type') ? handleCreateNew : undefined}
        titleCreateNew="Tạo mới"
        handleExportBtnFull={ability.can('export', 'contract_type') ? handleExport : undefined}
        handleFilter={openFilterModal}
        filterBadgeCount={filterBadgeCount}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <ContractTypeTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onDeleteContractType={handleDeleteContractType}
          onClearFilter={handleClearFilter}
          hasFilter={!!searchInput || filterBadgeCount > 0}
        />
      </Flex>
    </>
  )
}
