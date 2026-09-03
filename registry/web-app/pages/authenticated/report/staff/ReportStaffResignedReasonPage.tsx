import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import StaffFiltersForm, {
  type StaffTurnoverFiltersFormRef,
} from '@/features/report/staff/components/StaffFiltersForm.tsx'
import {
  useEmployeeResignedReasonSummaryReport,
  type GetEmployeeResignedReasonSummaryReportParams,
} from '@/services'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import StaffResignedReasonChart from '@/features/report/staff/components/StaffResignedReasonChart.tsx'
import toastService from '@/services/toast-service.tsx'
import exportExcel from '@/utils/excel'
import { formatDate, formatDateToApi } from '@/utils/date-utils'
import { parsePositiveInt, formatNumber } from '@/utils/common'
import AppDialog from '@/components/dialog/AppDialog'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { startOfMonth } from 'date-fns'
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
): GetEmployeeResignedReasonSummaryReportParams {
  const params: GetEmployeeResignedReasonSummaryReportParams = {}

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

const buildFilterTitle = (
  orgFilter: {
    branch?: { id: number; name: string }
    block?: { id: number; name: string }
    department?: { id: number; name: string }
  },
  selectedBlockTypeLabels: string[]
) => {
  const branchLabel = orgFilter.branch?.name
  const blockLabel = orgFilter.block?.name
  const departmentLabel = orgFilter.department?.name

  let baseTitle = 'Toàn công ty'

  if (branchLabel && !blockLabel && !departmentLabel) {
    baseTitle = `Chi nhánh: ${branchLabel}`
  } else if (blockLabel && !departmentLabel) {
    baseTitle = `Khối: ${blockLabel}`
  } else if (departmentLabel) {
    baseTitle = `Phòng ban: ${departmentLabel}`
  }

  if (selectedBlockTypeLabels.length) {
    const joinedBlockTypes = selectedBlockTypeLabels.join(', ')
    baseTitle = `${baseTitle} - Khối ${joinedBlockTypes}`
  }

  return baseTitle
}

const ReportStaffResignedReasonPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterFormRef = useRef<StaffTurnoverFiltersFormRef>(null)

  // Track if URL has been initialized
  const [isUrlReady, setIsUrlReady] = useState(false)

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

  // Initialize URL with defaults when empty
  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
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

  // Check if date range is valid (required for this report)
  const hasValidDateRange = !!(urlParams.fromDate || urlParams.toDate)

  // Build API params
  const apiParams = useMemo(() => {
    if (!isUrlReady || isFilterValidationLoading || !hasValidDateRange) return undefined
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
    hasValidDateRange,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
    validatedBlockTypes,
  ])

  // API call
  const { data, isLoading } = useEmployeeResignedReasonSummaryReport(apiParams, {
    enabled: isUrlReady && !isFilterValidationLoading && hasValidDateRange && !!apiParams,
  })

  // Handle apply filter
  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    // Validate date range
    if (!formData.dateRange?.from && !formData.dateRange?.to) {
      return
    }

    const newParams = new URLSearchParams()

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
  }, [setSearchParams])

  // Handle clear filter
  const handleClearFilter = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  // Handle validation change from form
  const [isFilterValid] = useState(true)

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
  const orgFilter = useMemo(
    () => ({
      branch: branchQuery.data?.name
        ? { id: validatedBranchId!, name: branchQuery.data.name }
        : undefined,
      block: blockQuery.data?.name
        ? { id: validatedBlockId!, name: blockQuery.data.name }
        : undefined,
      department: departmentQuery.data?.name
        ? { id: validatedDepartmentId!, name: departmentQuery.data.name }
        : undefined,
    }),
    [
      branchQuery.data?.name,
      blockQuery.data?.name,
      departmentQuery.data?.name,
      validatedBranchId,
      validatedBlockId,
      validatedDepartmentId,
    ]
  )

  const selectedBlockTypeLabels = useMemo(() => {
    if (!validatedBlockTypes.length || !blockTypeOptions.length) {
      return []
    }

    const optionMap = new Map(
      blockTypeOptions.map((option) => [String(option.value), option.label] as const)
    )

    return validatedBlockTypes
      .map((value) => optionMap.get(value))
      .filter((label): label is string => Boolean(label))
  }, [blockTypeOptions, validatedBlockTypes])

  const filterTitle = useMemo(
    () => buildFilterTitle(orgFilter, selectedBlockTypeLabels),
    [orgFilter, selectedBlockTypeLabels]
  )

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

  const chartTitle = useMemo(() => {
    return `Biểu đồ Tỉ lệ lý do nghỉ việc${
      filterTitle && filterTitle !== 'Toàn công ty' ? ` - ${filterTitle}` : ''
    }`
  }, [filterTitle])

  const handleExport = useCallback(() => {
    if (!data?.reasons?.length) {
      toastService.error('Không có dữ liệu để xuất file.')
      return
    }

    const rows = data.reasons.map((reason, index) => {
      const percentageValue = Number.parseFloat(reason.percentage ?? '0') || 0
      return {
        stt: index + 1,
        reason: reason.label,
        count: reason.count ?? 0,
        percentage: `${formatNumber(percentageValue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
      }
    })

    const exportTitle =
      filterTitle && filterTitle !== 'Toàn công ty'
        ? `Báo cáo Tỉ lệ lý do nghỉ việc - ${filterTitle}`
        : 'Báo cáo Tỉ lệ lý do nghỉ việc'

    exportExcel({
      fileName: exportTitle,
      sheets: [
        {
          name: 'Báo cáo',
          data: rows,
          columns: [
            { key: 'stt', header: 'STT' },
            { key: 'reason', header: 'Lý do nghỉ việc' },
            { key: 'count', header: 'Số lượng' },
            { key: 'percentage', header: 'Tỷ lệ' },
          ],
        },
      ],
    })
  }, [data?.reasons, filterTitle])

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

      <Flex direction={'column'} align={'start'} px={'7'} pb={'6'} className="w-full" gap="0">
        <StaffResignedReasonChart
          summary={data}
          isLoading={isLoading || isFilterValidationLoading}
          title={chartTitle}
          subTitle={filterDateRangeTooltip || undefined}
          subTitleTooltip={filterDateRangeTooltip || undefined}
          onDownload={handleExport}
        />
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
        disableConfirm={!isFilterValid}
      />
    </>
  )
}

export default ReportStaffResignedReasonPage
