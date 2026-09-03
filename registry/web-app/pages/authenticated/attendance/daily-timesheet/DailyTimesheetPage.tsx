import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { useDebounceValue } from 'usehooks-ts'
import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import DailyTimesheetFilterForm, {
  type DailyTimesheetFilterFormRef,
} from '@/features/attendance/daily-timesheet/components/DailyTimesheetFilterForm'
import DailyTimesheetTable from '@/features/attendance/daily-timesheet/components/DailyTimesheetTable'
import {
  buildApiParamsFromUrl,
  parseFiltersFromUrl,
} from '@/features/attendance/daily-timesheet/hooks/useDailyTimesheetFilter'
import { useDailyTimesheetEntries } from '@/features/attendance/services/timesheet-service'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { formatDateToApi } from '@/utils/date-utils'

const DailyTimesheetPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<DailyTimesheetFilterFormRef>(null)

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 400)

  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    const referrer = document.referrer
    const isNavigateBack = referrer && referrer.includes(window.location.origin)

    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')
    const hasDate = searchParams.has('date') || actualUrlParams.has('date')

    if (isUrlEmpty && !isNavigateBack) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      newParams.set('date', formatDateToApi(new Date()))
      setSearchParams(newParams, { replace: true })
      setIsUrlReady(true)
    } else {
      const newParams = new URLSearchParams(searchParams)
      let needsUpdate = false

      if (!hasPage) {
        newParams.set('page', '1')
        needsUpdate = true
      }
      if (!hasPageSize) {
        newParams.set('page_size', String(PAGE_SIZE))
        needsUpdate = true
      }
      if (!hasDate) {
        newParams.set('date', formatDateToApi(new Date()))
        needsUpdate = true
      }

      if (needsUpdate) {
        setSearchParams(newParams, { replace: true })
      }
      setIsUrlReady(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  const {
    data: dailyTimesheetResponse,
    isLoading,
    isFetching,
    isRefetching,
    error,
  } = useDailyTimesheetEntries(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

  const filterInitialValues = useMemo(() => parseFiltersFromUrl(searchParams), [searchParams])

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

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

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(async () => {
    const isValid = await formRef.current?.trigger()
    if (isValid === false) return

    const rawValues = formRef.current?.getRawValues() || {}
    const apiValues = formRef.current?.getValues() || {}

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search')
    if (search) {
      newParams.set('search', search)
    }

    const ordering = searchParams.get('ordering')
    if (ordering) {
      newParams.set('ordering', ordering)
    }

    if (apiValues.branch) newParams.set('branch', String(apiValues.branch))
    if (apiValues.block) newParams.set('block', String(apiValues.block))
    if (apiValues.department) newParams.set('department', String(apiValues.department))
    if (apiValues.position) newParams.set('position', String(apiValues.position))

    if (rawValues.date) {
      newParams.set('date', formatDateToApi(rawValues.date))
    }

    if (Array.isArray(rawValues.statuses) && rawValues.statuses.length > 0) {
      const validStatuses = rawValues.statuses.filter((status) => typeof status === 'string')
      if (validStatuses.length > 0) {
        newParams.set('status__in', validStatuses.join(','))
      }
    }

    if (apiValues.first_log_method) {
      newParams.set('first_log_method', String(apiValues.first_log_method))
    }
    if (apiValues.first_log_project) {
      newParams.set('first_log_project', String(apiValues.first_log_project))
    }
    if (apiValues.first_log_biometric_device) {
      newParams.set('first_log_biometric_device', String(apiValues.first_log_biometric_device))
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [pageSize, searchParams, setSearchParams])

  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    newParams.set('date', formatDateToApi(new Date()))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const filterBadgeCount = useMemo(() => {
    const filters = parseFiltersFromUrl(searchParams)
    let count = 0
    if (filters.branch_id) count++
    if (filters.block_id) count++
    if (filters.department_id) count++
    if (filters.position_id) count++
    if (filters.date) count++
    if (filters.statuses && filters.statuses.length > 0) count++
    if (filters.first_log_method) count++
    if (filters.first_log_project) count++
    if (filters.first_log_biometric_device) count++
    return count
  }, [searchParams])

  const tableData = useMemo(
    () => dailyTimesheetResponse?.results ?? [],
    [dailyTimesheetResponse?.results]
  )
  const totalRecords = dailyTimesheetResponse?.count ?? 0
  const pageCount = Math.ceil(totalRecords / pageSize) || 1

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = !!searchInput.trim() || filterBadgeCount > 0

  return (
    <>
      <PageTitle
        handleSearch={handleSearch}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm theo mã nhân viên"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={filterBadgeCount}
      />

      <Flex flexGrow="1" direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <DailyTimesheetTable
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
        content={<DailyTimesheetFilterForm ref={formRef} initialValues={filterInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default DailyTimesheetPage
