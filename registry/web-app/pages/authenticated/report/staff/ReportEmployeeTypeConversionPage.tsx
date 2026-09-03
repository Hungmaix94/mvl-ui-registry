import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import EmployeeTypeConversionFilterForm, {
  type EmployeeTypeConversionFilterFormRef,
} from '@/features/report/staff/type-conversion/EmployeeTypeConversionFilterForm.tsx'
import EmployeeTypeConversionTable from '@/features/report/staff/type-conversion/EmployeeTypeConversionTable.tsx'
import {
  useEmployeeTypeConversionReport,
  useExportEmployeeTypeConversionReport,
  type GetEmployeeTypeConversionReportParams,
} from '@/services'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { useAbility } from '@/lib/ability.ts'
import { parsePositiveInt } from '@/utils/common'
import AppDialog from '@/components/dialog/AppDialog'
import { formatDateToApi } from '@/utils/date-utils'
import { startOfQuarter, endOfQuarter } from 'date-fns'
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
    employeeId?: number
    oldEmployeeType?: string
    newEmployeeType?: string
  } = {}

  // Date range - only parse if valid format
  const fromDate = searchParams.get('from_date')
  const toDate = searchParams.get('to_date')
  if (fromDate && isValidDateString(fromDate)) {
    const parsed = new Date(fromDate)
    if (!isNaN(parsed.getTime())) {
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
  if (toDate && isValidDateString(toDate)) {
    const parsed = new Date(toDate)
    if (!isNaN(parsed.getTime())) {
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

  // Cascade IDs
  params.branchId = parsePositiveInt(searchParams.get('branch')) ?? undefined
  params.blockId = parsePositiveInt(searchParams.get('block')) ?? undefined
  params.departmentId = parsePositiveInt(searchParams.get('department')) ?? undefined
  params.employeeId = parsePositiveInt(searchParams.get('employee')) ?? undefined

  // Employee types
  const oldEmployeeType = searchParams.get('old_employee_type')
  if (oldEmployeeType) {
    params.oldEmployeeType = oldEmployeeType
  }
  const newEmployeeType = searchParams.get('new_employee_type')
  if (newEmployeeType) {
    params.newEmployeeType = newEmployeeType
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
  validatedEmployeeId?: number
): GetEmployeeTypeConversionReportParams {
  const params: GetEmployeeTypeConversionReportParams = {}

  // Pagination
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = pageSize

  // Date range - only include if valid
  const fromDate = searchParams.get('from_date')
  const toDate = searchParams.get('to_date')
  if (fromDate && isValidDateString(fromDate)) {
    params.from_date_after = fromDate
  }
  if (toDate && isValidDateString(toDate)) {
    params.from_date_before = toDate
  }

  // Cascade IDs (validated)
  if (validatedBranchId) params.branch = validatedBranchId
  if (validatedBlockId) params.block = validatedBlockId
  if (validatedDepartmentId) params.department = validatedDepartmentId
  if (validatedEmployeeId) params.employee = validatedEmployeeId

  // Employee types
  const oldEmployeeType = searchParams.get('old_employee_type')
  if (oldEmployeeType) {
    params.old_employee_type = oldEmployeeType as any
  }
  const newEmployeeType = searchParams.get('new_employee_type')
  if (newEmployeeType) {
    params.new_employee_type = newEmployeeType as any
  }

  return params
}

const ReportEmployeeTypeConversionPage = () => {
  const ability = useAbility()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterFormRef = useRef<EmployeeTypeConversionFilterFormRef>(null)

  // Track if URL has been initialized
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Parse URL params
  const urlParams = useMemo(() => {
    return parseFilterParamsFromUrl(searchParams)
  }, [searchParams])

  // Initialize URL with defaults if empty (current quarter)
  useEffect(() => {
    // Check actual browser URL to avoid race condition with searchParams
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    // Check if date range exists (required for this report)
    const hasDateRange =
      (searchParams.has('from_date') || actualUrlParams.has('from_date')) &&
      (searchParams.has('to_date') || actualUrlParams.has('to_date'))

    // Date range is REQUIRED for this report - always set default if missing
    // regardless of navigate back status (because report cannot work without it)
    if (!hasDateRange) {
      const today = new Date()
      const quarterStart = startOfQuarter(today)
      const quarterEnd = endOfQuarter(today)

      const fromDate = formatDateToApi(quarterStart)
      const toDate = formatDateToApi(quarterEnd)

      if (fromDate && toDate) {
        const newParams = isUrlEmpty ? new URLSearchParams() : new URLSearchParams(searchParams)
        // Set default date range to current quarter
        newParams.set('from_date', fromDate)
        newParams.set('to_date', toDate)
        if (isUrlEmpty) {
          newParams.set('page', '1')
          newParams.set('page_size', String(PAGE_SIZE))
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
  const rawEmployeeId = urlParams.employeeId

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
  const validatedEmployeeId = rawEmployeeId // Employee doesn't need cascade validation

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
      validatedEmployeeId
    )
  }, [
    searchParams,
    isUrlReady,
    isFilterValidationLoading,
    hasValidDateRange,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
    validatedEmployeeId,
  ])

  // API call
  const { data: reportData, isLoading } = useEmployeeTypeConversionReport(apiParams, {
    enabled: isUrlReady && !isFilterValidationLoading && hasValidDateRange && !!apiParams,
  })

  // Extract branches: API may return array directly (data: [...]) or paginated (data: { results: [...] })
  const branchData = useMemo(() => {
    if (!reportData) return []
    if (Array.isArray(reportData)) return reportData
    return reportData.results ?? []
  }, [reportData])

  // Get pagination info
  // const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Calculate total records from paginated data
  // const totalRecords = useMemo(() => {
  //   if (!paginatedData) return 0

  //   // Handle case where paginatedData is an array directly
  //   if (Array.isArray(paginatedData)) {
  //     // Count all items in nested structure
  //     let count = 0
  //     paginatedData.forEach((branch) => {
  //       branch.children?.forEach((block: any) => {
  //         block.children?.forEach((department: any) => {
  //           count += department.children?.length ?? 0
  //         })
  //       })
  //     })
  //     return count
  //   }

  //   // Handle case where paginatedData is {count, results} object
  //   return (paginatedData as PaginatedEmployeeTypeConversionBranchItemList).count ?? 0
  // }, [paginatedData])

  // const pageCount = Math.ceil(totalRecords / pageSize) || 1

  // // Handle pagination change
  // const handlePaginationChange = useCallback(
  //   (pageIndex: number, newPageSize: number) => {
  //     const newParams = new URLSearchParams(searchParams)
  //     newParams.set('page', String(pageIndex + 1))
  //     newParams.set('page_size', String(newPageSize))
  //     setSearchParams(newParams, { replace: true })
  //   },
  //   [searchParams, setSearchParams]
  // )

  // Handle apply filter
  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData || !formData.dateRange?.from || !formData.dateRange?.to) return

    const newParams = new URLSearchParams()

    // Date range (required)
    newParams.set('from_date', formatDateToApi(formData.dateRange.from))
    newParams.set('to_date', formatDateToApi(formData.dateRange.to))

    // Reset to page 1 when filter changes
    newParams.set('page', '1')
    const currentPageSize = searchParams.get('page_size') || String(PAGE_SIZE)
    newParams.set('page_size', currentPageSize)

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
    if (formData.employee_id) {
      newParams.set('employee', String(formData.employee_id))
    }

    // Employee types
    if (formData.old_employee_type) {
      newParams.set('old_employee_type', formData.old_employee_type)
    }
    if (formData.new_employee_type) {
      newParams.set('new_employee_type', formData.new_employee_type)
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
    // Date range counts as 1 filter (only if both dates are present)
    if (urlParams.fromDate && urlParams.toDate) count++
    if (validatedBranchId) count++
    if (validatedBlockId) count++
    if (validatedDepartmentId) count++
    if (validatedEmployeeId) count++
    if (urlParams.oldEmployeeType) count++
    if (urlParams.newEmployeeType) count++
    return count
  }, [
    urlParams.fromDate,
    urlParams.toDate,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
    validatedEmployeeId,
    urlParams.oldEmployeeType,
    urlParams.newEmployeeType,
  ])

  // Export functionality
  const { openExportDialog } = useExportEmployeeTypeConversionReport()

  const handleExport = useCallback(() => {
    if (!apiParams) return
    // Convert API params to export params
    // Export API uses from_date (not from_date_after/from_date_before) and expects strings for IDs
    const exportParams: any = {
      block: apiParams.block ? String(apiParams.block) : undefined,
      branch: apiParams.branch ? String(apiParams.branch) : undefined,
      department: apiParams.department ? String(apiParams.department) : undefined,
      employee: apiParams.employee ? String(apiParams.employee) : undefined,
      old_employee_type: apiParams.old_employee_type,
      new_employee_type: apiParams.new_employee_type,
      ordering: apiParams.ordering,
    }
    // Use from_date_after as from_date for export (if available)
    if (apiParams.from_date_after) {
      exportParams.from_date = apiParams.from_date_after
    }
    openExportDialog(exportParams)
  }, [apiParams, openExportDialog])

  // Form initial values
  const formInitialValues = useMemo(() => {
    const dateRange: DateRange | null =
      urlParams.fromDate && urlParams.toDate
        ? {
            from: urlParams.fromDate,
            to: urlParams.toDate,
          }
        : null

    return {
      dateRange,
      branch: validatedBranchId,
      block: validatedBlockId,
      department: validatedDepartmentId,
      employee_id: validatedEmployeeId,
      branchName: branchQuery.data?.name,
      blockName: blockQuery.data?.name,
      departmentName: departmentQuery.data?.name,
      old_employee_type: urlParams.oldEmployeeType,
      new_employee_type: urlParams.newEmployeeType,
    }
  }, [
    urlParams.fromDate,
    urlParams.toDate,
    validatedBranchId,
    validatedBlockId,
    validatedDepartmentId,
    validatedEmployeeId,
    branchQuery.data?.name,
    blockQuery.data?.name,
    departmentQuery.data?.name,
    urlParams.oldEmployeeType,
    urlParams.newEmployeeType,
  ])

  // Track form validation state for apply button enable/disable
  const [isFormValid, setIsFormValid] = useState(false)

  // Handle validation change from form
  const handleValidationChange = useCallback((isValid: boolean) => {
    setIsFormValid(isValid)
  }, [])

  return (
    <>
      <PageTitle
        handleFilter={() => setIsFilterOpen(true)}
        filterBadgeCount={filterBadgeCount}
        handleExportBtnFull={
          ability.can('export', 'employee_type_conversion_report') ? handleExport : undefined
        }
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <EmployeeTypeConversionTable
            data={branchData}
            isLoading={isLoading || isFilterValidationLoading}
            enablePagination
            pageSize={pageSize}
            // manualPagination
            // currentPageIndex={currentPage - 1}
            // pageCount={pageCount}
            // totalRecords={totalRecords}
            // onPaginationChange={handlePaginationChange}
          />
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterOpen}
        onOpenChange={(open) => {
          setIsFilterOpen(open)
          // Reset validation state when dialog opens
          if (open) {
            // When dialog opens, check initial values
            setIsFormValid(!!(formInitialValues.dateRange?.from && formInitialValues.dateRange?.to))
          }
        }}
        title="Bộ lọc"
        content={
          <EmployeeTypeConversionFilterForm
            ref={filterFormRef}
            initialValues={formInitialValues}
            onApply={() => {}}
            onValidationChange={handleValidationChange}
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

export default ReportEmployeeTypeConversionPage
