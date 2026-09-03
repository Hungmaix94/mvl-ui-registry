import { FC, useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { Flex } from '@radix-ui/themes'
import { PageTitle, SummaryCard } from '@/components/ui'
import { PAGE_SIZE } from '@/constants/table'
import { useSearchParams } from 'react-router-dom'
import { useDeals } from '@/features/sales/deals/services/deal-service'
import DealFilterForm, {
  DealFilterFormRef,
  DealFilterFormData,
} from '@/features/sales/deals/components/DealFilterForm'
import DealTable from '@/features/sales/deals/components/DealTable'
import AppDialog from '@/components/dialog/AppDialog'
import { useDebounceValue } from 'usehooks-ts'
import { formatCurrencyVND } from '@/utils/common'
import { parseStringToDate, formatDateToApi } from '@/utils/date-utils'
import { useDealExport } from '@/features/sales/deals/_shares/hooks/useDealExport'
import { readDealListSummary } from '@/features/sales/deals/utils/deal-list-totals'
import { useAbility } from '@/lib/ability.ts'

/** Hiện khi response chưa có `summary` — thà nói "chưa có số" còn hơn hiện số 0 trông như thật. */
const NO_SUMMARY = '-'

const DealListPage: FC = () => {
  const ability = useAbility()
  const { openExportDialog, isExporting } = useDealExport()
  const [searchParams, setSearchParams] = useSearchParams()

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const formRef = useRef<DealFilterFormRef>(null)

  // Search input state
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  useEffect(() => {
    const actualUrlParams = new URLSearchParams(window.location.search)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''
    const hasPage = searchParams.has('page') || actualUrlParams.has('page')

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    } else if (!hasPage) {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
    setIsUrlReady(true)
  }, [searchParams, setSearchParams])

  // Sync search input when URL changes externally
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

  const pageParam = searchParams.get('page')
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1
  const pageSizeParam = searchParams.get('page_size')
  const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : PAGE_SIZE
  const ordering = searchParams.get('ordering') || '-created_at'

  const currentFilters = useMemo(() => {
    const filters: DealFilterFormData & { search?: string } & Record<string, any> = {}

    Array.from(searchParams.entries()).forEach(([key, value]) => {
      if (!['page', 'page_size', 'ordering'].includes(key)) {
        filters[key] = value
      }
    })

    if (filters.project) filters.project = parseInt(String(filters.project), 10)
    if (filters.investor) filters.investor = parseInt(String(filters.investor), 10)
    if (filters.sales_allocation)
      filters.sales_allocation = parseInt(String(filters.sales_allocation), 10)
    if (filters.f2_exchange) filters.f2_exchange = parseInt(String(filters.f2_exchange), 10)
    const employeeValues = searchParams.getAll('employee')
    if (employeeValues.length > 0) {
      const parsedEmployees = employeeValues
        .flatMap((v) => v.split(','))
        .map((v) => v.trim())
        .filter(Boolean)
      if (parsedEmployees.length > 0) {
        filters.employee = parsedEmployees
      }
    }
    if (filters.collaborator) filters.collaborator = parseInt(String(filters.collaborator), 10)
    if (filters.amt_agency_fee_min)
      filters.amt_agency_fee_min = parseInt(String(filters.amt_agency_fee_min), 10)
    if (filters.amt_agency_fee_max)
      filters.amt_agency_fee_max = parseInt(String(filters.amt_agency_fee_max), 10)

    return filters
  }, [searchParams])

  const queryParams = useMemo(() => {
    const params: Record<string, any> = {
      page,
      page_size: pageSize,
      ordering,
      code: currentFilters.code || undefined,
      unit_number: currentFilters.unit_number || undefined,
      project: currentFilters.project || undefined,
      investor: currentFilters.investor || undefined,
      status: currentFilters.status || undefined,
      sold: currentFilters.sold === 'true' ? true : undefined,
      deposit_month: currentFilters.deposit_month
        ? Number(currentFilters.deposit_month)
        : undefined,
      deposit_year: currentFilters.deposit_year ? Number(currentFilters.deposit_year) : undefined,
      sales_allocation: currentFilters.sales_allocation || undefined,
      f2_exchange: currentFilters.f2_exchange || undefined,
      collaborator: currentFilters.collaborator || undefined,
      amt_agency_fee_min: currentFilters.amt_agency_fee_min || undefined,
      amt_agency_fee_max: currentFilters.amt_agency_fee_max || undefined,
      search: currentFilters.search || undefined,
    }

    if (currentFilters.employee) {
      if (Array.isArray(currentFilters.employee)) {
        const empIds = currentFilters.employee
          .map((id) => Number(id))
          .filter((id) => !isNaN(id) && id > 0)
        if (empIds.length > 0) {
          params.employee = empIds
        }
      } else {
        const empId = Number(currentFilters.employee)
        if (!isNaN(empId) && empId > 0) {
          params.employee = [empId]
        }
      }
    }

    if (currentFilters.source_name) {
      params.source_name = currentFilters.source_name
    }

    if (currentFilters.deposit_date_from) {
      const dFrom = parseStringToDate(currentFilters.deposit_date_from)
      if (dFrom) params.deposit_date_from = formatDateToApi(dFrom)
    }
    if (currentFilters.deposit_date_to) {
      const dTo = parseStringToDate(currentFilters.deposit_date_to)
      if (dTo) params.deposit_date_to = formatDateToApi(dTo)
    }

    // Ngày làm phiếu TTGD — ĐỘC LẬP với ngày cọc ở trên, cộng thêm (AND), không ghi đè.
    if (currentFilters.transaction_sheet_date_from) {
      const tsFrom = parseStringToDate(currentFilters.transaction_sheet_date_from)
      if (tsFrom) params.transaction_sheet_date_from = formatDateToApi(tsFrom)
    }
    if (currentFilters.transaction_sheet_date_to) {
      const tsTo = parseStringToDate(currentFilters.transaction_sheet_date_to)
      if (tsTo) params.transaction_sheet_date_to = formatDateToApi(tsTo)
    }

    return params
  }, [page, pageSize, ordering, currentFilters])

  const { data: listResponse, isLoading, error } = useDeals(queryParams as any)

  // BE tính trên TOÀN BỘ tập kết quả sau filter và đã loại deal huỷ/bỏ — không cộng lại phía FE.
  const totals = useMemo(() => readDealListSummary(listResponse?.summary), [listResponse])

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

    const newParams = new URLSearchParams()
    newParams.set('page', '1')

    const currentPageSize = searchParams.get('page_size')
    if (currentPageSize) newParams.set('page_size', currentPageSize)

    const currentOrdering = searchParams.get('ordering')
    if (currentOrdering) newParams.set('ordering', currentOrdering)

    if (searchInput) newParams.set('search', searchInput)
    if (formData.code) newParams.set('code', formData.code)
    if (formData.unit_number) newParams.set('unit_number', formData.unit_number)
    if (formData.project) newParams.set('project', String(formData.project))
    if (formData.investor) newParams.set('investor', String(formData.investor))
    if (formData.status) newParams.set('status', formData.status)
    if (formData.sold) newParams.set('sold', formData.sold)
    if (formData.sales_allocation)
      newParams.set('sales_allocation', String(formData.sales_allocation))

    if (formData.deposit_month) newParams.set('deposit_month', formData.deposit_month)
    if (formData.deposit_year) newParams.set('deposit_year', formData.deposit_year)
    if (formData.deposit_date_from) newParams.set('deposit_date_from', formData.deposit_date_from)
    if (formData.deposit_date_to) newParams.set('deposit_date_to', formData.deposit_date_to)
    if (formData.transaction_sheet_date_from)
      newParams.set('transaction_sheet_date_from', formData.transaction_sheet_date_from)
    if (formData.transaction_sheet_date_to)
      newParams.set('transaction_sheet_date_to', formData.transaction_sheet_date_to)
    if (formData.f2_exchange) newParams.set('f2_exchange', String(formData.f2_exchange))
    if (formData.amt_agency_fee_min)
      newParams.set('amt_agency_fee_min', String(formData.amt_agency_fee_min))
    if (formData.amt_agency_fee_max)
      newParams.set('amt_agency_fee_max', String(formData.amt_agency_fee_max))
    if (formData.employee) {
      if (Array.isArray(formData.employee)) {
        const validIds = formData.employee.map((id) => String(id).trim()).filter(Boolean)
        if (validIds.length > 0) {
          newParams.set('employee', validIds.join(','))
        }
      } else if (String(formData.employee).trim()) {
        newParams.set('employee', String(formData.employee).trim())
      }
    }
    if (formData.collaborator) newParams.set('collaborator', String(formData.collaborator))
    if (formData.source_name) newParams.set('source_name', formData.source_name)

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [setSearchParams, searchInput, searchParams])

  const handlePageChange = useCallback(
    (newPage: number, newPageSize?: number) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev)
        const currentPage = Number(newParams.get('page') || '1')
        const currentPageSize = Number(newParams.get('page_size') || PAGE_SIZE)
        const targetPageSize = newPageSize || currentPageSize

        if (currentPage === newPage && currentPageSize === targetPageSize) {
          return prev
        }

        newParams.set('page', String(newPage))
        newParams.set('page_size', String(targetPageSize))
        return newParams
      })
    },
    [setSearchParams]
  )

  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (!field || !direction) {
        newParams.delete('ordering')
      } else {
        const orderingParam = direction === 'desc' ? `-${field}` : field
        newParams.set('ordering', orderingParam)
      }
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilters.sold) count++
    if (currentFilters.project) count++
    if (currentFilters.investor) count++
    if (currentFilters.status) count++
    if (currentFilters.code) count++
    if (currentFilters.unit_number) count++
    if (currentFilters.sales_allocation) count++
    if (currentFilters.deposit_month) count++
    if (currentFilters.deposit_year) count++
    if (currentFilters.deposit_date_from) count++
    if (currentFilters.deposit_date_to) count++
    if (currentFilters.transaction_sheet_date_from) count++
    if (currentFilters.transaction_sheet_date_to) count++
    if (currentFilters.f2_exchange) count++
    if (currentFilters.amt_agency_fee_min) count++
    if (currentFilters.amt_agency_fee_max) count++
    if (
      currentFilters.employee &&
      (!Array.isArray(currentFilters.employee) || currentFilters.employee.length > 0)
    ) {
      count++
    }
    if (currentFilters.collaborator) count++
    if (currentFilters.source_name) count++
    return count
  }, [currentFilters])

  const handleExport = useCallback(() => {
    if (isExporting) return
    void openExportDialog(queryParams)
  }, [isExporting, openExportDialog, queryParams])

  return (
    <>
      <PageTitle
        title="Danh sách giao dịch"
        handleSearch={handleSearch}
        searchValue={searchInput}
        searchPlaceholder="Tìm theo mã Deal..."
        searchClassName="!w-[350px]"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={ability.can('export', 'deal') ? handleExport : undefined}
      />

      <div className="px-7 pt-4">
        <div className="border-border-1 divide-border-1 mb-4 flex flex-wrap justify-start gap-4 divide-x overflow-hidden rounded-lg border bg-white px-4">
          <SummaryCard
            label="Tổng giao dịch"
            value={totals ? totals.dealCount : NO_SUMMARY}
            note={
              totals && totals.excludedDealCount > 0
                ? `${totals.excludedDealCount} giao dịch huỷ/bỏ không tính`
                : undefined
            }
          />
          <SummaryCard
            label="Tổng tiền trả sale"
            value={totals ? formatCurrencyVND(totals.salesFeeAmount) : NO_SUMMARY}
            color="text-action-primary-default"
          />
          <SummaryCard
            label="Tổng phí đại lý"
            value={totals ? formatCurrencyVND(totals.agencyFeeAmount) : NO_SUMMARY}
          />
          <SummaryCard
            label="Tổng doanh thu"
            value={totals ? formatCurrencyVND(totals.revenueAmount) : NO_SUMMARY}
          />
        </div>
      </div>

      <Flex flexGrow={'1'} direction="column" gap="4" className="pb-6">
        <DealTable
          data={listResponse?.results || []}
          isLoading={isLoading}
          error={error}
          onPageChange={handlePageChange}
          onSortingChange={handleSortingChange}
          pageCount={listResponse?.count ? Math.ceil(listResponse.count / pageSize) : 1}
          totalRecords={listResponse?.count || 0}
          currentPage={page}
          pageSize={pageSize}
          summary={listResponse?.summary}
          summaryRowCount={totals?.dealCount}
        />
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <DealFilterForm
            ref={formRef}
            initialValues={currentFilters}
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

export default DealListPage
