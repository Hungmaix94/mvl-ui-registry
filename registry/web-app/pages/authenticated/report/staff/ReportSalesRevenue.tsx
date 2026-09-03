import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import SalesRevenueFilterForm, {
  type SalesRevenueFilterFormRef,
  type SalesRevenueFilterFormValues,
} from '@/features/report/staff/sales-revenue/SalesRevenueFilterForm.tsx'
import SalesRevenueTable from '@/features/report/staff/sales-revenue/SalesRevenueTable.tsx'
import { type GetSalesRevenueReportsParams, useSalesRevenueReports } from '@/services'
import { useSalesRevenueReportExport } from '@/features/report/staff/sales-revenue/hooks/useSalesRevenueReportExport.tsx'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import { parsePositiveInt } from '@/utils/common'
import AppDialog from '@/components/dialog/AppDialog'
import { formatDateToApi } from '@/utils/date-utils'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import type { DateRange } from 'react-day-picker'

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
    fromDate?: Date
    toDate?: Date
    branchId?: number
    blockId?: number
    departmentId?: number
  } = {}

  // Date range - only parse if valid format
  const fromDate = searchParams.get('from_date')
  const toDate = searchParams.get('to_date')
  if (fromDate && isValidDateString(fromDate)) {
    const parsed = new Date(fromDate)
    if (!isNaN(parsed.getTime())) {
      params.fromDate = parsed
    }
  }
  if (toDate && isValidDateString(toDate)) {
    const parsed = new Date(toDate)
    if (!isNaN(parsed.getTime())) {
      params.toDate = parsed
    }
  }

  // Cascade IDs
  params.branchId = parsePositiveInt(searchParams.get('branch')) ?? undefined
  params.blockId = parsePositiveInt(searchParams.get('block')) ?? undefined
  params.departmentId = parsePositiveInt(searchParams.get('department')) ?? undefined

  return params
}

/**
 * Build API parameters from validated URL params
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams,
  validatedBranchId?: number,
  validatedBlockId?: number,
  validatedDepartmentId?: number
): GetSalesRevenueReportsParams | undefined {
  const urlParams = parseFilterParamsFromUrl(searchParams)

  // Date range is required
  if (!urlParams.fromDate || !urlParams.toDate) {
    return undefined
  }

  // Convert dates to MM/YYYY format for the API
  const fromMonth = format(urlParams.fromDate, 'MM/yyyy')
  const toMonth = format(urlParams.toDate, 'MM/yyyy')

  const apiParams: GetSalesRevenueReportsParams = {
    from_month: fromMonth,
    to_month: toMonth,
  }

  // Add validated org filters if present
  if (validatedBranchId) {
    apiParams.branch = validatedBranchId
  }
  if (validatedBlockId) {
    apiParams.block = validatedBlockId
  }
  if (validatedDepartmentId) {
    apiParams.department = validatedDepartmentId
  }

  return apiParams
}

/**
 * Build form initial values from URL
 */
function buildFormInitialValues(
  urlParams: ReturnType<typeof parseFilterParamsFromUrl>,
  branchName?: string,
  blockName?: string,
  departmentName?: string
): SalesRevenueFilterFormValues {
  const dateRange: DateRange | null =
    urlParams.fromDate && urlParams.toDate
      ? { from: urlParams.fromDate, to: urlParams.toDate }
      : null

  return {
    dateRange,
    branch: urlParams.branchId,
    block: urlParams.blockId,
    department: urlParams.departmentId,
    branchName,
    blockName,
    departmentName,
  }
}

function ReportStaffSalesRevenuePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<SalesRevenueFilterFormRef>(null)

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [isFilterValid, setIsFilterValid] = useState(true)

  // ===== Initialize URL with default dates if empty =====
  useEffect(() => {
    const hasExistingParams = searchParams.toString().length > 0
    if (!hasExistingParams) {
      const today = new Date()
      const fromDate = formatDateToApi(startOfMonth(today))
      const toDate = formatDateToApi(endOfMonth(today))

      const newParams = new URLSearchParams()
      if (fromDate) {
        newParams.set('from_date', fromDate)
      }
      if (toDate) {
        newParams.set('to_date', toDate)
      }
      setSearchParams(newParams, { replace: true })
    }
    setIsUrlReady(true)
  }, []) // Only run once on mount

  // ===== CASCADE VALIDATION =====
  const urlParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])
  const rawBranchId = urlParams.branchId
  const rawBlockId = urlParams.blockId
  const rawDepartmentId = urlParams.departmentId

  // Branch validation
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
  const hasValidDateRange = !!(urlParams.fromDate && urlParams.toDate)

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

  // ===== FETCH DATA =====
  const { data: reportData, isLoading: isReportLoading } = useSalesRevenueReports(apiParams, {
    enabled: !!apiParams,
  })

  // Debug: Log the response structure
  console.log('reportData:', reportData)

  // Extract the actual data array - handle different response structures
  const salesRevenueData = useMemo(() => {
    if (!reportData) return []

    // Check for { success, data, error } structure
    if (typeof reportData === 'object' && 'data' in reportData) {
      return (reportData as any).data || []
    }

    // Check for paginated { results } structure
    if (typeof reportData === 'object' && 'results' in reportData) {
      return (reportData as any).results || []
    }

    // Direct array
    if (Array.isArray(reportData)) {
      return reportData
    }

    return []
  }, [reportData])

  // ===== FORM INITIAL VALUES =====
  const formInitialValues = useMemo(() => {
    return buildFormInitialValues(
      urlParams,
      branchQuery.data?.name,
      blockQuery.data?.name,
      departmentQuery.data?.name
    )
  }, [urlParams, branchQuery.data, blockQuery.data, departmentQuery.data])

  // ===== FILTER HANDLERS =====
  const handleClickOpenFilter = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  const handleClickClearFilter = useCallback(() => {
    formRef.current?.clearForm()
    // Don't update URL or close dialog - user must click Apply to confirm
  }, [])

  const handleClickApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    const newParams = new URLSearchParams()

    // Date range
    if (formData.dateRange?.from) {
      const fromDate = formatDateToApi(formData.dateRange.from)
      if (fromDate) {
        newParams.set('from_date', fromDate)
      }
    }
    if (formData.dateRange?.to) {
      const toDate = formatDateToApi(formData.dateRange.to)
      if (toDate) {
        newParams.set('to_date', toDate)
      }
    }

    // Organization filters
    if (formData.branch) {
      newParams.set('branch', formData.branch.toString())
    }
    if (formData.block) {
      newParams.set('block', formData.block.toString())
    }
    if (formData.department) {
      newParams.set('department', formData.department.toString())
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [setSearchParams])

  // ===== EXPORT FUNCTIONALITY =====
  const { openExportDialog: openExport } = useSalesRevenueReportExport()

  const handleExport = useCallback(() => {
    openExport({
      fromDate: urlParams.fromDate,
      toDate: urlParams.toDate,
      branchId: validatedBranchId,
      blockId: validatedBlockId,
      departmentId: validatedDepartmentId,
    })
  }, [
    openExport,
    urlParams.fromDate,
    urlParams.toDate,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
  ])

  // ===== COUNT ACTIVE FILTERS =====
  const activeFilterCount = useMemo(() => {
    let count = 0

    // Check if date range is different from default (current month)
    const today = new Date()
    const defaultFrom = startOfMonth(today)
    const defaultTo = endOfMonth(today)

    if (urlParams.fromDate && urlParams.toDate) {
      const isDefaultDateRange =
        urlParams.fromDate.getTime() === defaultFrom.getTime() &&
        urlParams.toDate.getTime() === defaultTo.getTime()

      if (!isDefaultDateRange) {
        count++
      }
    }

    if (validatedBranchId) count++
    if (validatedBlockId) count++
    if (validatedDepartmentId) count++
    return count
  }, [
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
    urlParams.fromDate,
    urlParams.toDate,
  ])

  return (
    <>
      <PageTitle
        title="Đánh giá chất lượng nhân sự"
        handleFilter={handleClickOpenFilter}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={handleExport}
      />

      <Flex direction="column" gap="4" className="px-10">
        <SalesRevenueTable data={salesRevenueData} isLoading={isReportLoading} />
      </Flex>

      <AppDialog
        variant="filter"
        title="Bộ lọc"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        onCancel={handleCloseFilterDialog}
        onClearFilter={handleClickClearFilter}
        onConfirm={handleClickApplyFilter}
        disableConfirm={!isFilterValid}
        content={
          <SalesRevenueFilterForm
            ref={formRef}
            initialValues={formInitialValues}
            onValidationChange={setIsFilterValid}
          />
        }
      />
    </>
  )
}

export default ReportStaffSalesRevenuePage
