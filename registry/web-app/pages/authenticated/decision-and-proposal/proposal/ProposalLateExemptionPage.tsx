import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'
import LateExemptionTable from '@/features/decision-and-proposal/proposal/late-exemption/view/LateExemptionTable.tsx'
import {
  useProposalsLateExemption,
  type GetProposalsLateExemptionParams,
} from '@/features/decision-and-proposal/services/proposal-misc-service'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
  usePositionForFilter,
  useEmployeeForFilter,
} from '@/hooks/useFilterEntityValidation'
import { useProposalLateExemptionExport } from '@/features/decision-and-proposal/proposal/late-exemption/hooks/useProposalLateExemptionExport.tsx'
import { useAbility } from '@/lib/ability.ts'
import { useDebounceValue } from 'usehooks-ts'
import { parse } from 'date-fns'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import LateExemptionFilterForm, {
  type LateExemptionFilterFormRef,
} from '@/features/decision-and-proposal/proposal/_shares/components/LateExemptionFilterForm.tsx'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'

type FilterParams = {
  dateRange?: { from?: Date; to?: Date } | null
  proposal_date__gte?: string
  proposal_date__lte?: string
  late_exemption_duration_type?: string
  branchId?: number
  blockId?: number
  departmentId?: number
  positionId?: number
  employeeId?: number
  status?: string[]
  verifierStatus?: string[]
}

