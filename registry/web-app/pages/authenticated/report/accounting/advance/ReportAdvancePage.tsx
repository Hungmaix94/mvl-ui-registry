import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'
import { Button, PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import AdvanceReportTable from '@/features/report/accounting/advance/AdvanceReportTable'
import AdvanceReportFilter, {
  type AdvanceReportFilterFormData,
  type AdvanceReportFilterRef,
} from '@/features/report/accounting/advance/AdvanceReportFilter'
import AdvanceReportFilterSummary from '@/features/report/accounting/advance/AdvanceReportFilterSummary'
import {
  useAdvanceSettlementReport,
  type GetAdvanceSettlementParams,
} from '@/features/accounting/reports/services/report-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import { parsePositiveInt } from '@/utils/common'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { IconDownload } from '@/assets/icons'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'

const EXPORT_PATH = '/api/accounting/reports/advance-settlement/'
const EXPORT_FILENAME = 'theo-doi-du-no-hoan-ung.xlsx'

export default function ReportAdvancePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)

  const formRef = useRef<AdvanceReportFilterRef>(null)

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const searchVal = searchParams.get('search') ?? ''
  const branchVal = parsePositiveInt(searchParams.get('branch'))
  const blockVal = parsePositiveInt(searchParams.get('block'))
  const departmentVal = parsePositiveInt(searchParams.get('department'))
  const dateFromVal = searchParams.get('date_from') ?? ''
  const dateToVal = searchParams.get('date_to') ?? ''

  // ===== Search lives on PageTitle (CR 21.3), URL stays the single source of truth =====
  const [searchInput, setSearchInput] = useState(searchVal)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  // Browser back/forward and "Xoá bộ lọc" rewrite the URL; pull the box back in line with it.
  useEffect(() => {
    if (searchVal !== searchInput && searchVal !== debouncedSearch) {
      setSearchInput(searchVal)
    }
    // Reacting to the URL only — adding the local state here would fight the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchVal])

  useEffect(() => {
    if (!isUrlReady) return
    const currentSearch = searchParams.get('search') ?? ''
    if (debouncedSearch === currentSearch) return

    const newParams = new URLSearchParams(searchParams)
    if (debouncedSearch) newParams.set('search', debouncedSearch)
    else newParams.delete('search')
    newParams.set('page', '1')
    setSearchParams(newParams, { replace: true })
    // `searchParams` is read fresh above; depending on it would re-fire this on every URL change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, isUrlReady])

  // ===== Resolve org ids from the URL into names for the report header band =====
  const branchQuery = useBranchForFilter(branchVal ?? 0)
  const blockQuery = useBlockForFilter(blockVal ?? 0, branchVal)
  const departmentQuery = useDepartmentForFilter(departmentVal ?? 0, branchVal, blockVal)

  const branchName = branchQuery.data?.name
  const blockName = blockQuery.data?.name
  const departmentName = departmentQuery.data?.name

  const currentFilters = useMemo<AdvanceReportFilterFormData>(() => {
    const from = parseDateFromApi(dateFromVal)
    const to = parseDateFromApi(dateToVal)
    return {
      branch: branchVal,
      block: blockVal,
      department: departmentVal,
      branchName,
      blockName,
      departmentName,
      date_range: from || to ? { from, to } : null,
    }
  }, [
    branchVal,
    blockVal,
    departmentVal,
    branchName,
    blockName,
    departmentName,
    dateFromVal,
    dateToVal,
  ])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (branchVal) count++
    if (blockVal) count++
    if (departmentVal) count++
    if (dateFromVal || dateToVal) count++
    return count
  }, [branchVal, blockVal, departmentVal, dateFromVal, dateToVal])

  useEffect(() => {
    const actualUrlParams = new URLSearchParams(window.location.search)
    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    if (!hasPage || !hasPageSize) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else {
      setIsUrlReady(true)
    }
  }, [searchParams, setSearchParams])

  /**
   * Filtering and paging are the server's job since the BE half of CR 21.3 — the page used to
   * pull the whole (1000-capped) set and slice it in the browser, which under-reported silently
   * once the data outgrew the cap.
   */
  const apiParams = useMemo<GetAdvanceSettlementParams>(
    () => ({
      page: currentPage,
      page_size: pageSize,
      ...(searchVal ? { search: searchVal } : {}),
      ...(branchVal ? { branch: branchVal } : {}),
      ...(blockVal ? { block: blockVal } : {}),
      ...(departmentVal ? { department: departmentVal } : {}),
      ...(dateFromVal ? { date_from: dateFromVal } : {}),
      ...(dateToVal ? { date_to: dateToVal } : {}),
    }),
    [currentPage, pageSize, searchVal, branchVal, blockVal, departmentVal, dateFromVal, dateToVal]
  )

  const { data, isLoading, isError, refetch } = useAdvanceSettlementReport(apiParams, {
    enabled: isUrlReady,
  })

  const { openExportDialog, isExporting } = useAccountingListExport(EXPORT_PATH, EXPORT_FILENAME)

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

      const mainEl = document.querySelector('main')
      if (mainEl) mainEl.scrollTop = 0
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [searchParams, setSearchParams]
  )

  const handleApplyFilter = useCallback(() => {
    const values = formRef.current?.getValues()
    if (!values) return

    const newParams = new URLSearchParams(searchParams)

    const setOrDelete = (key: string, value?: string) => {
      if (value) newParams.set(key, value)
      else newParams.delete(key)
    }

    setOrDelete('branch', values.branch ? String(values.branch) : undefined)
    setOrDelete('block', values.block ? String(values.block) : undefined)
    setOrDelete('department', values.department ? String(values.department) : undefined)
    setOrDelete('date_from', formatDateToApi(values.date_range?.from ?? undefined))
    setOrDelete('date_to', formatDateToApi(values.date_range?.to ?? undefined))

    newParams.set('page', '1')
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  const handleClearFilter = useCallback(() => {
    formRef.current?.clearForm()
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('branch')
    newParams.delete('block')
    newParams.delete('department')
    newParams.delete('date_from')
    newParams.delete('date_to')
    newParams.set('page', '1')
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
    setFilterDialogOpenKey((prev) => prev + 1)
  }, [searchParams, setSearchParams])

  const handleExport = useCallback(() => {
    openExportDialog({
      ...(searchVal ? { search: searchVal } : {}),
      ...(branchVal ? { branch: branchVal } : {}),
      ...(blockVal ? { block: blockVal } : {}),
      ...(departmentVal ? { department: departmentVal } : {}),
      ...(dateFromVal ? { date_from: dateFromVal } : {}),
      ...(dateToVal ? { date_to: dateToVal } : {}),
    })
  }, [openExportDialog, searchVal, branchVal, blockVal, departmentVal, dateFromVal, dateToVal])

  const rows = useMemo(() => data?.results ?? [], [data])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="21.3 Theo dõi dư nợ hoàn ứng của nhân sự"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Mã/Tên nhân sự, mã phiếu, mã căn"
        searchClassName="!w-[356px]"
        handleFilter={() => {
          setFilterDialogOpenKey((prev) => prev + 1)
          setIsFilterDialogOpen(true)
        }}
        filterBadgeCount={activeFilterCount}
        customActions={
          <Button
            variant="secondary"
            size="small"
            leftIcon={<IconDownload className="h-4 w-4" />}
            onClick={handleExport}
            disabled={isLoading || isExporting}
            loading={isExporting}
          >
            Xuất Excel
          </Button>
        }
      />

      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-0">
        <div className="flex flex-col gap-3 px-7">
          <AdvanceReportFilterSummary
            dateFrom={dateFromVal}
            dateTo={dateToVal}
            branchId={branchVal}
            blockId={blockVal}
            departmentId={departmentVal}
            branchName={branchName}
            blockName={blockName}
            departmentName={departmentName}
          />
          {/* Queries have no global error toast, so a failed request would otherwise land the
              user on "Không có dữ liệu" — a money report reading empty when it actually failed. */}
          {isError ? (
            <div
              role="alert"
              className="border-action-primary-red-default bg-data-red-disabled text-data-red-default flex items-center justify-between gap-4 rounded-lg border border-solid px-4 py-3"
            >
              <p className="typo-body-sm-regular">
                Không tải được dữ liệu báo cáo. Số liệu bên dưới chưa phản ánh đúng thực tế.
              </p>
              <Button variant="secondary" size="small" onClick={() => refetch()}>
                Thử lại
              </Button>
            </div>
          ) : null}
        </div>

        <AdvanceReportTable
          data={rows}
          summary={data?.summary}
          isLoading={isLoading}
          pageSize={pageSize}
          currentPageIndex={currentPage - 1}
          totalRecords={data?.count ?? 0}
          onPaginationChange={handlePaginationChange}
        />
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <AdvanceReportFilter
            key={`list-${filterDialogOpenKey}`}
            ref={formRef}
            initialValues={currentFilters}
          />
        }
        onClearFilter={handleClearFilter}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </div>
  )
}
