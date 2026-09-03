import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import PayrollPeriodManagement from '@/features/payroll/period/view/PayrollPeriodManagement'
import AppDialog from '@/components/dialog/AppDialog'
import PayrollPeriodFilterForm, {
  PayrollPeriodFilterFormRef,
} from '@/features/payroll/period/view/PayrollPeriodFilterForm'
import { useSalaryPeriods } from '@/features/payroll/services/salary-period-service'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'
import { parsePositiveInt } from '@/utils/common'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { useAbility } from '@/lib/ability'
import { format, isValid, parse } from 'date-fns'

const PayrollPeriodPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()

  // Track if URL has been initialized
  const [isUrlReady, setIsUrlReady] = useState(false)

  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const filterFormRef = useRef<PayrollPeriodFilterFormRef>(null)

  // Local search input state (synced with URL)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  // Initialize URL with defaults if empty
  useEffect(() => {
    const hasPage = searchParams.has('page')
    const hasPageSize = searchParams.has('page_size')

    if (!hasPage || !hasPageSize) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    }
    setIsUrlReady(true)
  }, [])

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

  // Parse filters from URL
  const currentFilterParams = useMemo(() => {
    const monthStr = searchParams.get('month')
    let monthDate: Date | undefined
    if (monthStr) {
      const parsed = parse(monthStr, 'MM-yyyy', new Date())
      if (isValid(parsed)) {
        monthDate = parsed
      }
    }

    return {
      month: monthDate,
    }
  }, [searchParams])

  // Pagination from URL
  const page = parsePositiveInt(searchParams.get('page')) || 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // API Params
  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined

    return {
      search: searchParams.get('search') || undefined,
      month: currentFilterParams.month
        ? format(currentFilterParams.month, 'yyyy-MM-01')
        : undefined,
      page: page,
      page_size: pageSize,
    }
  }, [isUrlReady, searchParams, currentFilterParams, page, pageSize])

  // Fetch data from API
  const { data: salaryPeriodsData, isLoading } = useSalaryPeriods(apiParams, {
    enabled: !!apiParams,
  })

  // Normalize data for the table
  const tableData = useMemo(() => {
    if (!salaryPeriodsData?.results) return []
    return salaryPeriodsData.results.map((period: any) => ({
      ...period,
    }))
  }, [salaryPeriodsData])

  const totalRecords = useMemo(() => {
    return salaryPeriodsData?.count || 0
  }, [salaryPeriodsData])

  const handleCreateNew = () => {
    navigate(APP_PATH.PAYROLL_PERIOD_CREATE)
  }

  const handleFilter = () => {
    setIsFilterDialogOpen(true)
  }

  const handleApplyFilter = () => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams(searchParams)

    // Reset page
    newParams.set('page', '1')

    if (formData.month) {
      newParams.set('month', format(formData.month, 'MM-yyyy'))
    } else {
      newParams.delete('month')
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }

  const handleCloseFilterDialog = () => {
    setIsFilterDialogOpen(false)
  }

  const handleClearFilterInDialog = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams)
    },
    [searchParams, setSearchParams]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.month) count++
    return count
  }, [currentFilterParams])

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
  }

  return (
    <>
      <PageTitle
        handleSearch={handleSearchChange}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm kỳ lương..."
        searchClassName="!w-[350px]"
        handleCreateNew={ability.can('create', 'salary_period') ? handleCreateNew : undefined}
        titleCreateNew="Tạo kỳ lương"
        handleFilter={handleFilter}
        filterBadgeCount={activeFilterCount}
      />
      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <PayrollPeriodManagement
            data={tableData}
            isLoading={isLoading}
            page={page}
            pageSize={pageSize}
            totalRecords={totalRecords}
            onPaginationChange={handlePaginationChange}
          />
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <PayrollPeriodFilterForm ref={filterFormRef} initialValues={currentFilterParams} />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default PayrollPeriodPage
