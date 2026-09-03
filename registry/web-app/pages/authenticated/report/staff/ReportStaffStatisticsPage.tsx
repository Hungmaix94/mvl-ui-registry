import { PageTitle, RadioGroup, Switch } from '@/components/ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex, Separator, Text } from '@radix-ui/themes'
import StaffPageTab from '@/features/report/staff/components/StaffPageTab.tsx'
import StaffChart from '@/features/report/staff/components/StaffChart.tsx'
import StaffTable from '@/features/report/staff/components/StaffTable.tsx'
import {
  useEmployeeStatusBreakdownReport,
  type GetEmployeeStatusBreakdownReportParams,
} from '@/services'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import LabelDateFilter from '@/features/report/_shares/components/LabelDateFilter.tsx'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { cn } from '@/utils'
import StaffChartTitle from '@/features/report/_shares/components/StaffChartTitle.tsx'
import StaffFiltersForm, {
  type StaffTurnoverFiltersFormRef,
} from '@/features/report/staff/components/StaffFiltersForm.tsx'
import { getISOWeek, getISOWeekYear, startOfMonth } from 'date-fns'
import { exportStaffTurnoverTable } from '@/features/report/staff/components/StaffTable.tsx'
import toastService from '@/services/toast-service.tsx'
import { formatDate, formatDateToApi } from '@/utils/date-utils'
import { parsePositiveInt } from '@/utils/common'
import AppDialog from '@/components/dialog/AppDialog'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { ORG_LEVEL, isTypeOrgLevel } from '@/features/report/staff/constants'
import { ResignedBreakdownPeriodType, BlockType } from '@/constants/api-schema-aliases'

const VALID_PERIOD_TYPES = [
  ResignedBreakdownPeriodType.week,
  ResignedBreakdownPeriodType.month,
  ResignedBreakdownPeriodType.quarter,
  ResignedBreakdownPeriodType.year,
] as const

type PeriodType = ResignedBreakdownPeriodType

const VALID_BLOCK_TYPES = [BlockType.business, BlockType.support] as const