/**
 * Parse filter params from URL search params (for form display only, no validation)
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

  // Parse IDs without validation (validation happens via hooks)
  const branchId = parsePositiveInt(searchParams.get('branch'))
  if (branchId) params.branchId = branchId

  const blockId = parsePositiveInt(searchParams.get('block'))
  if (blockId) params.blockId = blockId

  const departmentId = parsePositiveInt(searchParams.get('department'))
  if (departmentId) params.departmentId = departmentId

  const positionId = parsePositiveInt(searchParams.get('position'))
  if (positionId) params.positionId = positionId

  const employeeId = parsePositiveInt(searchParams.get('employee'))
  if (employeeId) params.employeeId = employeeId

  // Parse status (multi params)
  const statuses = searchParams.getAll('status')
  if (statuses.length > 0) {
    params.status = statuses
  }

  // Parse verifier_status (multi params)
  const verifierStatuses = searchParams.getAll('verifier_status')
  if (verifierStatuses.length > 0) {
    params.verifierStatus = verifierStatuses
  }

  const lateExemptionDurationType = searchParams.get('late_exemption_duration_type')
  if (lateExemptionDurationType) {
    params.late_exemption_duration_type = lateExemptionDurationType
  }

  return params
}

/**
 * Build API params from URL search params (without validation - will be validated separately)
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetProposalsLateExemptionParams> {
  const params: NonNullable<GetProposalsLateExemptionParams> = {}

  // Pagination
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  // Ordering - URL format: -field for desc, field for asc
  const ordering = searchParams.get('ordering')
  if (ordering) {
    params.ordering = ordering
  }

  // Search
  const search = searchParams.get('search_term')
  if (search) {
    params.search = search
  }

  // Filter params - date range
  const fromDate = searchParams.get('from_date')
  if (fromDate) {
    params.proposal_date__gte = fromDate
  }

  const toDate = searchParams.get('to_date')
  if (toDate) {
    params.proposal_date__lte = toDate
  }

  const lateExemptionDurationType = searchParams.get('late_exemption_duration_type')
  if (lateExemptionDurationType) {
    params.late_exemption_duration_type =
      lateExemptionDurationType as NonNullable<GetProposalsLateExemptionParams>['late_exemption_duration_type']
  }

  // Status - multi params (use proposal_status__in for all cases)
  const statuses = searchParams.getAll('status')
  if (statuses.length > 0) {
    params.proposal_status__in = statuses
  }

  // Verifier Status - multi params (use verifiers__status__in for all cases)
  const verifierStatuses = searchParams.getAll('verifier_status')
  if (verifierStatuses.length > 0) {
    params.verifiers__status__in = verifierStatuses
  }

  // Note: organization IDs will be added after validation

  return params
}

export default function ProposalLateExemptionPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<LateExemptionFilterFormRef>(null)
  const ability = useAbility()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search_term') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openExportDialog } = useProposalLateExemptionExport()

  // Get valid status values for validation
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES],
  })

  const validStatusValues = useMemo(() => {
    const options = keysMapOptions.get(APP_CONSTANT_KEY.HRM.PROPOSAL_PROPOSAL_STATUS_CHOICES) || []
    return new Set(options.map((opt: any) => opt.value))
  }, [keysMapOptions])

  // ===== Validate cascade organization IDs from URL =====
  const branchIdFromUrl = parsePositiveInt(searchParams.get('branch'))
  const blockIdFromUrl = parsePositiveInt(searchParams.get('block'))
  const departmentIdFromUrl = parsePositiveInt(searchParams.get('department'))
  const positionIdFromUrl = parsePositiveInt(searchParams.get('position'))
  const employeeIdFromUrl = parsePositiveInt(searchParams.get('employee'))

  const branchQuery = useBranchForFilter(branchIdFromUrl ?? 0)
  const isBranchValid = !!branchQuery.data

  const blockQuery = useBlockForFilter(blockIdFromUrl ?? 0, branchIdFromUrl)
  const isBlockValid =
    isBranchValid && !!blockQuery.data && blockQuery.data.branch === branchIdFromUrl

  const departmentQuery = useDepartmentForFilter(
    departmentIdFromUrl ?? 0,
    branchIdFromUrl,
    blockIdFromUrl
  )
  const isDepartmentValid = isBlockValid && !!departmentQuery.data

  const positionQuery = usePositionForFilter(positionIdFromUrl ?? 0)
  const isPositionValid = !!positionQuery.data

  const employeeQuery = useEmployeeForFilter(employeeIdFromUrl ?? 0)
  const isEmployeeValid = !!employeeQuery.data

  const validatedFilterParams = useMemo(() => {
    return {
      branchId: isBranchValid ? branchIdFromUrl : undefined,
      blockId: isBlockValid ? blockIdFromUrl : undefined,
      departmentId: isDepartmentValid ? departmentIdFromUrl : undefined,
      positionId: isPositionValid ? positionIdFromUrl : undefined,
      employeeId: isEmployeeValid ? employeeIdFromUrl : undefined,
    }
  }, [
    isBranchValid,
    branchIdFromUrl,
    isBlockValid,
    blockIdFromUrl,
    isDepartmentValid,
    departmentIdFromUrl,
    isPositionValid,
    positionIdFromUrl,
    isEmployeeValid,
    employeeIdFromUrl,
  ])

  const isFilterValidationLoading = useMemo(() => {
    const isBranchLoading = !!branchIdFromUrl && branchQuery.isLoading
    const isBlockLoading = !!blockIdFromUrl && isBranchValid && blockQuery.isLoading
    const isDepartmentLoading = !!departmentIdFromUrl && isBlockValid && departmentQuery.isLoading
    const isPositionLoading = !!positionIdFromUrl && positionQuery.isLoading
    const isEmployeeLoading = !!employeeIdFromUrl && employeeQuery.isLoading

    return (
      isBranchLoading ||
      isBlockLoading ||
      isDepartmentLoading ||
      isPositionLoading ||
      isEmployeeLoading
    )
  }, [
    branchIdFromUrl,
    branchQuery.isLoading,
    blockIdFromUrl,
    isBranchValid,
    blockQuery.isLoading,
    departmentIdFromUrl,
    isBlockValid,
    departmentQuery.isLoading,
    positionIdFromUrl,
    positionQuery.isLoading,
    employeeIdFromUrl,
    employeeQuery.isLoading,
  ])

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
      const newParams = new URLSearchParams()

      // Set defaults: pagination only (no filters)
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))

      setSearchParams(newParams, { replace: true })
    } else if (isUrlEmpty && isNavigateBack) {
      // URL is empty but this is navigate back - still need pagination for API to work
      // Set minimal defaults (pagination only) to ensure API can be called
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else {
      // URL has some params - only ensure page and page_size exist
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
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  const isQueryReady = isUrlReady && !isFilterValidationLoading

  // Build API params from URL (with validated IDs and filtered status)
  const apiParams = useMemo(() => {
    if (!isQueryReady) return undefined

    const baseParams = buildApiParamsFromUrl(searchParams)

    // Only add validated IDs to API params
    if (validatedFilterParams.branchId) {
      baseParams.created_by_branch = validatedFilterParams.branchId
    }
    if (validatedFilterParams.blockId) {
      baseParams.created_by_block = validatedFilterParams.blockId
    }
    if (validatedFilterParams.departmentId) {
      baseParams.created_by_department = validatedFilterParams.departmentId
    }
    if (validatedFilterParams.positionId) {
      baseParams.created_by_position = validatedFilterParams.positionId
    }
    if (validatedFilterParams.employeeId) {
      baseParams.created_by = validatedFilterParams.employeeId
    }

    // Filter status values - only include valid ones
    const statusesFromUrl = searchParams.getAll('status')
    const validStatuses = statusesFromUrl.filter((s) => validStatusValues.has(s))
    if (validStatuses.length > 0) {
      baseParams.proposal_status__in = validStatuses
    } else if (statusesFromUrl.length > 0) {
      // If there were statuses in URL but none are valid, remove from params
      delete baseParams.proposal_status__in
    }

    return baseParams
  }, [searchParams, isQueryReady, validatedFilterParams, validStatusValues])

  // Call API with params derived from URL
  const {
    data: proposalsData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useProposalsLateExemption(apiParams, {
    enabled: isQueryReady && !!apiParams,
  })

  // Parse current filter params from URL for dialog (merge validated IDs and filtered arrays)
  const currentFilterParams = useMemo(() => {
    const urlParams = parseFilterParamsFromUrl(searchParams)

    // Filter status array to only include valid values
    const validStatuses = urlParams.status?.filter((s) => validStatusValues.has(s)) || []

    return {
      ...urlParams,
      ...validatedFilterParams,
      status: validStatuses.length > 0 ? validStatuses : undefined,
      late_exemption_duration_type: urlParams.late_exemption_duration_type,
    }
  }, [searchParams, validatedFilterParams, validStatusValues])

  // Get pagination info from URL
  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

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
    const formData = formRef.current?.getRawValues?.()
    if (!formData) return

    const newParams = new URLSearchParams()

    // Keep non-filter params
    newParams.set('page', '1') // Reset to page 1 when filter changes
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search_term')
    if (search) {
      newParams.set('search_term', search)
    }

    const ordering = searchParams.get('ordering')
    if (ordering) {
      newParams.set('ordering', ordering)
    }

    // Add filter params from form (field names match API schema)
    if (formData.proposal_date__gte) {
      newParams.set('from_date', formData.proposal_date__gte)
    }
    if (formData.proposal_date__lte) {
      newParams.set('to_date', formData.proposal_date__lte)
    }
    if (formData.late_exemption_duration_type) {
      newParams.set('late_exemption_duration_type', formData.late_exemption_duration_type)
    }

    if (formData.branch_id) {
      newParams.set('branch', String(formData.branch_id))
    }
    if (formData.block_id) {
      newParams.set('block', String(formData.block_id))
    }
    if (formData.department_id) {
      newParams.set('department', String(formData.department_id))
    }
    if (formData.position_id) {
      newParams.set('position', String(formData.position_id))
    }
    if (formData.employee_id) {
      newParams.set('employee', String(formData.employee_id))
    }

    // Add status (multi params)
    if (formData.status && formData.status.length > 0) {
      formData.status.forEach((status) => {
        newParams.append('status', status)
      })
    }

    // Add verifier_status (multi params)
    if (formData.verifier_status && formData.verifier_status.length > 0) {
      formData.verifier_status.forEach((verifierStatus) => {
        newParams.append('verifier_status', verifierStatus)
      })
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams, pageSize])

  // Handle clear all (search + filters) - reset to defaults (no filters)
  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.dateRange?.from || currentFilterParams.dateRange?.to) count++
    if (currentFilterParams.late_exemption_duration_type) count++
    if (currentFilterParams.branchId) count++
    if (currentFilterParams.blockId) count++
    if (currentFilterParams.departmentId) count++
    if (currentFilterParams.positionId) count++
    if (currentFilterParams.employeeId) count++
    if (currentFilterParams.status && currentFilterParams.status.length > 0) count++
    if (currentFilterParams.verifierStatus && currentFilterParams.verifierStatus.length > 0) count++
    return count
  }, [currentFilterParams])

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = proposalsData?.results ?? []
    const count = proposalsData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [proposalsData, pageSize])

  const isTableLoading = isLoading || isFetching || isRefetching

  // Convert currentFilterParams to form initialValues format (field names match API schema)
  const formInitialValues = useMemo(() => {
    const fromStr = currentFilterParams.dateRange?.from
      ? formatDateToApi(currentFilterParams.dateRange.from)
      : undefined
    const toStr = currentFilterParams.dateRange?.to
      ? formatDateToApi(currentFilterParams.dateRange.to)
      : undefined
    return {
      proposal_date__gte: fromStr ?? '',
      proposal_date__lte: toStr ?? '',
      late_exemption_duration_type: currentFilterParams.late_exemption_duration_type,
      branch_id: currentFilterParams.branchId,
      block_id: currentFilterParams.blockId,
      department_id: currentFilterParams.departmentId,
      position_id: currentFilterParams.positionId,
      employee_id: currentFilterParams.employeeId,
      status: currentFilterParams.status || [],
      verifier_status: currentFilterParams.verifierStatus || [],
    }
  }, [currentFilterParams])

  // Handle export
  const handleExport = useCallback(() => {
    const proposal_date__gte = currentFilterParams.dateRange?.from
      ? formatDateToApi(currentFilterParams.dateRange.from)
      : undefined
    const proposal_date__lte = currentFilterParams.dateRange?.to
      ? formatDateToApi(currentFilterParams.dateRange.to)
      : undefined
    const exportParams: any = {
      branch_id: currentFilterParams.branchId,
      block_id: currentFilterParams.blockId,
      department_id: currentFilterParams.departmentId,
      position_id: currentFilterParams.positionId,
      employee_id: currentFilterParams.employeeId,
      status: currentFilterParams.status || [],
      verifier_status: currentFilterParams.verifierStatus || [],
      proposal_date__gte,
      proposal_date__lte,
      late_exemption_duration_type: currentFilterParams.late_exemption_duration_type,
    }
    openExportDialog(searchInput, exportParams)
  }, [openExportDialog, searchInput, currentFilterParams])

  return (
    <>
      <PageTitle
        title="Miễn trừ trễ"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm đề xuất, nhân viên đề xuất"
        searchClassName="!w-[356px]"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={
          ability.can('export', 'proposal_late_exemption') ? handleExport : undefined
        }
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <LateExemptionTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onClearFilter={handleClearAll}
          hasFilter={!!searchInput || activeFilterCount > 0}
        />
      </Flex>

      {/* Filter Dialog using AppDialog with variant='filter' */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        title="Bộ lọc"
        content={
          <LateExemptionFilterForm
            key={isFilterDialogOpen ? 'filter-open' : 'filter-closed'}
            ref={formRef}
            initialValues={formInitialValues}
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}
