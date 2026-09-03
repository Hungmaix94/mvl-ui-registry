import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { useDebounceValue } from 'usehooks-ts'
import { useQueryClient } from '@tanstack/react-query'
import { type DateRange } from 'react-day-picker'

import { PageTitle } from '@/components/ui'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import AppDialog from '@/components/dialog/AppDialog'

import CTVReconciliationListTable from '@/features/sales/ctv-reconciliations/components/CTVReconciliationListTable'
import CTVReconciliationFilter, {
  type CTVReconciliationFilterRef,
  type CTVReconciliationFilterFormData,
} from '@/features/sales/ctv-reconciliations/components/CTVReconciliationFilter'
import {
  useCTVReconciliationSheets,
  useDeleteCTVReconciliationSheet,
  type CTVReconciliationSheetList,
  type GetCTVReconciliationSheetsParams,
} from '@/features/sales/ctv-reconciliations/services/ctv-reconciliation-sheet-service'
import toastService from '@/services/toast-service'

const SIMPLE_FILTER_KEYS = ['status', 'collaborator', 'project', 'tax_code'] as const

const DATE_RANGE_GROUPS: ReadonlyArray<readonly [string, string]> = [
  ['reconciliation_date_from', 'reconciliation_date_to'],
] as const

function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetCTVReconciliationSheetsParams> {
  const params: NonNullable<GetCTVReconciliationSheetsParams> = {}

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

  const collaborator = parsePositiveInt(searchParams.get('collaborator'))
  if (collaborator) params.collaborator = collaborator

  const project = parsePositiveInt(searchParams.get('project'))
  if (project) params.project = project

  const tax_code = searchParams.get('tax_code')
  // TODO(FA-6996): Remove `as any` once backend is deployed and schema.ts is regenerated with `tax_code__icontains`.
  if (tax_code) (params as any).tax_code__icontains = tax_code

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

function getFilterValuesFromUrl(searchParams: URLSearchParams): CTVReconciliationFilterFormData {
  const filterData: CTVReconciliationFilterFormData = {}
  if (searchParams.has('status')) filterData.status = searchParams.get('status') ?? null
  if (searchParams.has('collaborator'))
    filterData.collaborator = parsePositiveInt(searchParams.get('collaborator')) ?? null
  if (searchParams.has('project'))
    filterData.project = parsePositiveInt(searchParams.get('project')) ?? null
  if (searchParams.has('tax_code')) filterData.tax_code = searchParams.get('tax_code') ?? null

  const reconRange = readDateRange(
    searchParams,
    'reconciliation_date_from',
    'reconciliation_date_to'
  )
  if (reconRange) filterData.reconciliationDateRange = reconRange

  return filterData
}

function getFilterFormMountKey(searchParams: URLSearchParams): string {
  return [
    ...SIMPLE_FILTER_KEYS.map((k) => searchParams.get(k) ?? ''),
    ...DATE_RANGE_GROUPS.flatMap(([from, to]) => [
      searchParams.get(from) ?? '',
      searchParams.get(to) ?? '',
    ]),
  ].join('|')
}

const CTVReconciliationListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const formRef = useRef<CTVReconciliationFilterRef>(null)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)

  const queryClient = useQueryClient()
  const { mutateAsync: deleteRecord } = useDeleteCTVReconciliationSheet()

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

  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
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
    return buildApiParamsFromUrl(new URLSearchParams(searchQueryKey))
  }, [isUrlReady, searchQueryKey])

  const { openExportDialog } = useAccountingListExport(
    '/api/sales/ctv-reconciliation-sheets/export/',
    'doi-chieu-ctv.xlsx'
  )
  const handleExport = useCallback(() => {
    const { page: _page, page_size: _pageSize, ...filters } = apiParams ?? {}
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const {
    data: listResponse,
    isLoading,
    error,
  } = useCTVReconciliationSheets(apiParams, { enabled: isUrlReady && !!apiParams })

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  const totalRecords = listResponse?.count ?? 0
  const pageCount = pageSize ? Math.ceil(totalRecords / pageSize) : 0

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

  const handleClearFilterFromTable = useCallback(() => {
    const newParams = new URLSearchParams(searchParams)
    for (const key of SIMPLE_FILTER_KEYS) newParams.delete(key)
    for (const [from, to] of DATE_RANGE_GROUPS) {
      newParams.delete(from)
      newParams.delete(to)
    }
    newParams.set('page', '1')
    setSearchParams(newParams, { replace: true })
  }, [searchParams, setSearchParams])

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

  const handleDelete = useCallback(
    async (record: CTVReconciliationSheetList) => {
      try {
        await deleteRecord(record.id)
        queryClient.invalidateQueries({ queryKey: ['sales', 'ctv-reconciliation-sheets'] })
        toastService.success('Xóa đối chiếu CTV thành công')
      } catch {
        toastService.error('Xóa đối chiếu CTV thất bại')
      }
    },
    [deleteRecord, queryClient]
  )

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
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <CTVReconciliationListTable
            data={listResponse?.results ?? []}
            isLoading={isLoading}
            error={error}
            totalRecords={totalRecords}
            pageSize={pageSize}
            pageCount={pageCount}
            currentPageIndex={currentPage - 1}
            onPaginationChange={handlePaginationChange}
            onDelete={handleDelete}
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
          <CTVReconciliationFilter
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

export default CTVReconciliationListPage