const getQuarter = (date: Date) => Math.floor(date.getMonth() / 3) + 1

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
    case ResignedBreakdownPeriodType.year: {
      const startYear = start.getFullYear()
      const endYear = end.getFullYear()
      if (startYear === endYear) {
        return `Năm ${endYear}`
      }
      return `Từ Năm ${startYear} - Năm ${endYear}`
    }
    case ResignedBreakdownPeriodType.quarter: {
      const startQuarter = getQuarter(start)
      const startYear = start.getFullYear()
      const endQuarter = getQuarter(end)
      const endYear = end.getFullYear()

      if (startQuarter === endQuarter && startYear === endYear) {
        return `Quý ${endQuarter}/${endYear}`
      }

      return `Từ Quý ${startQuarter}/${startYear} - Quý ${endQuarter}/${endYear}`
    }
    case ResignedBreakdownPeriodType.month: {
      const startMonth = start.getMonth() + 1
      const startYear = start.getFullYear()
      const endMonth = end.getMonth() + 1
      const endYear = end.getFullYear()

      if (startMonth === endMonth && startYear === endYear) {
        return `Tháng ${endMonth}/${endYear}`
      }

      return `Từ Tháng ${startMonth}/${startYear} - Tháng ${endMonth}/${endYear}`
    }
    case ResignedBreakdownPeriodType.week: {
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
    blockTypes: string[]
  } = {
    periodType: ResignedBreakdownPeriodType.month,
    blockTypes: [],
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
 * Build API params from URL
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams,
  validatedBranchId?: number,
  validatedBlockId?: number,
  validatedDepartmentId?: number,
  validatedBlockTypes?: string[]
): GetEmployeeStatusBreakdownReportParams {
  // Period type - always required
  const periodType = searchParams.get('period_type')
  const params: GetEmployeeStatusBreakdownReportParams = {
    period_type: (periodType && VALID_PERIOD_TYPES.includes(periodType as PeriodType)
      ? periodType
      : ResignedBreakdownPeriodType.month) as PeriodType,
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

  // Block type - only set if exactly one valid type
  if (validatedBlockTypes && validatedBlockTypes.length === 1) {
    params.block_type = validatedBlockTypes[0] as BlockType
  }

  return params
}

function ReportStaffStatisticsPage() {
  const ref = useRef<HTMLDivElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterFormRef = useRef<StaffTurnoverFiltersFormRef>(null)

  // Track if URL has been initialized
  const [isUrlReady, setIsUrlReady] = useState(false)

  const [orgLevel, setOrgLevel] = useState<ORG_LEVEL>(ORG_LEVEL.BRANCH)
  const [isShowChart, setIsShowChart] = useState<boolean>(true)

  // App constants for block type labels
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.BLOCK.TYPE],
  })

  const blockTypeOptions = useMemo(() => {
    return keysMapOptions.get(APP_CONSTANT_KEY.BLOCK.TYPE) || []
  }, [keysMapOptions])

  const orgLevels = useMemo(
    (): Array<{
      value: ORG_LEVEL
      label: string
    }> => [
      { value: ORG_LEVEL.BRANCH, label: 'Chi nhánh' },
      { value: ORG_LEVEL.BLOCK, label: 'Khối' },
      { value: ORG_LEVEL.DEPARTMENT, label: 'Phòng ban' },
    ],
    []
  )

  // Parse URL params
  const urlParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  // Initialize URL with defaults when empty
  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('period_type', ResignedBreakdownPeriodType.month)
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

  const branchQuery = useBranchForFilter(rawBranchId ?? 0)
  const isBranchValid = !!branchQuery.data

  const blockQuery = useBlockForFilter(rawBlockId ?? 0, rawBranchId)
  const isBlockValid = isBranchValid && !!blockQuery.data && blockQuery.data.branch === rawBranchId

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

  // Build API params
  const apiParams = useMemo(() => {
    if (!isUrlReady || isFilterValidationLoading) return undefined
    return buildApiParamsFromUrl(
      searchParams,
      validatedBranchId,
      validatedBlockId,
      validatedDepartmentId,
      validatedBlockTypes
    )
  }, [
    searchParams,
    isUrlReady,
    isFilterValidationLoading,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
    validatedBlockTypes,
  ])

  // API call
  const { data, isLoading } = useEmployeeStatusBreakdownReport(apiParams, {
    enabled: isUrlReady && !isFilterValidationLoading && !!apiParams,
  })

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
    const currentPeriodType = searchParams.get('period_type') || ResignedBreakdownPeriodType.month
    newParams.set('period_type', currentPeriodType)

    // Date range
    if (formData.dateRange?.from) {
      newParams.set('from_date', formatDateToApi(formData.dateRange.from) || '')
    }
    if (formData.dateRange?.to) {
      newParams.set('to_date', formatDateToApi(formData.dateRange.to) || '')
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

    // Block types (multi-select)
    if (formData.block_types && formData.block_types.length > 0) {
      formData.block_types.forEach((bt) => {
        newParams.append('block_type', bt)
      })
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterOpen(false)
  }, [searchParams, setSearchParams])

  // Handle clear filter
  const handleClearFilter = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  // Filter count - only count valid filters that are actually used in API
  const filterBadgeCount = useMemo(() => {
    let count = 0
    // Only count date range if at least one date is valid and parsed
    if (urlParams.fromDate || urlParams.toDate) count++
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

  // Filter title
  const filterTitle = useMemo(() => {
    const branchLabel = branchQuery.data?.name
    const blockLabel = blockQuery.data?.name
    const departmentLabel = departmentQuery.data?.name

    let baseTitle = 'Toàn công ty'

    if (branchLabel && isBranchValid && !blockLabel && !departmentLabel) {
      baseTitle = `Chi nhánh: ${branchLabel}`
    } else if (blockLabel && isBlockValid && !departmentLabel) {
      baseTitle = `Khối: ${blockLabel}`
    } else if (departmentLabel && isDepartmentValid) {
      baseTitle = `Phòng ban: ${departmentLabel}`
    }

    // Add block type labels
    if (validatedBlockTypes.length > 0 && blockTypeOptions.length > 0) {
      const optionMap = new Map(
        blockTypeOptions.map((option) => [String(option.value), option.label] as const)
      )
      const blockTypeLabels = validatedBlockTypes
        .map((value) => optionMap.get(value))
        .filter((label): label is string => Boolean(label))

      if (blockTypeLabels.length > 0) {
        const joinedBlockTypes = blockTypeLabels.join(', ')
        baseTitle = `${baseTitle} - Khối ${joinedBlockTypes}`
      }
    }

    return baseTitle
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

  const filterPeriod = useMemo(() => {
    return formatPeriodRangeLabel(urlParams.periodType, urlParams.fromDate, urlParams.toDate)
  }, [urlParams.periodType, urlParams.fromDate, urlParams.toDate])

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

  const handleExportTable = useCallback(() => {
    if (!data || !data.time_headers || data.time_headers.length === 0) {
      toastService.error('Không có dữ liệu để xuất file.')
      return
    }

    const fileName =
      filterTitle && filterTitle !== 'Toàn công ty'
        ? `Báo cáo Số lượng Nhân sự - ${filterTitle}`
        : 'Báo cáo Số lượng Nhân sự'

    exportStaffTurnoverTable({
      data,
      orgLevel,
      fileName,
      sheetName: 'Báo cáo',
      periodLabel: filterPeriod || undefined,
      dateRangeLabel: filterDateRangeTooltip || undefined,
    })
  }, [data, filterDateRangeTooltip, filterPeriod, filterTitle, orgLevel])

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

  return (
    <>
      <PageTitle handleFilter={() => setIsFilterOpen(true)} filterBadgeCount={filterBadgeCount} />

      <Flex direction={'column'} align={'start'} px={'7'}>
        {Boolean(urlParams.fromDate || urlParams.toDate) ? (
          <LabelDateFilter
            toDate={urlParams.toDate ? formatDateToApi(urlParams.toDate) : undefined}
            fromDate={urlParams.fromDate ? formatDateToApi(urlParams.fromDate) : undefined}
          />
        ) : (
          <>&nbsp;</>
        )}

        <Flex gap={'2'} align={'center'} justify={'start'}>
          <Text className={'typo-body-lg-medium text-dark-2 text-nowrap'}>
            Hiển thị dữ liệu đến:
          </Text>
          <RadioGroup
            id={`${Date.now()}-org-level-radio-group`}
            label={''}
            hiddenLabel
            value={orgLevel}
            options={orgLevels}
            onChange={(v) => {
              if (!isTypeOrgLevel(v)) return

              setOrgLevel(v)
            }}
            error={''}
            disabled={false}
          />
        </Flex>

        <Separator orientation={'horizontal'} className={'!w-full'} />

        <Flex justify={'between'} align={'center'} pt={'4'} className={'w-full'}>
          <StaffPageTab
            currentPeriod={urlParams.periodType}
            onPeriodChange={handlePeriodTypeChange}
          />
          <Flex gap={'2'} justify={'end'} align={'center'}>
            <Text className={'typo-body-base text-content-dark-2'}>Hiển thị biểu đồ</Text>
            <Switch checked={isShowChart} onChange={setIsShowChart} />
          </Flex>
        </Flex>

        <div ref={ref} className={'w-full'}>
          <Collapsible
            className="group/collapsible w-full"
            open={isShowChart}
            onOpenChange={(isOpen) => console.log(isOpen)}
          >
            <CollapsibleContent
              className={cn(
                'min-h-fit w-full',
                'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
              )}
            >
              <StaffChart
                data={data}
                orgLevel={orgLevel}
                isLoading={isLoading || isFilterValidationLoading}
                initialWidth={ref?.current?.getBoundingClientRect()?.width}
                filterTitle={filterTitle}
                filterPeriod={filterPeriod}
                filterDateRangeTooltip={filterDateRangeTooltip}
                filterEndDate={urlParams.toDate ? formatDate(urlParams.toDate) : undefined}
                reportType="statistics"
              />
            </CollapsibleContent>
          </Collapsible>
        </div>

        <Flex direction={'column'} py={'4'} className={'w-full'} gap={'4'}>
          <StaffChartTitle
            title={`Báo cáo Số lượng Nhân sự${filterTitle ? ' - ' + filterTitle : ''}`}
            subTitle={filterPeriod}
            handleDownload={handleExportTable}
            subTitleTooltip={filterDateRangeTooltip || undefined}
          />
          <StaffTable data={data} orgLevel={orgLevel} />
        </Flex>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        title="Bộ lọc"
        content={
          <StaffFiltersForm
            ref={filterFormRef}
            initialValues={formInitialValues}
            onApply={() => {}}
          />
        }
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterOpen(false)}
        onClearFilter={handleClearFilter}
      />
    </>
  )
}

export default ReportStaffStatisticsPage
