import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import UserActionTrackingTable from '@/features/user-action-tracking/UserActionTrackingTable.tsx'
import { useDebounceValue } from 'usehooks-ts'
import { startOfMonth, format, parse } from 'date-fns'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { useAuditLogSearch, type GetAuditLogSearchParams } from '@/services/audit-log-service.ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import UserActionTrackingFilterForm, {
  type UserActionTrackingFilterFormRef,
} from '@/features/user-action-tracking/UserActionTrackingFilterForm.tsx'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect.ts'
import { AuditLogSortOrder } from '@/constants/api-schema-aliases'

const EMPLOYEE_SELECT_FIELDS: string[] = ['code', 'id', 'fullname']

type FilterParams = {
  dateRange?: { from?: Date; to?: Date } | null
  employeeCodes?: string[]
  actions?: string[]
  object_types?: string[]
}

/**
 * Parse filter params from URL search params (without employeeCodes validation)
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  const params: FilterParams = {}

  const fromDate = searchParams.get('from_date')
  const toDate = searchParams.get('to_date')
  if (fromDate || toDate) {
    try {
      params.dateRange = {
        from: fromDate ? parse(fromDate, DATE_SERVER_FORMAT, new Date()) : undefined,
        to: toDate ? parse(toDate, DATE_SERVER_FORMAT, new Date()) : undefined,
      }
    } catch {
      // If parsing fails, leave as undefined
    }
  }

  // employeeCodes will be validated separately
  const employeeCodes = searchParams.getAll('employee_code')
  if (employeeCodes.length > 0) {
    params.employeeCodes = employeeCodes
  }

  const actions = searchParams.getAll('actions')
  if (actions.length > 0) {
    params.actions = actions
  }

  const objectTypes = searchParams.getAll('object_types')
  if (objectTypes.length > 0) {
    params.object_types = objectTypes
  }

  return params
}

/**
 * Build API params from URL search params
 * Note: Using 'any' for employee_code since API accepts multiple values via URL params
 */
function buildApiParamsFromUrl(searchParams: URLSearchParams): GetAuditLogSearchParams {
  const params: GetAuditLogSearchParams = {}

  // Pagination
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  // Ordering - convert URL format (-timestamp/timestamp) to API format (desc/asc)
  const ordering = searchParams.get('ordering')
  if (ordering) {
    // URL uses -field for desc, field for asc (only timestamp is sortable)
    params.sort_order = ordering.startsWith('-') ? AuditLogSortOrder.desc : AuditLogSortOrder.asc
  }

  // Search
  const searchTerm = searchParams.get('search_term')
  if (searchTerm) {
    params.search_term = searchTerm
  }

  // Filter params
  const fromDate = searchParams.get('from_date')
  if (fromDate) {
    params.from_date = fromDate
  }

  const toDate = searchParams.get('to_date')
  if (toDate) {
    params.to_date = toDate
  }

  // Note: employee_code will be added after validation

  const actions = searchParams.getAll('actions')
  if (actions.length > 0) {
    params.actions = actions
  }

  const objectTypes = searchParams.getAll('object_types')
  if (objectTypes.length > 0) {
    params.object_types = objectTypes
  }

  return params
}

const UserActionTrackingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<UserActionTrackingFilterFormRef>(null)

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search_term') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  // ===== Validate employee codes from URL =====
  const { loadInitialEmployeeOptions } = useEmployeeSelect({
    valueType: 'code',
    fields: EMPLOYEE_SELECT_FIELDS,
  })

  const employeeCodesFromUrl = useMemo(() => {
    return searchParams.getAll('employee_code').filter((code) => code.trim() !== '') as string[]
  }, [searchParams])

  const [validatedEmployeeCodes, setValidatedEmployeeCodes] = useState<string[]>([])
  const [isEmployeeCodesValidating, setIsEmployeeCodesValidating] = useState(false)

  useEffect(() => {
    let isCancelled = false

    if (!isUrlReady || employeeCodesFromUrl.length === 0) {
      setValidatedEmployeeCodes((prev) => (prev.length === 0 ? prev : []))
      setIsEmployeeCodesValidating(false)
      return () => {
        isCancelled = true
      }
    }

    setIsEmployeeCodesValidating(true)
    loadInitialEmployeeOptions(employeeCodesFromUrl)
      .then((options) => {
        if (isCancelled) return
        // loadInitialEmployeeOptions already filters out invalid codes
        const validCodes = options.map((opt) => String(opt.value))
        setValidatedEmployeeCodes(validCodes)
      })
      .catch((error) => {
        if (isCancelled) return
        console.error('Error validating employee codes:', error)
        setValidatedEmployeeCodes([])
      })
      .finally(() => {
        if (isCancelled) return
        setIsEmployeeCodesValidating(false)
      })

    return () => {
      isCancelled = true
    }
  }, [employeeCodesFromUrl, isUrlReady, loadInitialEmployeeOptions])

  // Initialize URL with defaults if empty (only on direct access, not navigate back)
  useEffect(() => {
    // Check actual browser URL to avoid race condition with searchParams
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    // Check if this is a navigate back (has referrer from same origin) vs direct access
    const referrer = document.referrer
    const isNavigateBack = referrer && referrer.includes(window.location.origin)

    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    // Only apply defaults if URL is completely empty AND this is direct access (not navigate back)
    if (isUrlEmpty && !isNavigateBack) {
      const today = new Date()
      const newParams = new URLSearchParams()

      // Set all defaults: pagination + date range
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      newParams.set('from_date', format(startOfMonth(today), DATE_SERVER_FORMAT))
      newParams.set('to_date', format(today, DATE_SERVER_FORMAT))

      setSearchParams(newParams, { replace: true })
    } else if (isUrlEmpty && isNavigateBack) {
      // URL is empty but this is navigate back - don't apply defaults, just mark as ready
      // The URL will be preserved as-is (empty) or restored by browser history
    } else {
      // URL has some params - only ensure page and page_size exist (don't force date range)
      const needsUpdate = !hasPage || !hasPageSize
      if (needsUpdate) {
        const newParams = new URLSearchParams(searchParams)
        if (!hasPage) {
          newParams.set('page', '1')
        }
        if (!hasPageSize) {
          newParams.set('page_size', String(PAGE_SIZE))
        }

        setSearchParams(newParams, { replace: true })
      }
    }

    setIsUrlReady(true)
  }, []) // Only run once on mount

  // Sync search input when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search_term') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

  // Update URL when debounced search changes
  useEffect(() => {
    if (!isUrlReady) return

    const currentSearchTerm = searchParams.get('search_term') || ''
    if (debouncedSearch !== currentSearchTerm) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search_term', debouncedSearch)
      } else {
        newParams.delete('search_term')
      }
      // Reset to page 1 when search changes
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady])

  const isAuditLogsQueryReady = isUrlReady && !isEmployeeCodesValidating

  // Build API params from URL with validated employee codes
  const apiParams = useMemo(() => {
    if (!isAuditLogsQueryReady) return undefined

    const params = buildApiParamsFromUrl(searchParams)

    // Override employee_code with validated codes only
    if (validatedEmployeeCodes.length > 0) {
      ;(params as any).employee_code = validatedEmployeeCodes
    }

    return params
  }, [searchParams, isAuditLogsQueryReady, validatedEmployeeCodes])

  // Call API with params derived from URL
  const {
    data: auditLogsData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useAuditLogSearch(apiParams, {
    enabled: isAuditLogsQueryReady && !!apiParams,
  })

  // Parse current filter params from URL for dialog (with validated employee codes)
  const currentFilterParams = useMemo(() => {
    return {
      ...parseFilterParamsFromUrl(searchParams),
      employeeCodes: validatedEmployeeCodes,
    }
  }, [searchParams, validatedEmployeeCodes])

  // Get pagination info from URL
  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  const currentOrdering = searchParams.get('ordering') || undefined

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Handle sorting change
  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (!field || !direction) {
        newParams.delete('ordering')
      } else {
        const ordering = direction === 'desc' ? `-${field}` : field
        newParams.set('ordering', ordering)
      }
      // Reset to page 1 when sorting changes
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Handle filter dialog open
  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  // Handle filter dialog close (cancel)
  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  // Handle clear filter in dialog (only clears form, doesn't close dialog or call API)
  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  // Handle apply filter (updates URL and closes dialog)
  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    const newParams = new URLSearchParams()

    // Keep non-filter params
    newParams.set('page', '1') // Reset to page 1 when filter changes
    newParams.set('page_size', String(pageSize))

    const searchTerm = searchParams.get('search_term')
    if (searchTerm) {
      newParams.set('search_term', searchTerm)
    }

    const ordering = searchParams.get('ordering')
    if (ordering) {
      newParams.set('ordering', ordering)
    }

    // Add filter params from form
    if (formData.dateRange?.from) {
      newParams.set('from_date', format(formData.dateRange.from, DATE_SERVER_FORMAT))
    }
    if (formData.dateRange?.to) {
      newParams.set('to_date', format(formData.dateRange.to, DATE_SERVER_FORMAT))
    }

    if (formData.employeeCodes && formData.employeeCodes.length > 0) {
      formData.employeeCodes.forEach((code: string) => {
        newParams.append('employee_code', code)
      })
    }

    if (formData.actions && formData.actions.length > 0) {
      formData.actions.forEach((action: string) => {
        newParams.append('actions', action)
      })
    }

    if (formData.object_types && formData.object_types.length > 0) {
      formData.object_types.forEach((objectType: string) => {
        newParams.append('object_types', objectType)
      })
    }
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  // Handle clear all (search + filters)
  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const today = new Date()
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    newParams.set('from_date', formatDateToApi(startOfMonth(today)))
    newParams.set('to_date', formatDateToApi(today))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  // Calculate active filter count (only count validated filters)
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.dateRange?.from || currentFilterParams.dateRange?.to) count++
    if (validatedEmployeeCodes.length > 0) count++
    if (currentFilterParams.actions && currentFilterParams.actions.length > 0) count++
    if (currentFilterParams.object_types && currentFilterParams.object_types.length > 0) count++
    return count
  }, [currentFilterParams, validatedEmployeeCodes])

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = auditLogsData?.results ?? []
    const count = auditLogsData?.count ?? 0

    const transformedData = results.map((log: any) => ({
      id: log.log_id,
      employeeCode: log.employee_code || '-',
      employeeName: log.full_name || log.username || '-',
      action: log.action || '-',
      targetObject: log.object_type || '-',
      timestamp: new Date(log.timestamp),
    }))

    return {
      tableData: transformedData,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [auditLogsData, pageSize])

  const isTableLoading = isLoading || isFetching || isRefetching || isEmployeeCodesValidating

  return (
    <>
      <PageTitle
        searchPlaceholder="Tìm kiếm"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchClassName={'!w-[350px]'}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
      />
      <Flex flexGrow={'1'} direction="column" gap="4">
        <UserActionTrackingTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          ordering={currentOrdering}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onClearAll={handleClearAll}
          hasFilter={!!searchInput || activeFilterCount > 0}
        />
      </Flex>

      {/* Filter Dialog using AppDialog with variant='filter' */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={<UserActionTrackingFilterForm ref={formRef} initialValues={currentFilterParams} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default UserActionTrackingPage
