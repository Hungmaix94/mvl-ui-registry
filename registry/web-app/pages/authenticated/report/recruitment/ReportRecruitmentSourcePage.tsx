import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReportRecruitmentSourceTable from '@/features/report/recruitment/resource/view/ReportRecruitmentSourceTable'
import RecruitmentSourceFilterForm, {
  type RecruitmentSourceFilterFormRef,
} from '@/features/report/recruitment/resource/components/RecruitmentSourceFilterForm'
import { PageTitle } from '@/components/ui'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import AppDialog from '@/components/dialog/AppDialog'
import { Box, Flex, Text } from '@radix-ui/themes'
import { startOfMonth } from 'date-fns'
import { type GetRecruitmentSourceReportParams, useRecruitmentSourceReport } from '@/services'
import { useExportRecruitmentSourceReport } from '@/features/report/services/hrm-report-service'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import { formatDate, formatDateToApi } from '@/utils/date-utils'
import { parsePositiveInt } from '@/utils/common'
import { cn } from '@/utils'

/**
 * Validate date string format (YYYY-MM-DD)
 */
function isValidDateString(dateStr: string): boolean {
  if (!dateStr) return false
  // Check format YYYY-MM-DD
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (!datePattern.test(dateStr)) return false
  // Parse and validate
  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) return false
  // Ensure the parsed date matches the input string (prevents invalid dates like 2025-12-32)
  const [year, month, day] = dateStr.split('-').map(Number)
  return (
    parsed.getFullYear() === year && parsed.getMonth() + 1 === month && parsed.getDate() === day
  )
}

