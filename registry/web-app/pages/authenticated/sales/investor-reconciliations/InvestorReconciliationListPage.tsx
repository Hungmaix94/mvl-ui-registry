import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { useDebounceValue } from 'usehooks-ts'
import { useQueryClient } from '@tanstack/react-query'
import { type DateRange } from 'react-day-picker'

import { PageTitle } from '@/components/ui'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { APP_PATH } from '@/routes'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import AppDialog from '@/components/dialog/AppDialog'

import InvestorReconciliationListTable from '@/features/sales/investor-reconciliations/components/InvestorReconciliationListTable'
import InvestorReconciliationFilter, {
  type InvestorReconciliationFilterRef,
  type InvestorReconciliationFilterFormData,
} from '@/features/sales/investor-reconciliations/components/InvestorReconciliationFilter'
import {
  useInvestorReconciliationSheets,
  useConfirmInvestorReconciliationSheet,
  type GetInvestorReconciliationSheetsParams,
} from '@/features/sales/investor-reconciliations/services/investor-reconciliation-service'
import type { InvestorReconciliationSheet } from '@/features/sales/investor-reconciliations/types/investor-reconciliation'
import { useAbility } from '@/lib/ability'
import useInvestorReconciliationDelete from '@/features/sales/investor-reconciliations/hooks/useInvestorReconciliationDelete'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { showReconciliationWarnings } from '@/features/sales/investor-reconciliations/utils/reconciliation-warnings'

const SIMPLE_FILTER_KEYS = [
  'status',
  'source_type',
  'investor',
  'source_exchange',
  'project',
] as const

const DATE_RANGE_GROUPS: ReadonlyArray<readonly [string, string]> = [
  ['reconciliation_date_from', 'reconciliation_date_to'],
] as const

function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetInvestorReconciliationSheetsParams> {
  const params: NonNullable<GetInvestorReconciliationSheetsParams> = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  params.page_size =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const ordering = searchParams.get('ordering')
  if (ordering) params.ordering = ordering

  const search = searchParams.get('search')
  if (search) params.search = search

  const status = searchParams.get('status')
  if (status) params.status = status as never

  const sourceType = searchParams.get('source_type')
  if (sourceType) params.source_type = sourceType as never

  const investor = parsePositiveInt(searchParams.get('investor'))
  if (investor) params.investor = investor

  const sourceExchange = parsePositiveInt(searchParams.get('source_exchange'))
  if (sourceExchange) params.source_exchange = sourceExchange

  const project = parsePositiveInt(searchParams.get('project'))
  if (project) params.project = project

  const reconFrom = searchParams.get('reconciliation_date_from')
  if (reconFrom) params.reconciliation_date_from = reconFrom
  const reconTo = searchParams.get('reconciliation_date_to')
  if (reconTo) params.reconciliation_date_to = reconTo

  return params
}

function readDateRange(
  searchParams: URLSearchParams,
  fromKey: string,
  toKey: string
): DateRange | undefined {
  const from = parseDateFromApi(searchParams.get(fromKey))
  const to = parseDateFromApi(searchParams.get(toKey))
  if (!from && !to) return undefined
  return { from, to } as DateRange
}

function getFilterValuesFromUrl(
  searchParams: URLSearchParams
): InvestorReconciliationFilterFormData {
  const filterData: InvestorReconciliationFilterFormData = {}
  if (searchParams.has('status')) filterData.status = searchParams.get('status') ?? null
  if (searchParams.has('source_type'))
    filterData.source_type = searchParams.get('source_type') ?? null
  if (searchParams.has('investor'))
    filterData.investor = parsePositiveInt(searchParams.get('investor')) ?? null
  if (searchParams.has('source_exchange'))
    filterData.source_exchange = parsePositiveInt(searchParams.get('source_exchange')) ?? null
  if (searchParams.has('project'))
    filterData.project = parsePositiveInt(searchParams.get('project')) ?? null

  const reconRange = readDateRange(
    searchParams,
    'reconciliation_date_from',
    'reconciliation_date_to'
  )
  if (reconRange) filterData.reconciliationDateRange = reconRange

  return filterData
}

/** Stable key so the filter form remounts when the dialog opens (same pattern as URL-driven filter state). */
function getFilterFormMountKey(searchParams: URLSearchParams): string {
  return [
    ...SIMPLE_FILTER_KEYS.map((k) => searchParams.get(k) ?? ''),
    ...DATE_RANGE_GROUPS.flatMap(([from, to]) => [
      searchParams.get(from) ?? '',
      searchParams.get(to) ?? '',
    ]),
  ].join('|')
}

type InvestorReconciliationListPageProps = {
  /**
   * Route overrides so the identical 2.0 list (`investor-reconciliations-v2`) can reuse this page
   * unmodified while its "Tạo phiếu"/"Chi tiết"/"Chỉnh sửa" targets point at the 2.0 screens.
   *
   * Defaults are the CANONICAL paths, which post-cutover (2026-07-30) are the 2.0 screens — v1 is
   * de-routed. `editPathTemplate` defaults to DETAIL, not `APP_PATH.INVESTOR_RECONCILIATION_EDIT`:
   * that constant survives only so the de-routed v1 files still compile and has NO route behind it,
   * so defaulting to it would hand any future caller a dead "Chỉnh sửa" link.
   */
  createPath?: string
  detailPathTemplate?: string
  editPathTemplate?: string
}

