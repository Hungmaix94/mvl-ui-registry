import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Box, Flex, Text } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import { FullScreenLoading } from '@/components/Loading.tsx'
import HorizontalScrollBar from '@/components/ui/table/HorizontalScrollBar'
import { useSidebar } from '@/components/ui/sidebar/sidebar.tsx'
import { cn } from '@/utils'
import AppDialog from '@/components/dialog/AppDialog'
import StaffInOutTable from '@/features/report/staff/in-out/StaffInOutTable'
import StaffInOutFilterForm, {
  type StaffInOutFilterFormRef,
  type StaffInOutFilterFormValues,
} from '@/features/report/staff/in-out/StaffInOutFilterForm'
import {
  useStaffInOutReport,
  useExportStaffInOutReport,
  type GetStaffInOutReportParams,
} from '@/features/report/services/hrm-report-service'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import { parsePositiveInt } from '@/utils/common'
import {
  formatDate,
  formatDateRangeText,
  formatDateToApi,
  parseDateFromApi,
} from '@/utils/date-utils'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useAbility } from '@/lib/ability.ts'
import { BlockType, RecruitmentReportPeriodType } from '@/constants/api-schema-aliases'
type PeriodType = RecruitmentReportPeriodType

const VALID_PERIOD_TYPES = Object.values(RecruitmentReportPeriodType)

const VALID_BLOCK_TYPES = [BlockType.business, BlockType.support] as const

/**
 * Validate date string format (YYYY-MM-DD)
 */
