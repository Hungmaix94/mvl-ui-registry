import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'
import { Flex } from '@radix-ui/themes'
import AppDialog from '@/components/dialog/AppDialog'
import { PageTitle } from '@/components/ui'
import AttendanceLogFilterForm, {
  type AttendanceLogFilterFormRef,
} from '@/features/attendance/attendance-log/components/AttendanceLogFilterForm'
import AttendanceLogTable from '@/features/attendance/attendance-log/components/AttendanceLogTable'
import {
  buildApiParamsFromUrl,
  parseFiltersFromUrl,
  getDefaultDateString,
} from '@/features/attendance/attendance-log/hooks/useAttendanceLogFilter'
import {
  useFirstAttendanceList,
  type AttendanceRecord,
} from '@/features/attendance/services/attendance-record-service'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { formatDateToApi } from '@/utils/date-utils'
import { useAbility } from '@/lib/ability'
import { useAttendanceLogExport } from '@/features/attendance/attendance-log/hooks/useAttendanceLogExport'

const AttendanceLogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<AttendanceLogFilterFormRef>(null)
  const { openExportDialog } = useAttendanceLogExport()

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 400)
  const ability = useAbility()

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
      newParams.set('date', getDefaultDateString())
      setSearchParams(newParams, { replace: true })
      setIsUrlReady(true)
    } else if (isUrlEmpty && isNavigateBack) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      newParams.set('date', getDefaultDateString())
      setSearchParams(newParams, { replace: true })
      setIsUrlReady(true)
    } else {
      const needsUpdate = !hasPage || !hasPageSize
      if (needsUpdate) {
        const newParams = new URLSearchParams(searchParams)
        if (!hasPage) newParams.set('page', '1')
        if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
        if (!hasDate) newParams.set('date', getDefaultDateString())
        setSearchParams(newParams, { replace: true })
      }
      setIsUrlReady(true)
    }
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
    data: attendanceResponse,
    isLoading,
    isFetching,
    isRefetching,
    error,
  } = useFirstAttendanceList(apiParams)

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

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search')
    if (search) newParams.set('search', search)

    const ordering = searchParams.get('ordering')
    if (ordering) newParams.set('ordering', ordering)

    newParams.set('date', rawValues.date ? formatDateToApi(rawValues.date) : getDefaultDateString())

    if (Array.isArray(rawValues.attendance_type) && rawValues.attendance_type.length > 0) {
      rawValues.attendance_type.forEach((value) => newParams.append('attendance_type', value))
    }
    if (Array.isArray(rawValues.approve_status) && rawValues.approve_status.length > 0) {
      newParams.set('approve_status__in', rawValues.approve_status.join(','))
    }
    if (rawValues.branch_id) newParams.set('branch', String(rawValues.branch_id))
    if (rawValues.block_id) newParams.set('block', String(rawValues.block_id))
    if (rawValues.department_id) newParams.set('department', String(rawValues.department_id))
    if (rawValues.position_id) newParams.set('position', String(rawValues.position_id))
    if (rawValues.employee_id) newParams.set('employee', String(rawValues.employee_id))

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [pageSize, searchParams, setSearchParams])

  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    newParams.set('date', getDefaultDateString())
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const filterBadgeCount = useMemo(() => {
    const filters = parseFiltersFromUrl(searchParams)
    let count = 0
    if (filters.branch_id) count++
    if (filters.block_id) count++
    if (filters.department_id) count++
    if (filters.position_id) count++
    if (filters.employee_id) count++
    if (filters.date) count++
    if (filters.attendance_type?.length) count++
    if (filters.approve_status?.length) count++
    return count
  }, [searchParams])

  const tableData: AttendanceRecord[] = useMemo(
    () => attendanceResponse?.results ?? [],
    [attendanceResponse?.results]
  )
  const totalRecords = attendanceResponse?.count ?? 0
  const pageCount = Math.ceil(totalRecords / pageSize) || 1

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = !!searchInput.trim() || filterBadgeCount > 0

  const handleExportBtnFull = useCallback(() => {
    openExportDialog(apiParams)
  }, [openExportDialog, apiParams])

  return (
    <>
      <PageTitle
        title="Log chấm công"
        handleSearch={handleSearch}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm theo mã/nhân viên"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={filterBadgeCount}
        handleExportBtnFull={
          ability.can('export', 'attendance_record') ? handleExportBtnFull : undefined
        }
      />

      <Flex flexGrow="1" direction="column" gap="4" className="pb-6">
        <AttendanceLogTable
          data={tableData}
          isLoading={isTableLoading}
          error={error ?? null}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          hasFilter={hasFilter}
          onClearFilter={handleClearAll}
        />
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={handleCloseFilterDialog}
        title="Bộ lọc"
        content={
          <AttendanceLogFilterForm
            ref={formRef}
            initialValues={filterInitialValues}
            isDialogOpen={isFilterDialogOpen}
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default AttendanceLogPage
