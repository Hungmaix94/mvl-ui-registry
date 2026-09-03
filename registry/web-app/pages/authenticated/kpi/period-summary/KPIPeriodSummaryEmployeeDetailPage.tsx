import { PageTitle } from '@/components/ui'
import { usePayrollKPIAssessmentsEmployees } from '@/features/kpi/services/kpi-assessment-service'
import { parsePositiveInt } from '@/utils'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { useParams, useSearchParams } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { Flex } from '@radix-ui/themes'
import KPIPeriodSummaryEmployeeListDetailWrapper from '@/features/kpi/kpi-period-summary/view-details/KPIPeriodSummaryEmployeeListDetailWrapper'

const KPIPeriodSummaryEmployeeDetailPage = () => {
  const { id: periodId, departmentId } = useParams<{ id: string; departmentId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  // Parse URL params
  const period = parsePositiveInt(periodId || '')
  const department = parsePositiveInt(departmentId || '')

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  // Sync search input when URL changes (browser back/forward)
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

  // Update URL search parameter when debounced search changes
  useEffect(() => {
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
  }, [debouncedSearch, searchParams, setSearchParams])

  // Pagination
  const page = parsePositiveInt(searchParams.get('page')) || 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Fetch data
  const {
    data: response,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = usePayrollKPIAssessmentsEmployees({
    period,
    department,
    page: page,
    page_size: pageSize,
    search: debouncedSearch || undefined,
    ordering: searchParams.get('ordering') || undefined,
  })

  const tableData = useMemo(() => {
    if (!response?.results) return []
    return response.results.map((item: any) => ({
      id: item.id,
      employee_id: item.employee?.code || '',
      employee_name: item.employee?.fullname || '',
      position_name: item.position?.name || '',
      total_employee_score: item.total_employee_score || '',
      total_manager_score: item.total_manager_score || 0,
      grade_manager: item.grade_manager || '',
      grade_hrm: item.grade_hrm || '',
    }))
  }, [response])

  const totalRecords = response?.count ?? 0
  const pageCount = Math.ceil(totalRecords / pageSize)

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

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
      if (direction) {
        const ordering = direction === 'asc' ? field : `-${field}`
        newParams.set('ordering', ordering)
      } else {
        newParams.delete('ordering')
      }
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleClearFilter = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))
    setSearchParams(newParams, { replace: true })
  }, [pageSize, setSearchParams])

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = !!searchInput && searchInput.trim() !== ''

  const firstResult = response?.results?.[0]
  const pageTitle = firstResult
    ? `Chi nhánh ${firstResult?.employee?.branch?.name} - Khối ${firstResult?.employee?.block?.name} - Phòng ban ${firstResult?.employee?.department?.name}`
    : 'Chi tiết nhân viên'

  return (
    <>
      <PageTitle
        title={pageTitle}
        handleSearch={handleSearch}
        searchPlaceholder="Tìm kiếm loại nhân viên"
        searchClassName="!w-[350px]"
        searchValue={searchInput}
        enableBackButton
      />
      <Flex flexGrow="1" direction="column" gap="6" className="pb-6">
        <KPIPeriodSummaryEmployeeListDetailWrapper
          data={tableData}
          isLoading={isTableLoading}
          error={error as any}
          pageCount={pageCount}
          totalRecords={totalRecords}
          currentPage={page}
          pageSize={pageSize}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onClearFilter={handleClearFilter}
          hasFilter={hasFilter}
        />
      </Flex>
    </>
  )
}

export default KPIPeriodSummaryEmployeeDetailPage
