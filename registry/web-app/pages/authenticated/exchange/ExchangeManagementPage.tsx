import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import PartnerFilterForm, {
  type PartnerFilterFormRef,
} from '@/components/commons/filters/PartnerFilterForm.tsx'
import {
  countPartnerFilters,
  parsePartnerFiltersFromUrl,
  serializePartnerFiltersToUrl,
} from '@/components/commons/filters/partner-filter-params.ts'

import { useExchangeDelete } from '@/features/exchange/_shares/hooks/useExchangeDelete.tsx'
import ExchangeTable from '@/features/exchange/view/ExchangeTable.tsx'
import { APP_PATH } from '@/routes'
import type { Exchange } from '@/services/realestate-service.ts'
import {
  type GetExchangesParams,
  useExchanges,
  useSourceExchanges,
} from '@/services/realestate-service.ts'
import { useDebounceValue } from 'usehooks-ts'
import { useAbility } from '@/lib/ability.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'

/**
 * Build API params from URL search params
 */
// Exported cho test: hợp đồng URL -> API param của tile sinh nhật (CR STT27) đi qua đây.
export function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetExchangesParams> {
  const params: NonNullable<GetExchangesParams> = {}

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

  // CR STT27 (86eykqg66): tile "sinh nhật" trên dashboard điều hướng tới đây kèm
  // `established_month` + `is_active`. URL dùng `established_month` (1-12) cho người đọc,
  // API nhận `established_date__month` — cùng kiểu dịch như `birthday_month` của màn nhân sự.
  // Thiếu đoạn này thì màn đích hiện TOÀN BỘ danh sách và con số trên tile thành nói dối.
  const establishedMonth = parsePositiveInt(searchParams.get('established_month'))
  if (establishedMonth && establishedMonth >= 1 && establishedMonth <= 12) {
    params.established_date__month = establishedMonth
  }

  const isActive = searchParams.get('is_active')
  if (isActive === 'true' || isActive === 'false') {
    params.is_active = isActive === 'true'
  }

  // Ngày trong tháng — đi kèm `established_date__month` thì ghim đúng một ngày dương lịch bất kể
  // năm; đứng một mình thì lọc ngày đó ở mọi tháng. BE: PR #3440.
  const establishedDay = parsePositiveInt(searchParams.get('established_day'))
  if (establishedDay && establishedDay <= 31) {
    params.established_date__day = establishedDay
  }

  return params
}

const ExchangeManagementPage = ({ type = 'f2' }: { type?: 'f0' | 'f2' }) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const ability = useAbility()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useExchangeDelete(type)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const formRef = useRef<PartnerFilterFormRef>(null)

  // Initialize URL with defaults if empty
  useEffect(() => {
    // Check actual browser URL to avoid race condition with searchParams
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
    } else {
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

  // Sync search input when URL changes
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
    data: f2Data,
    isLoading: f2Loading,
    error: f2Error,
    isFetching: f2Fetching,
    isRefetching: f2Refetching,
  } = useExchanges(apiParams, {
    enabled: isUrlReady && !!apiParams && type === 'f2',
  })

  const {
    data: f0Data,
    isLoading: f0Loading,
    error: f0Error,
    isFetching: f0Fetching,
    isRefetching: f0Refetching,
  } = useSourceExchanges(apiParams, {
    enabled: isUrlReady && !!apiParams && type === 'f0',
  })

  // Dynamic assignment based on type
  const exchangesData = type === 'f2' ? f2Data : f0Data
  const isLoading = type === 'f2' ? f2Loading : f0Loading
  const isFetching = type === 'f2' ? f2Fetching : f0Fetching
  const isRefetching = type === 'f2' ? f2Refetching : f0Refetching
  const error = type === 'f2' ? f2Error : f0Error

  // Điều kiện lọc hiện hành đọc thẳng từ URL — cũng là giá trị nạp lại vào dialog khi mở.
  const currentFilterParams = useMemo(
    () => parsePartnerFiltersFromUrl(searchParams),
    [searchParams]
  )
  const activeFilterCount = useMemo(
    () => countPartnerFilters(currentFilterParams),
    [currentFilterParams]
  )

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = exchangesData?.results ?? []
    const count = exchangesData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [exchangesData, pageSize])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (!field || !direction) {
        newParams.delete('ordering')
      } else {
        const ordering = direction === 'desc' ? `-${field}` : field
        newParams.set('ordering', ordering)
      }
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const handleCreateNew = useCallback(() => {
    const path =
      type === 'f0'
        ? APP_PATH.SOURCE_EXCHANGE_MANAGEMENT_CREATE
        : APP_PATH.EXCHANGE_MANAGEMENT_CREATE
    navigate(path, {
      state: { from: window.location.pathname + window.location.search, type },
    })
  }, [navigate, type])

  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return
    setSearchParams(serializePartnerFiltersToUrl(formData, searchParams), { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  const handleDeleteExchange = useCallback(
    (exchange: Exchange) => {
      openDeleteDialog(exchange)
    },
    [openDeleteDialog]
  )

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = (!!searchInput && searchInput.trim() !== '') || activeFilterCount > 0

  return (
    <>
      <PageTitle
        handleSearch={handleSearch}
        searchPlaceholder="Tìm theo mã, tên, MST sàn"
        searchClassName="!w-[350px]"
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleCreateNew={ability.can('create', 'exchange') ? handleCreateNew : undefined}
      />

      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <ExchangeTable
          data={tableData as any}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onDeleteExchange={handleDeleteExchange}
          onClearFilter={handleClearAll}
          hasFilter={hasFilter}
          type={type}
        />
      </Flex>
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <PartnerFilterForm
            ref={formRef}
            initialValues={currentFilterParams}
            isOpen={isFilterDialogOpen}
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default ExchangeManagementPage