/**
 * Parse filter params from URL for form display
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams) {
  const params: {
    fromDate?: Date
    toDate?: Date
    branchId?: number
    blockId?: number
    departmentId?: number
  } = {}

  // Date range - only parse if valid format
  const fromDate = searchParams.get('from_date')
  const toDate = searchParams.get('to_date')
  if (fromDate) {
    // Validate format YYYY-MM-DD before parsing
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (datePattern.test(fromDate)) {
      const parsed = new Date(fromDate)
      if (!isNaN(parsed.getTime())) {
        // Double check parsed date matches input
        const [year, month, day] = fromDate.split('-').map(Number)
        if (
          parsed.getFullYear() === year &&
          parsed.getMonth() + 1 === month &&
          parsed.getDate() === day
        ) {
          params.fromDate = parsed
        }
      }
    }
  }
  if (toDate) {
    // Validate format YYYY-MM-DD before parsing
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (datePattern.test(toDate)) {
      const parsed = new Date(toDate)
      if (!isNaN(parsed.getTime())) {
        // Double check parsed date matches input
        const [year, month, day] = toDate.split('-').map(Number)
        if (
          parsed.getFullYear() === year &&
          parsed.getMonth() + 1 === month &&
          parsed.getDate() === day
        ) {
          params.toDate = parsed
        }
      }
    }
  }

  // Cascade IDs
  params.branchId = parsePositiveInt(searchParams.get('branch')) ?? undefined
  params.blockId = parsePositiveInt(searchParams.get('block')) ?? undefined
  params.departmentId = parsePositiveInt(searchParams.get('department')) ?? undefined

  return params
}

/**
 * Build API params from URL
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams,
  validatedBranchId?: number,
  validatedBlockId?: number,
  validatedDepartmentId?: number
): GetRecruitmentSourceReportParams {
  const params: GetRecruitmentSourceReportParams = {}

  // Date range - only include if valid
  const fromDate = searchParams.get('from_date')
  const toDate = searchParams.get('to_date')
  if (fromDate && isValidDateString(fromDate)) {
    params.from_date = fromDate
  }
  if (toDate && isValidDateString(toDate)) {
    params.to_date = toDate
  }

  // Cascade IDs (validated)
  if (validatedBranchId) params.branch = validatedBranchId
  if (validatedBlockId) params.block = validatedBlockId
  if (validatedDepartmentId) params.department = validatedDepartmentId

  return params
}

const ReportRecruitmentSourcePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isFilterValid, setIsFilterValid] = useState(true)
  const { state: sidebarState } = useSidebar()
  const filterFormRef = useRef<RecruitmentSourceFilterFormRef>(null)
  const pageScrollRef = useRef<HTMLDivElement | null>(null)
  const tableHorizontalScrollRef = useRef<HTMLDivElement | null>(null)
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)

  // Track if URL has been initialized
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Parse URL params
  const urlParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  // Initialize URL with defaults if empty (only on direct access, not navigate back)
  useEffect(() => {
    // Check actual browser URL to avoid race condition with searchParams
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    // Check if date range exists (required for this report)
    const hasDateRange =
      searchParams.has('from_date') ||
      searchParams.has('to_date') ||
      actualUrlParams.has('from_date') ||
      actualUrlParams.has('to_date')

    // Date range is REQUIRED for this report - always set default if missing
    // regardless of navigate back status (because report cannot work without it)
    if (!hasDateRange) {
      const today = new Date()
      const fromDate = formatDateToApi(startOfMonth(today))
      const toDate = formatDateToApi(today)
      if (fromDate && toDate) {
        const newParams = isUrlEmpty ? new URLSearchParams() : new URLSearchParams(searchParams)
        // Set default date range: from start of month to today
        newParams.set('from_date', fromDate)
        newParams.set('to_date', toDate)
        setSearchParams(newParams, { replace: true })
      }
    }
    setIsUrlReady(true)
  }, []) // Only run once on mount

  // === CASCADE VALIDATION ===
  const rawBranchId = urlParams.branchId
  const rawBlockId = urlParams.blockId
  const rawDepartmentId = urlParams.departmentId

  // Branch validation
  const branchQuery = useBranchForFilter(rawBranchId ?? 0)
  const isBranchValid = !!branchQuery.data

  // Block validation - only validate if branch is valid
  const blockQuery = useBlockForFilter(rawBlockId ?? 0, rawBranchId)
  const isBlockValid = isBranchValid && !!blockQuery.data && blockQuery.data.branch === rawBranchId

  // Department validation - only validate if block is valid
  const departmentQuery = useDepartmentForFilter(rawDepartmentId ?? 0, rawBranchId, rawBlockId)
  const isDepartmentValid = isBlockValid && !!departmentQuery.data

  // Get validated IDs
  const validatedBranchId = isBranchValid ? rawBranchId : undefined
  const validatedBlockId = isBlockValid ? rawBlockId : undefined
  const validatedDepartmentId = isDepartmentValid ? rawDepartmentId : undefined

  // Check if validation is loading
  const isFilterValidationLoading = useMemo(() => {
    if (rawBranchId && branchQuery.isLoading) return true
    if (rawBlockId && isBranchValid && blockQuery.isLoading) return true
    if (rawDepartmentId && isBlockValid && departmentQuery.isLoading) return true
    return false
  }, [
    rawBranchId,
    rawBlockId,
    rawDepartmentId,
    branchQuery.isLoading,
    blockQuery.isLoading,
    departmentQuery.isLoading,
    isBranchValid,
    isBlockValid,
  ])

  // Check if date range is valid (required for this report)
  const hasValidDateRange = !!(urlParams.fromDate || urlParams.toDate)

  // Build API params
  const apiParams = useMemo(() => {
    if (!isUrlReady || isFilterValidationLoading || !hasValidDateRange) return undefined
    return buildApiParamsFromUrl(
      searchParams,
      validatedBranchId,
      validatedBlockId,
      validatedDepartmentId
    )
  }, [
    searchParams,
    isUrlReady,
    isFilterValidationLoading,
    hasValidDateRange,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
  ])

  // API call
  const { data, isLoading } = useRecruitmentSourceReport(apiParams, {
    enabled: isUrlReady && !isFilterValidationLoading && hasValidDateRange && !!apiParams,
  })

  // Handle apply filter
  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    // Validate date range
    if (!formData.from_date && !formData.to_date) {
      return
    }

    const newParams = new URLSearchParams()

    // Date range
    if (formData.from_date) {
      newParams.set('from_date', formData.from_date)
    }
    if (formData.to_date) {
      newParams.set('to_date', formData.to_date)
    }

    // Cascade IDs
    if (formData.branch) {
      newParams.set('branch', String(formData.branch))
    }
    if (formData.block) {
      newParams.set('block', String(formData.block))
    }
    if (formData.department) {
      newParams.set('department', String(formData.department))
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterOpen(false)
  }, [setSearchParams])

  // Handle clear filter
  const handleClearFilter = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  // Handle validation change from form
  const handleFilterValidationChange = useCallback((isValid: boolean) => {
    setIsFilterValid(isValid)
  }, [])

  // Filter count - only count valid filters that are actually used in API
  const activeFilterCount = useMemo(() => {
    let count = 0
    // Only count date range if at least one date is valid and parsed
    if (urlParams.fromDate || urlParams.toDate) count++
    if (validatedBranchId) count++
    if (validatedBlockId) count++
    if (validatedDepartmentId) count++
    return count
  }, [
    urlParams.fromDate,
    urlParams.toDate,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
  ])

  // Filter date range display
  const filterDateRange = useMemo(() => {
    const from = urlParams.fromDate
    const to = urlParams.toDate

    if (!from && !to) {
      return ''
    }

    const fromText = from ? formatDate(from) : ' - '
    const toText = to ? formatDate(to) : ' - '

    if (from && !to) {
      return `Từ ${fromText}`
    }

    if (to && !from) {
      return `Đến ${toText}`
    }

    const fromStr = from ? formatDateToApi(from) : ''
    const toStr = to ? formatDateToApi(to) : ''
    if (fromStr === toStr) {
      return `Ngày ${fromText}`
    }

    return `Từ ${fromText} - ${toText}`
  }, [urlParams.fromDate, urlParams.toDate])

  // Filter org display
  const filterOrg = useMemo(() => {
    let title = 'Toàn công ty'

    if (branchQuery.data?.name && isBranchValid) {
      title = `Chi nhánh: ${branchQuery.data.name}`
    }
    if (blockQuery.data?.name && isBlockValid) {
      title += ` - Khối: ${blockQuery.data.name}`
    }
    if (departmentQuery.data?.name && isDepartmentValid) {
      title += ` - Phòng ban: ${departmentQuery.data.name}`
    }

    return title
  }, [
    branchQuery.data?.name,
    blockQuery.data?.name,
    departmentQuery.data?.name,
    isBranchValid,
    isBlockValid,
    isDepartmentValid,
  ])

  // Export is generated server-side (styled XLSX) via the recruitment-source export endpoint.
  const { openExportDialog } = useExportRecruitmentSourceReport()

  const handleExport = useCallback(() => {
    if (!apiParams) return
    openExportDialog(apiParams)
  }, [apiParams, openExportDialog])

  // Form initial values
  const formInitialValues = useMemo(
    () => ({
      dateRange:
        urlParams.fromDate || urlParams.toDate
          ? { from: urlParams.fromDate, to: urlParams.toDate }
          : undefined,
      branch: validatedBranchId,
      block: validatedBlockId,
      department: validatedDepartmentId,
    }),
    [
      urlParams.fromDate,
      urlParams.toDate,
      validatedBranchId,
      validatedBlockId,
      validatedDepartmentId,
    ]
  )

  useLayoutEffect(() => {
    const tableRoot = tableWrapperRef.current
    if (!tableRoot) return

    const table = tableRoot.querySelector('table') as HTMLElement | null
    if (!table) return

    const thead = table.querySelector('thead') as HTMLElement | null
    if (!thead) return

    const navBar = document.querySelector('[data-name="Header"]') as HTMLElement | null
    if (!navBar) return

    const scrollContainer = pageScrollRef.current
    if (!scrollContainer) return

    let frameId: number | null = null
    let lastTranslateOffset = -1

    const applyStickyTop = () => {
      frameId = null
      const navBarBottom = Math.round(navBar.getBoundingClientRect().bottom)
      const scrollContainerTop = Math.round(scrollContainer.getBoundingClientRect().top)
      const nextTranslateOffset =
        scrollContainerTop < navBarBottom ? Math.max(0, navBarBottom - scrollContainerTop) : 0

      if (nextTranslateOffset === lastTranslateOffset) return

      lastTranslateOffset = nextTranslateOffset
      thead.style.transform =
        nextTranslateOffset > 0 ? `translateY(${nextTranslateOffset}px)` : 'translateY(0px)'
    }

    const requestStickyTopUpdate = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(applyStickyTop)
    }

    requestStickyTopUpdate()
    thead.style.willChange = 'transform'
    window.addEventListener('resize', requestStickyTopUpdate)
    window.addEventListener('scroll', requestStickyTopUpdate, { passive: true })
    scrollContainer.addEventListener('scroll', requestStickyTopUpdate, { passive: true })

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
      window.removeEventListener('resize', requestStickyTopUpdate)
      window.removeEventListener('scroll', requestStickyTopUpdate)
      scrollContainer.removeEventListener('scroll', requestStickyTopUpdate)
      thead.style.transform = 'translateY(0px)'
      thead.style.willChange = ''
    }
  }, [data, isLoading, isFilterValidationLoading])

  return (
    <>
      <PageTitle
        handleFilter={() => setIsFilterOpen(true)}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={handleExport}
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <Box className={'px-10 pb-4'}>
          <Flex gap={'2'} width={'full'}>
            {filterDateRange && (
              <>
                <Text className="typo-body-lg-medium text-content-dark-2">Thời gian lọc:</Text>
                <Text className="typo-body-lg-semibold text-content-dark-1">{filterDateRange}</Text>
                .
              </>
            )}
            {filterOrg && (
              <>
                <Text className="typo-body-lg-medium text-content-dark-1">{filterOrg}</Text>
              </>
            )}
          </Flex>
        </Box>
        <div
          ref={pageScrollRef}
          className="min-w-0 flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10"
        >
          <div ref={tableWrapperRef} className="min-w-0">
            <ReportRecruitmentSourceTable
              data={data}
              isLoading={isLoading || isFilterValidationLoading}
              scrollContainerRef={tableHorizontalScrollRef}
            />
          </div>
        </div>
        <div
          className={cn(
            'bg-content-light-1 fixed bottom-0 z-20 flex flex-col py-2',
            sidebarState === 'expanded'
              ? 'left-[var(--sidebar-width)] w-[calc(100%-var(--sidebar-width))]'
              : 'left-[var(--sidebar-width-icon)] w-[calc(100%-var(--sidebar-width-icon))]'
          )}
        >
          <div className="pr-10 pl-10">
            <HorizontalScrollBar
              containerRef={tableHorizontalScrollRef}
              className="border-border-1 border-x-0 border-b-0"
            />
          </div>
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        title="Bộ lọc"
        content={
          <RecruitmentSourceFilterForm
            ref={filterFormRef}
            initialValues={formInitialValues}
            onValidationChange={handleFilterValidationChange}
          />
        }
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterOpen(false)}
        onClearFilter={handleClearFilter}
        disableConfirm={!isFilterValid}
      />
    </>
  )
}

export default ReportRecruitmentSourcePage
