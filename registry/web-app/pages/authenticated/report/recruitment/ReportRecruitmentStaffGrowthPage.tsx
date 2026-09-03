import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import StaffGrowthTab from '@/features/report/recruitment/staff-growth/components/StaffGrowthTab'
import StaffGrowthChart from '@/features/report/recruitment/staff-growth/components/StaffGrowthChart'
import StaffGrowthFiltersForm, {
  type StaffGrowthFiltersFormRef,
} from '@/features/report/recruitment/staff-growth/components/StaffGrowthFiltersForm'
import toastService from '@/services/toast-service'
import {
  useStaffGrowthReport,
  type GetStaffGrowthReportParams,
  type StaffGrowthReportAggregated,
} from '@/services'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { Box } from '@radix-ui/themes'
import { format, getISOWeek, getISOWeekYear, startOfMonth } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format'
import exportExcel from '@/utils/excel'
import { isDevelopment } from '@/config/environment'
import { formatDate, formatDateToApi } from '@/utils/date-utils'
import { parsePositiveInt } from '@/utils/common'
import { RecruitmentReportPeriodType } from '@/constants/api-schema-aliases'

const VALID_PERIOD_TYPES = [
  RecruitmentReportPeriodType.week,
  RecruitmentReportPeriodType.month,
] as const

type PeriodType = RecruitmentReportPeriodType

