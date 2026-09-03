import { useCallback, useEffect, useMemo, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import KPIUnitEvaluationTable from '@/features/kpi/unit-evaluation/view/KPIUnitEvaluationTable'
import {
  type GetPayrollKPIPeriodsParams,
  usePayrollKPIPeriods,
} from '@/features/kpi/services/kpi-assessment-service'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils'
import { useSearchParams } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'

function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetPayrollKPIPeriodsParams> {
  const params: NonNullable<GetPayrollKPIPeriodsParams> = {}

  // Pagination
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  // Search
  const search = searchParams.get('search')
  if (search) {
    params.search = search
  }

  return params
}

const KPIUnitEvaluationPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const [isUrlReady, setIsUrlReady] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  useEffect(() => {
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
      // URL is empty but this is navigate back - don't apply defaults, just mark as ready
      // The URL will be preserved as-is (empty) or restored by browser history
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
  }, [])

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
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  // Build API params from URL
  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  // Call API with params derived from URL
  const {
    data: criteriaData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = usePayrollKPIPeriods(apiParams)

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = criteriaData?.results ?? []
    const count = criteriaData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [criteriaData, pageSize])

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

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = !!searchInput && searchInput.trim() !== ''

  return (
    <>
      <PageTitle
        handleSearch={handleSearch}
        searchPlaceholder="Tìm kiếm kỳ đánh giá"
        searchClassName="!w-[350px]"
        searchValue={searchInput}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className="pb-6">
        <KPIUnitEvaluationTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          totalRecords={totalRecords}
          currentPage={currentPage}
          pageSize={pageSize}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          hasFilter={hasFilter}
        />
      </Flex>
    </>
  )
}

export default KPIUnitEvaluationPage
