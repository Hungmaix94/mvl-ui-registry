import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReportRecruitmentHiredCandidateTable from '@/features/report/recruitment/hired-candidate/view/ReportRecruitmentHiredCandidateTable'
import RecruitmentHiredCandidateFilterForm, {
  type RecruitmentHiredCandidateFilterFormRef,
} from '@/features/report/recruitment/hired-candidate/components/RecruitmentHiredCandidateFilterForm'
import { PageTitle } from '@/components/ui'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import AppDialog from '@/components/dialog/AppDialog'
import { Box, Flex, Text } from '@radix-ui/themes'
import { format, startOfMonth } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format'
import {
  type GetHiredCandidateReportParams,
  type HiredCandidateReportAggregated,
  useHiredCandidateReport,
} from '@/features/report/services/hrm-report-service'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import exportExcel from '@/utils/excel'
import { GroupedHeaderDef } from '@/utils/excel'
import toastService from '@/services/toast-service'
import { isDevelopment } from '@/config/environment'
import { formatDate, formatDateToApi } from '@/utils/date-utils'
import { parsePositiveInt } from '@/utils/common'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/utils'
import { RecruitmentReportPeriodType } from '@/constants/api-schema-aliases'

const VALID_PERIOD_TYPES = [
  RecruitmentReportPeriodType.week,
  RecruitmentReportPeriodType.month,
] as const

type PeriodType = RecruitmentReportPeriodType