const InvestorReconciliationListPage = ({
  createPath = APP_PATH.INVESTOR_RECONCILIATION_CREATE,
  detailPathTemplate = APP_PATH.INVESTOR_RECONCILIATION_DETAIL,
  editPathTemplate = APP_PATH.INVESTOR_RECONCILIATION_DETAIL,
}: InvestorReconciliationListPageProps = {}) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const ability = useAbility()

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const formRef = useRef<InvestorReconciliationFilterRef>(null)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)

  const { openDeleteDialog } = useInvestorReconciliationDelete()
  const queryClient = useQueryClient()
  const { mutateAsync: confirmSheet } = useConfirmInvestorReconciliationSheet()

  // Initialize URL with defaults
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
  }, [])

  // Sync search input when URL changes (browser back/forward)
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
    if (debouncedSearch === currentSearchTerm) return

    const newParams = new URLSearchParams(searchParams)
    if (debouncedSearch) newParams.set('search', debouncedSearch)
    else newParams.delete('search')

    newParams.set('page', '1')
    setSearchParams(newParams, { replace: true })
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  // `searchParams` identity can change without the query string changing; key memos off the serialized URL.
  const searchQueryKey = searchParams.toString()

  // Build API params directly from URL (single source of truth)
  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(new URLSearchParams(searchQueryKey))
  }, [isUrlReady, searchQueryKey])

  const { openExportDialog } = useAccountingListExport(
    '/api/sales/investor-reconciliation-sheets/export/',
    'doi-chieu-chu-dau-tu.xlsx'
  )
  const handleExport = useCallback(() => {
    const { page: _page, page_size: _pageSize, ...filters } = apiParams ?? {}
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const {
    data: listResponse,
    isLoading,
    error,
  } = useInvestorReconciliationSheets(apiParams, { enabled: isUrlReady && !!apiParams })

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  const totalRecords = listResponse?.count ?? 0
  const pageCount = pageSize ? Math.ceil(totalRecords / pageSize) : 0

  // Filter values from URL (for filter dialog initial values)
  const currentFilters = useMemo(
    () => getFilterValuesFromUrl(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const filterFormMountKey = useMemo(
    () => getFilterFormMountKey(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const activeFilterCount = useMemo(() => {
    const params = new URLSearchParams(searchQueryKey)
    let count = 0
    for (const key of SIMPLE_FILTER_KEYS) {
      if (params.has(key)) count++
    }
    for (const [from, to] of DATE_RANGE_GROUPS) {
      if (params.has(from) || params.has(to)) count++
    }
    return count
  }, [searchQueryKey])

  const handleOpenFilterDialog = useCallback(() => {
    setFilterDialogOpenKey((k) => k + 1)
    setIsFilterDialogOpen(true)
  }, [])
  const handleCloseFilterDialog = useCallback(() => setIsFilterDialogOpen(false), [])

  const handleClearFilter = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search')
    if (search) newParams.set('search', search)

    const ordering = searchParams.get('ordering')
    if (ordering) newParams.set('ordering', ordering)

    for (const key of SIMPLE_FILTER_KEYS) {
      const value = formData[key]
      if (value !== undefined && value !== null) {
        newParams.set(key, String(value))
      }
    }

    const writeRange = (range: DateRange | null | undefined, fromKey: string, toKey: string) => {
      if (range?.from) newParams.set(fromKey, formatDateToApi(range.from))
      if (range?.to) newParams.set(toKey, formatDateToApi(range.to))
    }
    writeRange(
      formData.reconciliationDateRange,
      'reconciliation_date_from',
      'reconciliation_date_to'
    )

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [pageSize, searchParams, setSearchParams])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const nextPage = pageIndex + 1
      const urlPage = parsePositiveInt(searchParams.get('page')) ?? 1
      const urlPageSizeRaw = parsePositiveInt(searchParams.get('page_size'))
      const effectiveUrlPageSize =
        urlPageSizeRaw && PAGE_SIZES.includes(urlPageSizeRaw) ? urlPageSizeRaw : PAGE_SIZE

      // TanStack Table auto-resets page index when `data` changes; that calls this handler with
      // the same page as the URL and spams setSearchParams → "Throttling navigation" (crbug.com/1038223).
      if (nextPage === urlPage && newPageSize === effectiveUrlPageSize) {
        return
      }

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

  const handleConfirm = useCallback(
    async (record: InvestorReconciliationSheet) => {
      try {
        const result = await confirmSheet(record.id)
        queryClient.invalidateQueries({ queryKey: ['sales', 'investor-reconciliation-sheets'] })
        toastService.success('Phê duyệt đối chiếu thành công')
        showReconciliationWarnings(result)
      } catch (error) {
        toastService.error(extractErrorMessage(error))
      }
    },
    [confirmSheet, queryClient]
  )

  const handleCreateNew = useCallback(() => {
    navigate(createPath)
  }, [navigate, createPath])

  return (
    <>
      <PageTitle
        handleSearch={setSearchInput}
        searchPlaceholder="Tìm kiếm"
        searchClassName="!w-[350px]"
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        handleCreateNew={
          ability.can('create', 'investor_reconciliation_sheet') ? handleCreateNew : undefined
        }
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <InvestorReconciliationListTable
            data={(listResponse?.results ?? []) as any}
            isLoading={isLoading}
            error={error}
            totalRecords={totalRecords}
            pageSize={pageSize}
            pageCount={pageCount}
            currentPageIndex={currentPage - 1}
            onPaginationChange={handlePaginationChange}
            onDelete={openDeleteDialog}
            onConfirm={handleConfirm}
            summary={listResponse?.summary}
            detailPathTemplate={detailPathTemplate}
            editPathTemplate={editPathTemplate}
          />
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <InvestorReconciliationFilter
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

export default InvestorReconciliationListPage
