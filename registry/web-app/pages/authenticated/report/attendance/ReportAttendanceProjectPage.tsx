import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Box, Flex, Text } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import AttendanceProjectTable from '@/features/report/attendance/project/view/AttendanceProjectTable'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import AttendanceProjectFilterForm, {
  type AttendanceProjectFilterFormRef,
} from '@/features/report/attendance/project/components/AttendanceProjectFilterForm'
import exportExcel, { type GroupedHeaderDef } from '@/utils/excel'
import type {
  AttendanceProjectReportAggregration,
  GetAttendanceByProjectReportParams,
} from '@/features/report/services/attendance-report-service'
import {
  ATTENDANCE_PROJECT_REPORT_HEADERS,
  buildAttendanceProjectReportRows,
} from '@/features/report/attendance/project/utils/attendance-project-report'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import { parsePositiveInt, roundNumber } from '@/utils/common'
import AppDialog from '@/components/dialog/AppDialog'
import {
  formatDate,
  formatDateRangeText,
  formatDateToApi,
  parseDateFromApi,
} from '@/utils/date-utils'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { cn } from '@/utils'
import { BlockType } from '@/constants/api-schema-aliases'

const VALID_BLOCK_TYPES = [BlockType.business, BlockType.support] as const

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
    blockTypes: string[]
  } = {
    blockTypes: [],
  }

  // Date range - only parse if both ends are valid; legacy attendance_date maps to a one-day range
  const fromDateStr = searchParams.get('from_date')
  const toDateStr = searchParams.get('to_date')
  const legacyDateStr = searchParams.get('attendance_date')

  if (fromDateStr && toDateStr && isValidDateString(fromDateStr) && isValidDateString(toDateStr)) {
    const fromDate = parseDateFromApi(fromDateStr)
    const toDate = parseDateFromApi(toDateStr)
    if (fromDate && toDate && fromDate <= toDate) {
      params.fromDate = fromDate
      params.toDate = toDate
    }
  } else if (legacyDateStr && isValidDateString(legacyDateStr)) {
    const legacyDate = parseDateFromApi(legacyDateStr)
    if (legacyDate) {
      params.fromDate = legacyDate
      params.toDate = new Date(legacyDate)
    }
  }

  // Cascade IDs
  params.branchId = parsePositiveInt(searchParams.get('branch')) ?? undefined
  params.blockId = parsePositiveInt(searchParams.get('block')) ?? undefined
  params.departmentId = parsePositiveInt(searchParams.get('department')) ?? undefined

  // Block types - validate against enum
  const blockTypesFromUrl = searchParams.getAll('block_type')
  if (blockTypesFromUrl.length > 0) {
    params.blockTypes = blockTypesFromUrl.filter((bt) =>
      VALID_BLOCK_TYPES.includes(bt as BlockType)
    )
  }

  return params
}

/**
 * Build API params from the resolved date range + validated org filters
 */
function buildApiParams(
  fromDate: Date | undefined,
  toDate: Date | undefined,
  validatedBranchId?: number,
  validatedBlockId?: number,
  validatedDepartmentId?: number,
  validatedBlockTypes?: string[]
): GetAttendanceByProjectReportParams | undefined {
  // Date range is required (BE averages over working days within the range)
  if (!fromDate || !toDate) {
    return undefined
  }

  const from_date = formatDateToApi(fromDate)
  const to_date = formatDateToApi(toDate)
  if (!from_date || !to_date) {
    return undefined
  }

  const params: GetAttendanceByProjectReportParams = {
    from_date,
    to_date,
  }

  // Cascade IDs (validated)
  if (validatedBranchId) params.branch = validatedBranchId
  if (validatedBlockId) params.block = validatedBlockId
  if (validatedDepartmentId) params.department = validatedDepartmentId

  // Block type - only set if exactly one valid type
  if (validatedBlockTypes && validatedBlockTypes.length === 1) {
    params.block_type = validatedBlockTypes[0] as BlockType
  }

  return params
}

const ReportAttendanceProjectPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterFormRef = useRef<AttendanceProjectFilterFormRef>(null)
  const { state: sidebarState } = useSidebar()
  const pageScrollRef = useRef<HTMLDivElement | null>(null)
  const tableHorizontalScrollRef = useRef<HTMLDivElement | null>(null)
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)

  // Track if URL has been initialized
  const [isUrlReady, setIsUrlReady] = useState(false)

  const [reportData, setReportData] = useState<AttendanceProjectReportAggregration>()
  const [isFormValid, setIsFormValid] = useState(false)

  // App constants for block type labels
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.BLOCK.TYPE],
  })

  const blockTypeOptions = useMemo(() => {
    return keysMapOptions.get(APP_CONSTANT_KEY.BLOCK.TYPE) || []
  }, [keysMapOptions])

  // Parse URL params
  const urlParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  // Initialize URL with defaults if empty
  useEffect(() => {
    // Check actual browser URL to avoid race condition with searchParams
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    // Check if a date selector exists: from_date/to_date range, or legacy attendance_date
    const hasDateRange =
      (searchParams.has('from_date') && searchParams.has('to_date')) ||
      (actualUrlParams.has('from_date') && actualUrlParams.has('to_date')) ||
      searchParams.has('attendance_date') ||
      actualUrlParams.has('attendance_date')

    // A date range is REQUIRED for this report - always set default if missing
    // regardless of navigate back status (because report cannot work without it)
    if (!hasDateRange) {
      const todayApi = formatDateToApi(new Date())
      if (todayApi) {
        const newParams = isUrlEmpty ? new URLSearchParams() : new URLSearchParams(searchParams)
        // Default to a one-day range of today
        newParams.set('from_date', todayApi)
        newParams.set('to_date', todayApi)
        setSearchParams(newParams, { replace: true })
      }
    }

    setIsUrlReady(true)
  }, [])

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

  // Validate block types (already filtered in parseFilterParamsFromUrl)
  const validatedBlockTypes = urlParams.blockTypes

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

  // Check if the date range is valid (required for this report)
  const hasValidDateRange = !!urlParams.fromDate && !!urlParams.toDate

  // Build API params
  const apiParams = useMemo(() => {
    if (!isUrlReady || isFilterValidationLoading || !hasValidDateRange) return undefined
    return buildApiParams(
      urlParams.fromDate,
      urlParams.toDate,
      validatedBranchId,
      validatedBlockId,
      validatedDepartmentId,
      validatedBlockTypes
    )
  }, [
    urlParams.fromDate,
    urlParams.toDate,
    isUrlReady,
    isFilterValidationLoading,
    hasValidDateRange,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
    validatedBlockTypes,
  ])

  // Handle apply filter
  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData || !formData.fromDate || !formData.toDate) return

    const from_date = formatDateToApi(formData.fromDate)
    const to_date = formatDateToApi(formData.toDate)
    if (!from_date || !to_date) return

    const newParams = new URLSearchParams()

    // Date range (required)
    newParams.set('from_date', from_date)
    newParams.set('to_date', to_date)

    // Cascade IDs
    if (formData.branch) {
      newParams.set('branch', formData.branch)
    }
    if (formData.block) {
      newParams.set('block', formData.block)
    }
    if (formData.department) {
      newParams.set('department', formData.department)
    }

    // Block types (multi-select)
    if (formData.block_types && formData.block_types.length > 0) {
      formData.block_types.forEach((bt) => {
        newParams.append('block_type', bt)
      })
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterOpen(false)
  }, [setSearchParams])

  // Handle clear filter
  const handleClearFilter = useCallback(() => {
    // Keep the date range when clearing (fallback to today)
    const fallbackFrom = urlParams.fromDate ?? new Date()
    const fallbackTo = urlParams.toDate ?? new Date()
    filterFormRef.current?.clearForm({ from: fallbackFrom, to: fallbackTo })
    // Reset validation state when clearing - but keep dates so form is still valid
    setIsFormValid(true)
  }, [urlParams.fromDate, urlParams.toDate])

  // Filter count - only count valid filters that are actually used in API
  const filterBadgeCount = useMemo(() => {
    let count = 0
    // Only count the date range if valid and parsed
    if (urlParams.fromDate && urlParams.toDate) count++
    if (validatedBranchId) count++
    if (validatedBlockId) count++
    if (validatedDepartmentId) count++
    if (validatedBlockTypes.length > 0) count++
    return count
  }, [
    urlParams.fromDate,
    urlParams.toDate,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
    validatedBlockTypes.length,
  ])

  // Cột "Số lượt check-in tổng" và định dạng export bám theo cờ này (giống bảng hiển thị).
  const isSingleDay = useMemo(() => {
    if (!urlParams.fromDate || !urlParams.toDate) return false
    return formatDateToApi(urlParams.fromDate) === formatDateToApi(urlParams.toDate)
  }, [urlParams.fromDate, urlParams.toDate])

  const filterDateText = useMemo(() => {
    if (!urlParams.fromDate || !urlParams.toDate) return '-'
    if (isSingleDay) {
      return `Ngày ${formatDate(urlParams.fromDate)}`
    }
    return formatDateRangeText(urlParams.fromDate, urlParams.toDate)
  }, [urlParams.fromDate, urlParams.toDate, isSingleDay])

  const filterOrgParts = useMemo(() => {
    const parts: string[] = []
    if (
      branchQuery.data?.name &&
      isBranchValid &&
      !blockQuery.data?.name &&
      !departmentQuery.data?.name
    ) {
      parts.push(`Chi nhánh ${branchQuery.data.name}`)
    }
    if (blockQuery.data?.name && isBlockValid && !departmentQuery.data?.name) {
      parts.push(`Khối ${blockQuery.data.name}`)
    }
    if (departmentQuery.data?.name && isDepartmentValid) {
      parts.push(`Phòng ban ${departmentQuery.data.name}`)
    }
    if (validatedBlockTypes.length > 0 && blockTypeOptions.length > 0) {
      const optionMap = new Map(
        blockTypeOptions.map((option) => [String(option.value), option.label] as const)
      )
      const blockTypeLabels = validatedBlockTypes
        .map((value) => optionMap.get(value))
        .filter((label): label is string => Boolean(label))
      if (blockTypeLabels.length) {
        parts.push(`Chức năng khối: ${blockTypeLabels.join(', ')}`)
      }
    }
    return parts
  }, [
    branchQuery.data?.name,
    blockQuery.data?.name,
    departmentQuery.data?.name,
    isBranchValid,
    isBlockValid,
    isDepartmentValid,
    validatedBlockTypes,
    blockTypeOptions,
  ])

  const reportTitle = useMemo(() => {
    const base = 'Báo cáo Thống kê chấm công theo dự án'
    if (!filterOrgParts.length) return `${base} - Toàn công ty`
    return `${base} - ${filterOrgParts.join(' - ')}`
  }, [filterOrgParts])

  const buildExportRows = useCallback(() => {
    // Dùng chung builder với bảng hiển thị (đã gồm dòng "Trung bình" + "Tổng").
    return buildAttendanceProjectReportRows(reportData).map((row) => ({
      stt: row.stt,
      project: row.label,
      count: roundNumber(row.count),
      totalCount: roundNumber(row.totalCount),
    }))
  }, [reportData])

  const buildExportDefinitions = useCallback(() => {
    // 1 ngày → "Số lượt check-in"; nhiều ngày → "Số lượt check-in trung bình/ngày".
    const countHeader = isSingleDay
      ? ATTENDANCE_PROJECT_REPORT_HEADERS.SINGLE_DAY_CHECKIN
      : ATTENDANCE_PROJECT_REPORT_HEADERS.AVG_CHECKIN

    const columns: Array<{ key: string; header: string }> = [
      { key: 'stt', header: ATTENDANCE_PROJECT_REPORT_HEADERS.STT },
      { key: 'project', header: ATTENDANCE_PROJECT_REPORT_HEADERS.PROJECT },
      { key: 'count', header: countHeader },
    ]

    const groupedHeaders: GroupedHeaderDef[] = [
      { title: ATTENDANCE_PROJECT_REPORT_HEADERS.STT, colSpan: 1 },
      { title: ATTENDANCE_PROJECT_REPORT_HEADERS.PROJECT, colSpan: 1 },
      { title: countHeader, colSpan: 1 },
    ]

    // Cột tổng ("Tổng số lượt check-in") chỉ xuất khi khoảng lọc nhiều hơn 1 ngày.
    if (!isSingleDay) {
      columns.push({ key: 'totalCount', header: ATTENDANCE_PROJECT_REPORT_HEADERS.TOTAL_CHECKIN })
      groupedHeaders.push({ title: ATTENDANCE_PROJECT_REPORT_HEADERS.TOTAL_CHECKIN, colSpan: 1 })
    }

    return { columns, groupedHeaders }
  }, [isSingleDay])

  const handleExport = useCallback(() => {
    const rows = buildExportRows()
    const { columns, groupedHeaders } = buildExportDefinitions()

    const titleParts = [filterDateText]
    if (filterOrgParts.length) {
      titleParts.push(filterOrgParts.join(' - '))
    }

    const fileName = `Báo cáo thống kê chấm công theo dự án - ${titleParts.join(' - ')}`

    exportExcel({
      fileName,
      sheets: [
        {
          name: 'Sheet 1',
          data: rows,
          columns,
          groupedHeaders,
        },
      ],
    })
  }, [buildExportDefinitions, buildExportRows, filterDateText, filterOrgParts])

  // Form initial values
  const formInitialValues = useMemo(
    () => ({
      fromDate: urlParams.fromDate,
      toDate: urlParams.toDate,
      branch: validatedBranchId ? String(validatedBranchId) : undefined,
      block: validatedBlockId ? String(validatedBlockId) : undefined,
      department: validatedDepartmentId ? String(validatedDepartmentId) : undefined,
      branchName: branchQuery.data?.name,
      blockName: blockQuery.data?.name,
      departmentName: departmentQuery.data?.name,
      block_types: validatedBlockTypes,
    }),
    [
      urlParams.fromDate,
      urlParams.toDate,
      validatedBranchId,
      validatedBlockId,
      validatedDepartmentId,
      branchQuery.data?.name,
      blockQuery.data?.name,
      departmentQuery.data?.name,
      validatedBlockTypes,
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
  }, [apiParams])

  return (
    <>
      <PageTitle
        title="Thống kê chấm công theo dự án"
        handleFilter={() => setIsFilterOpen(true)}
        filterBadgeCount={filterBadgeCount}
        handleExportBtnFull={handleExport}
      />

      <Box pb="6">
        <Box className="px-10 pb-4">
          <Flex direction="column" gap="1">
            <Text className="typo-body-xl-semibold text-content-dark-1">{reportTitle}</Text>
            <Text className="typo-body-base-medium text-content-dark-3">{filterDateText}</Text>
          </Flex>
        </Box>
        {apiParams && (
          <>
            <div
              ref={pageScrollRef}
              className="min-w-0 flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10"
            >
              <div ref={tableWrapperRef} className="min-w-0">
                <AttendanceProjectTable
                  filters={apiParams}
                  onDataLoaded={setReportData}
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
          </>
        )}
      </Box>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={(open) => {
          setIsFilterOpen(open)
          // Reset validation state when dialog opens
          if (open) {
            setIsFormValid(!!formInitialValues.fromDate && !!formInitialValues.toDate)
          }
        }}
        title="Bộ lọc"
        content={
          <AttendanceProjectFilterForm
            ref={filterFormRef}
            initialValues={formInitialValues}
            onValidationChange={setIsFormValid}
          />
        }
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterOpen(false)}
        onClearFilter={handleClearFilter}
        disableConfirm={!isFormValid}
      />
    </>
  )
}

export default ReportAttendanceProjectPage