const formatPeriodRangeLabel = (period: PeriodType, fromDate?: Date, toDate?: Date) => {
  if (!fromDate && !toDate) {
    return ''
  }

  let start = fromDate ?? toDate!
  let end = toDate ?? fromDate!

  if (start > end) {
    ;[start, end] = [end, start]
  }

  switch (period) {
    case RecruitmentReportPeriodType.month: {
      const startMonth = start.getMonth() + 1
      const startYear = start.getFullYear()
      const endMonth = end.getMonth() + 1
      const endYear = end.getFullYear()

      if (startMonth === endMonth && startYear === endYear) {
        return `Tháng ${endMonth}/${endYear}`
      }

      return `Từ Tháng ${startMonth}/${startYear} - Tháng ${endMonth}/${endYear}`
    }
    case RecruitmentReportPeriodType.week: {
      const startWeek = getISOWeek(start)
      const startWeekYear = getISOWeekYear(start)
      const endWeek = getISOWeek(end)
      const endWeekYear = getISOWeekYear(end)

      if (startWeek === endWeek && startWeekYear === endWeekYear) {
        return `Tuần ${endWeek}/${endWeekYear}`
      }

      return `Từ Tuần ${startWeek}/${startWeekYear} - Tuần ${endWeek}/${endWeekYear}`
    }
    default:
      return ''
  }
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
    periodType: RecruitmentReportPeriodType.week,
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
 * Build API params from URL
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams,
  validatedBranchId?: number,
  validatedBlockId?: number,
  validatedDepartmentId?: number
): GetStaffGrowthReportParams {
  const params: GetStaffGrowthReportParams = {}

  // Period type
  const periodType = searchParams.get('period_type')
  if (periodType && VALID_PERIOD_TYPES.includes(periodType as PeriodType)) {
    params.period_type = periodType as PeriodType
  } else {
    params.period_type = RecruitmentReportPeriodType.week
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

function ReportRecruitmentStaffGrowthPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterFormRef = useRef<StaffGrowthFiltersFormRef>(null)

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

    // Check if period_type exists (required for this report)
    const hasPeriodType = searchParams.has('period_type') || actualUrlParams.has('period_type')

    // Check if date range exists (required for this report)
    const hasDateRange =
      searchParams.has('from_date') ||
      searchParams.has('to_date') ||
      actualUrlParams.has('from_date') ||
      actualUrlParams.has('to_date')

    // period_type and date range are REQUIRED for this report - always set default if missing
    // regardless of navigate back status (because report cannot work without it)
    if (!hasPeriodType || !hasDateRange) {
      const today = new Date()
      const fromDate = formatDateToApi(startOfMonth(today))
      const toDate = formatDateToApi(today)
      if (fromDate && toDate) {
        const newParams = isUrlEmpty ? new URLSearchParams() : new URLSearchParams(searchParams)
        // Set default period_type if missing
        if (!hasPeriodType) {
          newParams.set('period_type', RecruitmentReportPeriodType.week)
        }
        // Set default date range if missing: from start of month to today
        if (!hasDateRange) {
          newParams.set('from_date', fromDate)
          newParams.set('to_date', toDate)
        }
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
  const { data, isLoading, error } = useStaffGrowthReport(apiParams, {
    enabled: isUrlReady && !isFilterValidationLoading && !!apiParams,
  })

  useEffect(() => {
    if (error) {
      toastService.error({
        title: 'Lỗi tải báo cáo',
        description: error.message || 'Đã có lỗi xảy ra khi tải báo cáo tăng trưởng nhân sự.',
        variant: 'destructive',
      })
    }
  }, [error])

  // Handle period type change (from tabs)
  const handlePeriodTypeChange = useCallback(
    (period_type: PeriodType) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('period_type', period_type)
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
    const currentPeriodType = searchParams.get('period_type') || RecruitmentReportPeriodType.week
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

  // Handle export
  const handleExportReport = useCallback(async () => {
    try {
      const reportData = data || []
      if (reportData.length === 0) {
        toastService.error('Không có dữ liệu để xuất file.')
        return
      }

      // Get field_labels from first item (all items have the same field_labels structure)
      const firstItem = reportData[0]
      const fieldLabels = firstItem?.field_labels || {}

      // Build columns dynamically from field_labels
      // Start with period column
      const columns = [{ key: 'period_name', header: 'Kỳ' }]

      // Add columns for each field in field_labels
      // Order: num_introductions, num_returns, num_recruitment_source, num_transfers, num_resignations
      const fieldOrder = [
        'num_introductions',
        'num_returns',
        'num_recruitment_source',
        'num_transfers',
        'num_resignations',
      ] as const

      fieldOrder.forEach((fieldKey) => {
        const label = fieldLabels[fieldKey]
        if (label && typeof label === 'string') {
          columns.push({ key: fieldKey, header: label })
        }
      })

      // Map data rows with all fields from field_labels
      const exportRows = reportData.map((row: StaffGrowthReportAggregated) => {
        const rowData: Record<string, string | number> = {
          period_name: row.label ?? '',
        }

        // Add all fields from field_labels
        fieldOrder.forEach((fieldKey) => {
          const value = row[fieldKey]
          rowData[fieldKey] = value ?? 0
        })

        return rowData
      })

      const fromDate = searchParams.get('from_date')
      const toDate = searchParams.get('to_date')

      const fromText = fromDate ? format(new Date(fromDate), DATE_FORMAT) : undefined
      const toText = toDate ? format(new Date(toDate), DATE_FORMAT) : undefined

      const datePart =
        fromText || toText ? ` ( ${fromText ?? 'N/A'}${toText ? ` - ${toText}` : ''} )` : ''

      const title = `Báo cáo tăng trưởng nhân sự${datePart}`

      exportExcel({
        fileName: title,
        sheets: [
          {
            name: 'Sheet 1',
            data: exportRows,
            columns: columns,
          },
        ],
      })
    } catch (e) {
      toastService.error('Có lỗi xảy ra khi export file excel')
      if (isDevelopment()) {
        console.log(e)
      }
    }
  }, [data, searchParams])

  // Filter count - only count valid filters that are actually used in API
  const filterCount = useMemo(() => {
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

  // Filter title for chart
  const filterTitle = useMemo(() => {
    const branchLabel = branchQuery.data?.name || ''
    const blockLabel = blockQuery.data?.name || ''
    const departmentLabel = departmentQuery.data?.name || ''

    let baseTitle = 'Toàn công ty'

    if (branchLabel && isBranchValid) {
      baseTitle = `Chi nhánh: ${branchLabel}`
    }
    if (blockLabel && isBlockValid) {
      baseTitle += ' - ' + `Khối: ${blockLabel}`
    }
    if (departmentLabel && isDepartmentValid) {
      baseTitle += ' - ' + `Phòng ban: ${departmentLabel}`
    }

    return baseTitle
  }, [
    branchQuery.data?.name,
    blockQuery.data?.name,
    departmentQuery.data?.name,
    isBranchValid,
    isBlockValid,
    isDepartmentValid,
  ])

  // Filter period label
  const filterPeriod = useMemo(() => {
    const fromDate = urlParams.fromDate
    const toDate = urlParams.toDate
    return formatPeriodRangeLabel(urlParams.periodType, fromDate, toDate) || data?.[0]?.label
  }, [urlParams.periodType, urlParams.fromDate, urlParams.toDate, data])

  // Date range tooltip
  const filterDateRangeTooltip = useMemo(() => {
    if (!urlParams.fromDate && !urlParams.toDate) {
      return ''
    }

    const formattedFrom = formatDate(urlParams.fromDate)
    const formattedTo = formatDate(urlParams.toDate)

    if (formattedFrom && formattedTo) {
      return `${formattedFrom} - ${formattedTo}`
    }

    return formattedFrom ?? formattedTo ?? ''
  }, [urlParams.fromDate, urlParams.toDate])

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

  return (
    <>
      <PageTitle
        title="Báo cáo Tăng trưởng nhân sự"
        handleFilter={() => setIsFilterOpen(true)}
        filterBadgeCount={filterCount}
        handleExportBtnFull={handleExportReport}
      />
      <Box pb={'6'} px={'6'}>
        <StaffGrowthTab
          periodType={urlParams.periodType}
          onPeriodTypeChange={handlePeriodTypeChange}
        />

        <StaffGrowthChart
          data={data || []}
          filterTitle={filterTitle}
          filterPeriod={filterPeriod}
          filterDateRangeTooltip={filterDateRangeTooltip}
          loading={isLoading || isFilterValidationLoading}
        />
      </Box>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        title="Bộ lọc"
        content={<StaffGrowthFiltersForm ref={filterFormRef} initialValues={formInitialValues} />}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterOpen(false)}
        onClearFilter={handleClearFilter}
      />
    </>
  )
}

export default ReportRecruitmentStaffGrowthPage
