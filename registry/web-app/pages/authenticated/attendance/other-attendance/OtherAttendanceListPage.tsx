import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'
import { Flex } from '@radix-ui/themes'
import AppDialog from '@/components/dialog/AppDialog'
import { PageTitle } from '@/components/ui'
import OtherAttendanceFilterForm, {
  type OtherAttendanceFilterFormRef,
} from '@/features/attendance/other-attendance/components/OtherAttendanceFilterForm'
import OtherAttendanceTable from '@/features/attendance/other-attendance/components/OtherAttendanceTable'
import {
  buildApiParamsFromUrl,
  parseFiltersFromUrl,
} from '@/features/attendance/other-attendance/hooks/useOtherAttendanceFilter'
import { useAttendanceRecords } from '@/features/attendance/services/attendance-record-service'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { formatDateToApi } from '@/utils/date-utils'

const OtherAttendanceListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<OtherAttendanceFilterFormRef>(null)

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 400)

  // Initialize URL with defaults if empty (only on direct access, not navigate back)
  useEffect(() => {
    // Check actual browser URL to avoid race condition with searchParams
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
      setIsUrlReady(true)
    } else if (isUrlEmpty && isNavigateBack) {
      // URL is empty but this is navigate back - still need pagination for API to work
      // Set minimal defaults (pagination only) to ensure API can be called
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
      setIsUrlReady(true)
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
      setIsUrlReady(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

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
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  // Build API params from URL
  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  // Call API with params derived from URL
  const {
    data: attendanceResponse,
    isLoading,
    isFetching,
    isRefetching,
    error,
  } = useAttendanceRecords(apiParams)

  // Parse current filter params from URL for dialog
  const filterInitialValues = useMemo(() => {
    return parseFiltersFromUrl(searchParams)
  }, [searchParams])

  // Get pagination info from URL
  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

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

  // Handle search input change
  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  // Handle filter dialog open
  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  // Handle filter dialog close (cancel)
  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  // Handle clear filter in dialog (only clears form, doesn't close dialog or call API)
  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  // Handle apply filter (updates URL and closes dialog)
  const handleApplyFilter = useCallback(async () => {
    const isValid = await formRef.current?.trigger()
    if (isValid === false) return

    const rawValues = formRef.current?.getRawValues() || {}
    const apiValues = formRef.current?.getValues() || {}

    const newParams = new URLSearchParams()

    // Keep non-filter params
    newParams.set('page', '1') // Reset to page 1 when filter changes
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search')
    if (search) {
      newParams.set('search', search)
    }

    const ordering = searchParams.get('ordering')
    if (ordering) {
      newParams.set('ordering', ordering)
    }

    // Add filter params from form
    if (apiValues.branch) newParams.set('branch', String(apiValues.branch))
    if (apiValues.block) newParams.set('block', String(apiValues.block))
    if (apiValues.department) newParams.set('department', String(apiValues.department))
    if (apiValues.position) newParams.set('position', String(apiValues.position))
    if (apiValues.employee) newParams.set('employee', String(apiValues.employee))

    if (rawValues.date_range?.from) {
      newParams.set('date_from', formatDateToApi(rawValues.date_range.from))
    }

    if (rawValues.date_range?.to) {
      newParams.set('date_to', formatDateToApi(rawValues.date_range.to))
    }

    if (rawValues.approve_status && rawValues.approve_status.length > 0) {
      newParams.set('approve_status', rawValues.approve_status.join(','))
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [pageSize, searchParams, setSearchParams])

  // Handle clear all (search + filters) - reset to defaults (no filters)
  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  // Calculate active filter count
  const filterBadgeCount = useMemo(() => {
    const filters = parseFiltersFromUrl(searchParams)
    let count = 0
    if (filters.branch_id) count++
    if (filters.block_id) count++
    if (filters.department_id) count++
    if (filters.position_id) count++
    if (filters.employee_id) count++
    if (filters.date_range?.from || filters.date_range?.to) count++
    if (filters.approve_status && filters.approve_status.length > 0) count++
    return count
  }, [searchParams])

  // Transform data for table
  const tableData = useMemo(() => attendanceResponse?.results ?? [], [attendanceResponse?.results])
  const totalRecords = attendanceResponse?.count ?? 0
  const pageCount = Math.ceil(totalRecords / pageSize) || 1

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = !!searchInput.trim() || filterBadgeCount > 0

  return (
    <>
      <PageTitle
        handleSearch={handleSearch}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm theo mã/nhân viên"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={filterBadgeCount}
      />

      <Flex flexGrow="1" direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <OtherAttendanceTable
            data={tableData}
            isLoading={isTableLoading}
            error={error as Error | null}
            pageCount={pageCount}
            pageSize={pageSize}
            currentPage={currentPage}
            totalRecords={totalRecords}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            hasFilter={hasFilter}
            onClearFilter={handleClearAll}
          />
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={handleCloseFilterDialog}
        title="Bộ lọc"
        content={<OtherAttendanceFilterForm ref={formRef} initialValues={filterInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default OtherAttendanceListPage
