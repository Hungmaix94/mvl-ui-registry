import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { useDebounceValue } from 'usehooks-ts'

import AppDialog from '@/components/dialog/AppDialog'
import { PageTitle } from '@/components/ui'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes'
import { parsePositiveInt } from '@/utils/common'

import {
  FEE_SUPPORT_ACTION,
  FEE_SUPPORT_PERMISSION_SUBJECT,
} from '@/features/sales/fee-support-requests/constants/fee-support-request-constants'
import FeeSupportRequestFilter, {
  type FeeSupportRequestFilterRef,
} from '@/features/sales/fee-support-requests/components/FeeSupportRequestFilter'
import FeeSupportRequestTable from '@/features/sales/fee-support-requests/components/FeeSupportRequestTable'
import { useFeeSupportRequests } from '@/features/sales/fee-support-requests/services/fee-support-request-service'
import {
  applyFeeSupportRequestFilterToParams,
  buildFeeSupportRequestApiParams,
  clearFeeSupportRequestFilterFromParams,
  countFeeSupportRequestActiveFilters,
  getFeeSupportRequestFilterFormMountKey,
  getFeeSupportRequestFilterValues,
} from '@/features/sales/fee-support-requests/utils/fee-support-request-filter-params'

/**
 * Danh sách đề xuất hỗ trợ phí (18.8) — hiển thị cả 2 nguồn (App + Web).
 * Web TẠO phiếu web_secretary + creator SỬA được khi còn DRAFT/PENDING_TP_ADMIN
 * (86eyqf9m3, nút "Sửa" ở màn chi tiết) — không có thao tác nào trên danh sách
 * này. Vẫn không xoá (BR7 — từ chối là terminal, không phải xoá vật lý).
 */
const FeeSupportRequestListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const navigate = useNavigate()
  const ability = useAbility()

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const formRef = useRef<FeeSupportRequestFilterRef>(null)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)

  useEffect(() => {
    const actualUrlParams = new URLSearchParams(window.location.search)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    if (!isUrlReady) return

    const currentSearchTerm = searchParams.get('search') || ''
    if (debouncedSearch === currentSearchTerm) return

    const newParams = new URLSearchParams(searchParams)
    if (debouncedSearch) newParams.set('search', debouncedSearch)
    else newParams.delete('search')

    newParams.set('page', '1')
    setSearchParams(newParams, { replace: true })
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  const searchQueryKey = searchParams.toString()

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildFeeSupportRequestApiParams(new URLSearchParams(searchQueryKey))
  }, [isUrlReady, searchQueryKey])

  const { openExportDialog } = useAccountingListExport(
    '/api/sales/fee-support-requests/export/',
    'yeu-cau-ho-tro-phi.xlsx'
  )
  const handleExport = useCallback(() => {
    const { page: _page, page_size: _pageSize, ...filters } = apiParams ?? {}
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const {
    data: listResponse,
    isLoading,
    error,
  } = useFeeSupportRequests(apiParams, { enabled: isUrlReady && !!apiParams })

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  const totalRecords = listResponse?.count ?? 0
  const pageCount = pageSize ? Math.ceil(totalRecords / pageSize) : 0

  const currentFilters = useMemo(
    () => getFeeSupportRequestFilterValues(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const filterFormMountKey = useMemo(
    () => getFeeSupportRequestFilterFormMountKey(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const activeFilterCount = useMemo(
    () => countFeeSupportRequestActiveFilters(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const handleOpenFilterDialog = useCallback(() => {
    setFilterDialogOpenKey((k) => k + 1)
    setIsFilterDialogOpen(true)
  }, [])
  const handleCloseFilterDialog = useCallback(() => setIsFilterDialogOpen(false), [])

  const handleClearFilter = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleClearFilterFromTable = useCallback(() => {
    setSearchParams(clearFeeSupportRequestFilterFromParams(searchParams), { replace: true })
  }, [searchParams, setSearchParams])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    setSearchParams(
      applyFeeSupportRequestFilterToParams(formData, {
        pageSize: String(pageSize),
        search: searchParams.get('search'),
        ordering: searchParams.get('ordering'),
      }),
      { replace: true }
    )
    setIsFilterDialogOpen(false)
  }, [pageSize, searchParams, setSearchParams])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const nextPage = pageIndex + 1
      const urlPage = parsePositiveInt(searchParams.get('page')) ?? 1
      const urlPageSizeRaw = parsePositiveInt(searchParams.get('page_size'))
      const effectiveUrlPageSize =
        urlPageSizeRaw && PAGE_SIZES.includes(urlPageSizeRaw) ? urlPageSizeRaw : PAGE_SIZE

      if (nextPage === urlPage && newPageSize === effectiveUrlPageSize) return

      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(nextPage))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
      const mainEl = document.querySelector('main') || document.querySelector('[data-main-content]')
      if (mainEl) mainEl.scrollTop = 0
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [searchParams, setSearchParams]
  )

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.FEE_SUPPORT_PROPOSAL_CREATE)
  }, [navigate])

  return (
    <>
      <PageTitle
        handleSearch={setSearchInput}
        searchPlaceholder="Tìm theo mã đề xuất, lý do..."
        searchClassName="!w-[350px]"
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        handleCreateNew={
          ability.can(FEE_SUPPORT_ACTION.CREATE, FEE_SUPPORT_PERMISSION_SUBJECT)
            ? handleCreateNew
            : undefined
        }
        titleCreateNew="Tạo đề xuất"
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <FeeSupportRequestTable
            data={listResponse?.results ?? []}
            isLoading={isLoading}
            error={error}
            totalRecords={totalRecords}
            pageSize={pageSize}
            pageCount={pageCount}
            currentPageIndex={currentPage - 1}
            onPaginationChange={handlePaginationChange}
            hasFilter={activeFilterCount > 0}
            onClearFilter={handleClearFilterFromTable}
          />
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <FeeSupportRequestFilter
            key={`${filterDialogOpenKey}-${filterFormMountKey}`}
            ref={formRef}
            initialValues={currentFilters}
          />
        }
        onClearFilter={handleClearFilter}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default FeeSupportRequestListPage