/**
 * Parse filter params from URL for form display
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams) {
  const params: {
    periodType: PeriodType
    fromDate?: Date
    toDate?: Date
    branchId?: number
    blockId?: number
    departmentId?: number
  } = {
    periodType: RecruitmentReportPeriodType.month,
  }

  // Period type
  const periodType = searchParams.get('period_type')
  if (periodType && VALID_PERIOD_TYPES.includes(periodType as PeriodType)) {
    params.periodType = periodType as PeriodType
  }

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
 * Build API params from URL
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams,
  validatedBranchId?: number,
  validatedBlockId?: number,
  validatedDepartmentId?: number
): GetHiredCandidateReportParams {
  const params: GetHiredCandidateReportParams = {}

  // Period type
  const periodType = searchParams.get('period_type')
  if (periodType && VALID_PERIOD_TYPES.includes(periodType as PeriodType)) {
    params.period_type = periodType as PeriodType
  } else {
    params.period_type = RecruitmentReportPeriodType.month
  }

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

const ReportRecruitmentHiredCandidatePage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterFormRef = useRef<RecruitmentHiredCandidateFilterFormRef>(null)
  const { state: sidebarState } = useSidebar()
  const pageScrollRef = useRef<HTMLDivElement | null>(null)
  const tableHorizontalScrollRef = useRef<HTMLDivElement | null>(null)
  const tableWrapperRef = useRef<HTMLDivElement | null>(null)

  // Track if URL has been initialized
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Track table data for export
  const [tableData, setTableData] = useState<HiredCandidateReportAggregated>()

  // Parse URL params
  const urlParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  // Initialize URL with defaults if empty
  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    const referrer = document.referrer
    const isNavigateBack = referrer && referrer.includes(window.location.origin)

    if (isUrlEmpty && !isNavigateBack) {
      const newParams = new URLSearchParams()
      newParams.set('period_type', RecruitmentReportPeriodType.month)
      const today = new Date()
      newParams.set('from_date', formatDateToApi(startOfMonth(today)) || '')
      newParams.set('to_date', formatDateToApi(today) || '')
      setSearchParams(newParams, { replace: true })
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

  // Build API params
  const apiParams = useMemo(() => {
    if (!isUrlReady || isFilterValidationLoading) return undefined
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
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
  ])

  // API call
  const { data, isLoading } = useHiredCandidateReport(apiParams, {
    enabled: isUrlReady && !isFilterValidationLoading && !!apiParams,
  })

  // Update table data when data changes
  useEffect(() => {
    setTableData(data)
  }, [data])

  // Handle tab change
  const handleTabChange = useCallback(
    (periodType: PeriodType) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('period_type', periodType)
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Handle apply filter
  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams()

    // Period type (keep from URL or use default)
    const currentPeriodType = searchParams.get('period_type') || RecruitmentReportPeriodType.month
    newParams.set('period_type', currentPeriodType)

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
  }, [searchParams, setSearchParams])

  // Handle clear filter
  const handleClearFilter = useCallback(() => {
    filterFormRef.current?.clearForm()
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

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      const sourceTypes = tableData?.data || []
      const labels = tableData?.labels || []

      // Filter labels to get only period labels (excluding Total)
      const periodLabels = labels.filter((label) => label !== 'Total')

      // Build columns for export
      const exportColumns = [
        { key: 'stt', header: 'STT' },
        { key: 'source', header: 'Nguồn' },
        ...periodLabels.map((label) => ({ key: label, header: label })),
        { key: 'Total', header: 'Tổng' },
      ]

      // Build rows for export
      const exportRows: any[] = []
      const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

      sourceTypes.forEach((sourceType, index) => {
        // Add level 1 row (source type header)
        const level1Row: any = {
          stt: romanNumerals[index] || `${index + 1}`,
          source: sourceType.name,
        }

        // Add statistics for each period
        sourceType.statistics.forEach((stat, statIndex) => {
          level1Row[labels[statIndex]] = stat
        })
        exportRows.push(level1Row)

        // Add level 2 rows (children/employees) only if they exist
        if (sourceType.children && sourceType.children.length > 0) {
          let groupStt = 1
          sourceType.children.forEach((child) => {
            const level2Row: any = {
              stt: groupStt++,
              source: child.name,
            }

            // Add statistics for each period
            child.statistics.forEach((stat, statIndex) => {
              level2Row[labels[statIndex]] = stat
            })
            exportRows.push(level2Row)
          })
        }
      })

      // Build grouped headers for export
      const groupedHeaders: GroupedHeaderDef[] = [
        {
          title: 'STT',
        },
        {
          title: 'Nguồn',
        },
        {
          title: 'Số ứng viên nhận việc',
          colSpan: periodLabels.length + 1, // +1 for Total column
          children: [
            ...periodLabels.map((label) => ({
              title: label,
            })),
            {
              title: 'Tổng',
            },
          ],
        },
      ]

      // Build title parts
      const fromText = urlParams.fromDate ? format(urlParams.fromDate, DATE_FORMAT) : undefined
      const toText = urlParams.toDate ? format(urlParams.toDate, DATE_FORMAT) : undefined
      const dateRangePart = fromText && toText ? ` (Từ ${fromText} - ${toText})` : ''

      const orgParts: string[] = []
      if (branchQuery.data?.name && isBranchValid)
        orgParts.push(`Chi nhánh: ${branchQuery.data.name}`)
      if (blockQuery.data?.name && isBlockValid) orgParts.push(`Khối: ${blockQuery.data.name}`)
      if (departmentQuery.data?.name && isDepartmentValid)
        orgParts.push(`Phòng ban: ${departmentQuery.data.name}`)

      const orgPart = orgParts.length ? ` - ${orgParts.join(' - ')}` : ''

      const periodLabel = urlParams.periodType === 'week' ? 'Tuần' : 'Tháng'
      const title = `Báo cáo ứng viên nhận việc (${periodLabel})${dateRangePart}${orgPart}`

      exportExcel({
        fileName: title,
        sheets: [
          {
            name: 'Sheet 1',
            data: exportRows,
            columns: exportColumns,
            groupedHeaders: groupedHeaders,
          },
        ],
      })
    } catch (e) {
      toastService.error('Có lỗi xảy ra khi export file excel')
      if (isDevelopment()) {
        console.log(e)
      }
    }
  }, [
    tableData,
    urlParams.fromDate,
    urlParams.toDate,
    urlParams.periodType,
    branchQuery.data?.name,
    blockQuery.data?.name,
    departmentQuery.data?.name,
    isBranchValid,
    isBlockValid,
    isDepartmentValid,
  ])

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

  const renderTitle = useCallback(
    () => (
      <Flex gap={'2'} width={'full'} mb={'4'}>
        {filterDateRange && (
          <>
            <Text className="typo-body-lg-medium text-content-dark-2">Thời gian lọc:</Text>
            <Text className="typo-body-lg-semibold text-content-dark-1">{filterDateRange}</Text>.
          </>
        )}
        {filterOrg && (
          <>
            <Text className="typo-body-lg-medium text-content-dark-1">{filterOrg}</Text>
          </>
        )}
      </Flex>
    ),
    [filterDateRange, filterOrg]
  )

  return (
    <>
      <PageTitle
        handleFilter={() => setIsFilterOpen(true)}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={handleExport}
      />

      <div className="flex flex-col gap-6 px-10">
        <Tabs value={urlParams.periodType}>
          <TabsList>
            <TabsTrigger
              value={RecruitmentReportPeriodType.month}
              onClick={() => handleTabChange(RecruitmentReportPeriodType.month)}
            >
              Theo tháng
            </TabsTrigger>
            <TabsTrigger
              value={RecruitmentReportPeriodType.week}
              onClick={() => handleTabChange(RecruitmentReportPeriodType.week)}
            >
              Theo tuần
            </TabsTrigger>
          </TabsList>
          <TabsContent value={RecruitmentReportPeriodType.month}>
            <Box pb={'6'}>
              {renderTitle()}
              <div
                ref={pageScrollRef}
                className="min-w-0 flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10"
              >
                <div ref={tableWrapperRef} className="min-w-0">
                  <ReportRecruitmentHiredCandidateTable
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
            </Box>
          </TabsContent>
          <TabsContent value={RecruitmentReportPeriodType.week}>
            <Box pb={'6'}>
              {renderTitle()}
              <div
                ref={pageScrollRef}
                className="min-w-0 flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10"
              >
                <div ref={tableWrapperRef} className="min-w-0">
                  <ReportRecruitmentHiredCandidateTable
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
            </Box>
          </TabsContent>
        </Tabs>
      </div>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        title="Bộ lọc"
        content={
          <RecruitmentHiredCandidateFilterForm
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

export default ReportRecruitmentHiredCandidatePage