function isValidDateString(dateStr: string): boolean {
  if (!dateStr) return false
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (!datePattern.test(dateStr)) return false
  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) return false
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
    periodType?: PeriodType
    fromDate?: Date
    toDate?: Date
    branchId?: number
    blockId?: number
    departmentId?: number
    blockTypes: string[]
  } = {
    blockTypes: [],
  }

  // Period type - only accept valid enum values
  const periodType = searchParams.get('period_type')
  if (periodType && VALID_PERIOD_TYPES.includes(periodType as PeriodType)) {
    params.periodType = periodType as PeriodType
  }

  // Date range - only parse if both ends are valid
  const fromDateStr = searchParams.get('from_date')
  const toDateStr = searchParams.get('to_date')
  if (fromDateStr && toDateStr && isValidDateString(fromDateStr) && isValidDateString(toDateStr)) {
    const fromDate = parseDateFromApi(fromDateStr)
    const toDate = parseDateFromApi(toDateStr)
    if (fromDate && toDate && fromDate <= toDate) {
      params.fromDate = fromDate
      params.toDate = toDate
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
 * Build API params from the resolved filters
 */
function buildApiParams(
  periodType: PeriodType | undefined,
  fromDate: Date | undefined,
  toDate: Date | undefined,
  validatedBranchId?: number,
  validatedBlockId?: number,
  validatedDepartmentId?: number,
  validatedBlockTypes?: string[]
): GetStaffInOutReportParams | undefined {
  if (!periodType || !fromDate || !toDate) {
    return undefined
  }

  const from_date = formatDateToApi(fromDate)
  const to_date = formatDateToApi(toDate)
  if (!from_date || !to_date) {
    return undefined
  }

  const params: GetStaffInOutReportParams = {
    period_type: periodType,
    from_date,
    to_date,
  }

  if (validatedBranchId) params.branch = validatedBranchId
  if (validatedBlockId) params.block = validatedBlockId
  if (validatedDepartmentId) params.department = validatedDepartmentId

  // Block type - only set if exactly one valid type
  if (validatedBlockTypes && validatedBlockTypes.length === 1) {
    params.block_type = validatedBlockTypes[0] as BlockType
  }

  return params
}

const ReportStaffInOutPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()
  const { state: sidebarState } = useSidebar()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterFormRef = useRef<StaffInOutFilterFormRef>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // Track if URL has been initialized
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFormValid, setIsFormValid] = useState(false)

  // App constants for block type + period labels
  const { keysMap, keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.BLOCK.TYPE, APP_CONSTANT_KEY.HRM.STAFF_GROWTH_REPORT_TIMEFRAME_TYPE],
  })

  const blockTypeOptions = useMemo(() => {
    return keysMapOptions.get(APP_CONSTANT_KEY.BLOCK.TYPE) || []
  }, [keysMapOptions])

  const periodTypeLabels = keysMap.get(APP_CONSTANT_KEY.HRM.STAFF_GROWTH_REPORT_TIMEFRAME_TYPE) as
    | Record<string, string>
    | undefined

  // Parse URL params
  const urlParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  // Initialize URL with defaults if empty
  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    const hasPeriodType = searchParams.has('period_type') || actualUrlParams.has('period_type')
    const hasDateRange =
      (searchParams.has('from_date') && searchParams.has('to_date')) ||
      (actualUrlParams.has('from_date') && actualUrlParams.has('to_date'))

    // period_type and date range are REQUIRED for this report
    if (!hasPeriodType || !hasDateRange) {
      const today = new Date()
      const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const fromDateApi = formatDateToApi(startOfCurrentMonth)
      const toDateApi = formatDateToApi(today)
      if (fromDateApi && toDateApi) {
        const newParams = isUrlEmpty ? new URLSearchParams() : new URLSearchParams(searchParams)
        if (!hasPeriodType) {
          newParams.set('period_type', RecruitmentReportPeriodType.month)
        }
        if (!hasDateRange) {
          newParams.set('from_date', fromDateApi)
          newParams.set('to_date', toDateApi)
        }
        setSearchParams(newParams, { replace: true })
      }
    }

    setIsUrlReady(true)
  }, [])

  // === CASCADE VALIDATION ===
  const rawBranchId = urlParams.branchId
  const rawBlockId = urlParams.blockId
  const rawDepartmentId = urlParams.departmentId

  const branchQuery = useBranchForFilter(rawBranchId ?? 0)
  const isBranchValid = !!branchQuery.data

  const blockQuery = useBlockForFilter(rawBlockId ?? 0, rawBranchId)
  const isBlockValid = isBranchValid && !!blockQuery.data && blockQuery.data.branch === rawBranchId

  const departmentQuery = useDepartmentForFilter(rawDepartmentId ?? 0, rawBranchId, rawBlockId)
  const isDepartmentValid = isBlockValid && !!departmentQuery.data

  const validatedBranchId = isBranchValid ? rawBranchId : undefined
  const validatedBlockId = isBlockValid ? rawBlockId : undefined
  const validatedDepartmentId = isDepartmentValid ? rawDepartmentId : undefined
  const validatedBlockTypes = urlParams.blockTypes

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

  const hasValidFilters = !!urlParams.periodType && !!urlParams.fromDate && !!urlParams.toDate

  // Build API params
  const apiParams = useMemo(() => {
    if (!isUrlReady || isFilterValidationLoading || !hasValidFilters) return undefined
    return buildApiParams(
      urlParams.periodType,
      urlParams.fromDate,
      urlParams.toDate,
      validatedBranchId,
      validatedBlockId,
      validatedDepartmentId,
      validatedBlockTypes
    )
  }, [
    urlParams.periodType,
    urlParams.fromDate,
    urlParams.toDate,
    isUrlReady,
    isFilterValidationLoading,
    hasValidFilters,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
    validatedBlockTypes,
  ])

  // Fetch report data
  const { data: reportData, isLoading } = useStaffInOutReport(apiParams, {
    enabled: !!apiParams,
  })

  // Export
  const { openExportDialog } = useExportStaffInOutReport()

  // Handle apply filter
  const handleApplyFilter = useCallback(() => {
    const formData: StaffInOutFilterFormValues | undefined = filterFormRef.current?.getValues()
    if (!formData || !formData.periodType || !formData.fromDate || !formData.toDate) return

    const from_date = formatDateToApi(formData.fromDate)
    const to_date = formatDateToApi(formData.toDate)
    if (!from_date || !to_date) return

    const newParams = new URLSearchParams()
    newParams.set('period_type', formData.periodType)
    newParams.set('from_date', from_date)
    newParams.set('to_date', to_date)

    if (formData.branch) newParams.set('branch', formData.branch)
    if (formData.block) newParams.set('block', formData.block)
    if (formData.department) newParams.set('department', formData.department)

    if (formData.block_types && formData.block_types.length > 0) {
      formData.block_types.forEach((bt) => {
        newParams.append('block_type', bt)
      })
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterOpen(false)
  }, [setSearchParams])

  // Handle clear filter - keep period type + date range so form stays valid
  const handleClearFilter = useCallback(() => {
    const today = new Date()
    filterFormRef.current?.clearForm({
      periodType: urlParams.periodType ?? RecruitmentReportPeriodType.month,
      range: {
        from: urlParams.fromDate ?? new Date(today.getFullYear(), today.getMonth(), 1),
        to: urlParams.toDate ?? today,
      },
    })
    setIsFormValid(true)
  }, [urlParams.periodType, urlParams.fromDate, urlParams.toDate])

  // Filter count - only count valid filters that are actually used in API
  const filterBadgeCount = useMemo(() => {
    let count = 0
    if (urlParams.periodType) count++
    if (urlParams.fromDate && urlParams.toDate) count++
    if (validatedBranchId) count++
    if (validatedBlockId) count++
    if (validatedDepartmentId) count++
    if (validatedBlockTypes.length > 0) count++
    return count
  }, [
    urlParams.periodType,
    urlParams.fromDate,
    urlParams.toDate,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
    validatedBlockTypes.length,
  ])

  const filterDateText = useMemo(() => {
    if (!urlParams.fromDate || !urlParams.toDate) return '-'
    const periodLabel = urlParams.periodType
      ? (periodTypeLabels?.[urlParams.periodType] ?? urlParams.periodType)
      : ''
    const isSingleDay = formatDateToApi(urlParams.fromDate) === formatDateToApi(urlParams.toDate)
    const rangeText = isSingleDay
      ? `Ngày ${formatDate(urlParams.fromDate)}`
      : formatDateRangeText(urlParams.fromDate, urlParams.toDate)
    return periodLabel ? `Theo ${periodLabel.toLowerCase()} - ${rangeText}` : rangeText
  }, [urlParams.periodType, urlParams.fromDate, urlParams.toDate, periodTypeLabels])

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
    const base = 'Báo cáo nhân sự vào - nghỉ'
    if (!filterOrgParts.length) return `${base} - Toàn công ty`
    return `${base} - ${filterOrgParts.join(' - ')}`
  }, [filterOrgParts])

  // Handle export - same filters as the on-screen report
  const handleExport = useCallback(() => {
    if (!apiParams) return
    void openExportDialog(apiParams)
  }, [apiParams, openExportDialog])

  // Form initial values
  const formInitialValues = useMemo(
    () => ({
      periodType: urlParams.periodType,
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
      urlParams.periodType,
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

  return (
    <>
      <PageTitle
        title="Nhân sự vào - nghỉ"
        handleFilter={() => setIsFilterOpen(true)}
        filterBadgeCount={filterBadgeCount}
        handleExportBtnFull={
          ability.can('staff_in_out_report_export', 'employee_reports') ? handleExport : undefined
        }
      />

      <Box>
        <Box className="px-10 pb-4">
          <Flex direction="column" gap="1">
            <Text className="typo-body-xl-semibold text-content-dark-1">{reportTitle}</Text>
            <Text className="typo-body-base-medium text-content-dark-3">{filterDateText}</Text>
          </Flex>
        </Box>

        {isLoading ? (
          <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
        ) : (
          <>
            <div className="px-10 pb-10">
              {/* The table virtualizes rows and owns its scroll container; it
                  exposes that element via scrollContainerRef for the bottom bar */}
              <StaffInOutTable data={reportData} scrollContainerRef={scrollContainerRef} />
            </div>
            {/* Always-visible horizontal scrollbar pinned to the viewport bottom
                (fixed, not sticky - the app layout scrolls in a nested container) */}
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
                  containerRef={scrollContainerRef}
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
            setIsFormValid(
              !!formInitialValues.periodType &&
                !!formInitialValues.fromDate &&
                !!formInitialValues.toDate
            )
          }
        }}
        title="Bộ lọc"
        content={
          <StaffInOutFilterForm
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

export default ReportStaffInOutPage
