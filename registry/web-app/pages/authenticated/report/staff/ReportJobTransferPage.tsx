import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { useDebounceValue } from 'usehooks-ts'
import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import JobTransferReportTable from '@/features/report/staff/job-transfer/JobTransferReportTable.tsx'
import JobTransferReportFilterForm, {
  type JobTransferReportFilterFormRef,
  type JobTransferReportFilterFormValues,
} from '@/features/report/staff/job-transfer/JobTransferReportFilterForm.tsx'
import {
  useJobTransferReport,
  useExportJobTransferReport,
  type GetJobTransferReportParams,
} from '@/features/report/services/hrm-report-service'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { useAbility } from '@/lib/ability.ts'

function buildApiParamsFromUrl(searchParams: URLSearchParams): GetJobTransferReportParams {
  const params: GetJobTransferReportParams = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  params.page_size =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const search = searchParams.get('search')
  if (search) params.search = search

  const fromDate = searchParams.get('date_from')
  if (fromDate) params.date_from = fromDate
  const toDate = searchParams.get('date_to')
  if (toDate) params.date_to = toDate

  const oldBranch = parsePositiveInt(searchParams.get('old_branch'))
  if (oldBranch) params.old_branch = oldBranch
  const oldBlock = parsePositiveInt(searchParams.get('old_block'))
  if (oldBlock) params.old_block = oldBlock
  const oldDepartment = parsePositiveInt(searchParams.get('old_department'))
  if (oldDepartment) params.old_department = oldDepartment

  const newBranch = parsePositiveInt(searchParams.get('new_branch'))
  if (newBranch) params.new_branch = newBranch
  const newBlock = parsePositiveInt(searchParams.get('new_block'))
  if (newBlock) params.new_block = newBlock
  const newDepartment = parsePositiveInt(searchParams.get('new_department'))
  if (newDepartment) params.new_department = newDepartment

  return params
}

const ReportJobTransferPage = () => {
  const ability = useAbility()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterFormRef = useRef<JobTransferReportFilterFormRef>(null)
  const [isUrlReady, setIsUrlReady] = useState(false)

  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  // Initialize pagination defaults when URL is empty
  useEffect(() => {
    const isUrlEmpty = searchParams.toString() === ''
    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    }
    setIsUrlReady(true)
  }, [])

  // Sync URL search param with debounced search input
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

  useEffect(() => {
    if (!isUrlReady) return
    const currentSearch = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearch) {
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

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [isUrlReady, searchParams])

  const { data: reportData, isLoading } = useJobTransferReport(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const { rows, totalRecords, pageCount } = useMemo(
    () => ({
      rows: reportData?.results ?? [],
      totalRecords: reportData?.count ?? 0,
      pageCount: Math.ceil((reportData?.count ?? 0) / pageSize) || 1,
    }),
    [reportData, pageSize]
  )

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search')
    if (search) newParams.set('search', search)

    const fromDate = formData.fromDate ? formatDateToApi(formData.fromDate) : undefined
    const toDate = formData.toDate ? formatDateToApi(formData.toDate) : undefined
    if (fromDate) newParams.set('date_from', fromDate)
    if (toDate) newParams.set('date_to', toDate)

    if (formData.old_branch) newParams.set('old_branch', String(formData.old_branch))
    if (formData.old_block) newParams.set('old_block', String(formData.old_block))
    if (formData.old_department) newParams.set('old_department', String(formData.old_department))
    if (formData.new_branch) newParams.set('new_branch', String(formData.new_branch))
    if (formData.new_block) newParams.set('new_block', String(formData.new_block))
    if (formData.new_department) newParams.set('new_department', String(formData.new_department))

    setSearchParams(newParams, { replace: true })
    setIsFilterOpen(false)
  }, [pageSize, searchParams, setSearchParams])

  const handleClearFilter = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  const filterBadgeCount = useMemo(() => {
    let count = 0
    if (searchParams.get('date_from') || searchParams.get('date_to')) count++
    if (searchParams.get('old_branch')) count++
    if (searchParams.get('old_block')) count++
    if (searchParams.get('old_department')) count++
    if (searchParams.get('new_branch')) count++
    if (searchParams.get('new_block')) count++
    if (searchParams.get('new_department')) count++
    return count
  }, [searchParams])

  const formInitialValues: JobTransferReportFilterFormValues = useMemo(
    () => ({
      fromDate: parseDateFromApi(searchParams.get('date_from')),
      toDate: parseDateFromApi(searchParams.get('date_to')),
      old_branch: parsePositiveInt(searchParams.get('old_branch')) ?? undefined,
      old_block: parsePositiveInt(searchParams.get('old_block')) ?? undefined,
      old_department: parsePositiveInt(searchParams.get('old_department')) ?? undefined,
      new_branch: parsePositiveInt(searchParams.get('new_branch')) ?? undefined,
      new_block: parsePositiveInt(searchParams.get('new_block')) ?? undefined,
      new_department: parsePositiveInt(searchParams.get('new_department')) ?? undefined,
    }),
    [searchParams]
  )

  const { openExportDialog } = useExportJobTransferReport()
  const handleExport = useCallback(() => {
    if (!apiParams) return
    openExportDialog(apiParams)
  }, [apiParams, openExportDialog])

  return (
    <>
      <PageTitle
        title="Báo cáo điều chuyển công tác"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm theo mã, tên nhân viên"
        searchClassName="!w-[356px]"
        handleFilter={() => setIsFilterOpen(true)}
        filterBadgeCount={filterBadgeCount}
        handleExportBtnFull={
          ability.can('export', 'job_transfer_report') ? handleExport : undefined
        }
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <JobTransferReportTable
            data={rows}
            isLoading={isLoading}
            enablePagination
            pageSize={pageSize}
            manualPagination
            currentPageIndex={currentPage - 1}
            pageCount={pageCount}
            totalRecords={totalRecords}
            onPaginationChange={handlePaginationChange}
          />
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        title="Bộ lọc"
        content={
          <JobTransferReportFilterForm
            key={isFilterOpen ? 'open' : 'closed'}
            ref={filterFormRef}
            initialValues={formInitialValues}
          />
        }
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterOpen(false)}
        onClearFilter={handleClearFilter}
      />
    </>
  )
}

export default ReportJobTransferPage
