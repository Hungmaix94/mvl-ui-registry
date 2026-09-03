import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { useDebounceValue } from 'usehooks-ts'
import { useTimesheetComplaintExport } from '@/features/attendance/timesheet/_shares/hooks/useTimesheetComplaintExport'
import type { GetProposalsTimesheetEntryComplaintParams } from '@/features/decision-and-proposal/services/proposal-misc-service'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import AppDialog from '@/components/dialog/AppDialog'
import TimesheetComplaintFilterForm, {
  type TimesheetComplaintFilterFormRef,
} from '@/features/attendance/timesheet-complaint/components/TimesheetComplaintFilterForm.tsx'
import TimesheetComplaintListTable from '@/features/attendance/timesheet-complaint/components/TimesheetComplaintListTable.tsx'
import { ProposalStatus, ProposalVerifierStatus } from '@/constants/api-schema-aliases'

type FilterParams = {
  timesheet_entry_complaint_complaint_date__gte?: string
  timesheet_entry_complaint_complaint_date__lte?: string
  branch_id?: number
  block_id?: number
  department_id?: number
  proposal_status?: ProposalStatus[]
  verifier_status?: ProposalVerifierStatus[]
}

/**
 * Parse filter params from URL search params (for form display only, no validation)
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  const params: FilterParams = {}

  const complaintDateGte = searchParams.get('timesheet_entry_complaint_complaint_date__gte')
  if (complaintDateGte?.trim()) {
    params.timesheet_entry_complaint_complaint_date__gte = complaintDateGte.trim()
  }
  const complaintDateLte = searchParams.get('timesheet_entry_complaint_complaint_date__lte')
  if (complaintDateLte?.trim()) {
    params.timesheet_entry_complaint_complaint_date__lte = complaintDateLte.trim()
  }

  const branchId = parsePositiveInt(searchParams.get('branch'))
  if (branchId) {
    params.branch_id = branchId
  }

  const blockId = parsePositiveInt(searchParams.get('block'))
  if (blockId) {
    params.block_id = blockId
  }

  const departmentId = parsePositiveInt(searchParams.get('department'))
  if (departmentId) {
    params.department_id = departmentId
  }

  const proposalStatusIn = searchParams.get('proposal_status__in')
  if (proposalStatusIn) {
    const statuses = proposalStatusIn.split(',').filter((s) => s.trim() !== '')
    const validStatuses = statuses.filter((s) =>
      Object.values(ProposalStatus).includes(s as ProposalStatus)
    ) as ProposalStatus[]
    if (validStatuses.length > 0) {
      params.proposal_status = validStatuses
    }
  }

  const verifierStatusIn = searchParams.get('verifiers__status__in')
  if (verifierStatusIn) {
    const statuses = verifierStatusIn.split(',').filter((s) => s.trim() !== '')
    const validStatuses = statuses.filter((s) =>
      Object.values(ProposalVerifierStatus).includes(s as ProposalVerifierStatus)
    ) as ProposalVerifierStatus[]
    if (validStatuses.length > 0) {
      params.verifier_status = validStatuses
    }
  }

  return params
}

/**
 * Build API params from URL search params (without validation - will be validated separately)
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetProposalsTimesheetEntryComplaintParams> {
  const params: NonNullable<GetProposalsTimesheetEntryComplaintParams> = {}

  // Pagination
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  // Search
  const search = searchParams.get('search_term')
  if (search) {
    params.search = search
  }

  // Date range (API schema: timesheet_entry_complaint_complaint_date__gte/_lte, format yyyy-MM-dd)
  const complaintDateGte = searchParams.get('timesheet_entry_complaint_complaint_date__gte')
  if (complaintDateGte?.trim()) {
    params.timesheet_entry_complaint_complaint_date__gte = complaintDateGte.trim()
  }
  const complaintDateLte = searchParams.get('timesheet_entry_complaint_complaint_date__lte')
  if (complaintDateLte?.trim()) {
    params.timesheet_entry_complaint_complaint_date__lte = complaintDateLte.trim()
  }

  // Note: branch, block, department, proposal_status__in will be added after validation

  return params
}

const TimesheetComplaintPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<TimesheetComplaintFilterFormRef>(null)

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search_term') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 300)

  const { openExportDialog } = useTimesheetComplaintExport()

  // ===== Validate async select IDs from URL =====
  const branchIdFromUrl = parsePositiveInt(searchParams.get('branch'))
  const blockIdFromUrl = parsePositiveInt(searchParams.get('block'))
  const departmentIdFromUrl = parsePositiveInt(searchParams.get('department'))

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

  const validatedFilterParams = useMemo(() => {
    return {
      branch_id: isBranchValid ? branchIdFromUrl : undefined,
      block_id: isBlockValid ? blockIdFromUrl : undefined,
      department_id: isDepartmentValid ? departmentIdFromUrl : undefined,
    }
  }, [
    isBranchValid,
    branchIdFromUrl,
    isBlockValid,
    blockIdFromUrl,
    isDepartmentValid,
    departmentIdFromUrl,
  ])

  const isFilterValidationLoading = useMemo(() => {
    const isBranchLoading = !!branchIdFromUrl && branchQuery.isLoading
    const isBlockLoading = !!blockIdFromUrl && blockQuery.isLoading
    const isDepartmentLoading = !!departmentIdFromUrl && departmentQuery.isLoading
    return isBranchLoading || isBlockLoading || isDepartmentLoading
  }, [
    branchIdFromUrl,
    branchQuery.isLoading,
    blockIdFromUrl,
    blockQuery.isLoading,
    departmentIdFromUrl,
    departmentQuery.isLoading,
  ])

  // Initialize URL with defaults if empty
  useEffect(() => {
    // Check actual browser URL to avoid race condition with searchParams
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    // Always apply defaults if URL is completely empty
    // When navigating back from detail, we use location.state.from which already has full query params,
    // so we won't hit isUrlEmpty in that case
    if (isUrlEmpty) {
      const newParams = new URLSearchParams()

      // Set defaults: pagination only (no filters)
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

  // Build API params from URL (with validated IDs)
  const apiParams = useMemo(() => {
    if (!isQueryReady) return undefined

    const baseParams = buildApiParamsFromUrl(searchParams)

    // timesheet_entry_complaint_complaint_date__gte/_lte are already set in buildApiParamsFromUrl

    // Only add validated IDs to API params (using created_by_* fields)
    if (validatedFilterParams.branch_id) {
      baseParams.created_by_branch = validatedFilterParams.branch_id
    }
    if (validatedFilterParams.block_id) {
      baseParams.created_by_block = validatedFilterParams.block_id
    }
    if (validatedFilterParams.department_id) {
      baseParams.created_by_department = validatedFilterParams.department_id
    }

    // Add proposal_status__in from URL (already validated in parseFilterParamsFromUrl)
    const proposalStatusIn = searchParams.get('proposal_status__in')
    if (proposalStatusIn) {
      const statuses = proposalStatusIn.split(',').filter((s) => s.trim() !== '')
      const validStatuses = statuses.filter((s) =>
        Object.values(ProposalStatus).includes(s as ProposalStatus)
      ) as ProposalStatus[]
      if (validStatuses.length > 0) {
        baseParams.proposal_status__in = validStatuses
      }
    }

    // Add verifiers__status__in from URL
    const verifierStatusIn = searchParams.get('verifiers__status__in')
    if (verifierStatusIn) {
      const statuses = verifierStatusIn.split(',').filter((s) => s.trim() !== '')
      const validStatuses = statuses.filter((s) =>
        Object.values(ProposalVerifierStatus).includes(s as ProposalVerifierStatus)
      ) as ProposalVerifierStatus[]
      if (validStatuses.length > 0) {
        baseParams.verifiers__status__in = validStatuses
      }
    }

    return baseParams
  }, [searchParams, isQueryReady, validatedFilterParams])

  // Parse current filter params from URL for dialog (merge validated IDs)
  const currentFilterParams = useMemo(() => {
    return {
      ...parseFilterParamsFromUrl(searchParams),
      ...validatedFilterParams,
    }
  }, [searchParams, validatedFilterParams])

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

    const search = searchParams.get('search_term')
    if (search) {
      newParams.set('search_term', search)
    }

    // Add filter params from form (URL keys match API schema)
    if (formData.timesheet_entry_complaint_complaint_date__gte) {
      newParams.set(
        'timesheet_entry_complaint_complaint_date__gte',
        formData.timesheet_entry_complaint_complaint_date__gte
      )
    }
    if (formData.timesheet_entry_complaint_complaint_date__lte) {
      newParams.set(
        'timesheet_entry_complaint_complaint_date__lte',
        formData.timesheet_entry_complaint_complaint_date__lte
      )
    }
    if (formData.branch) {
      newParams.set('branch', String(formData.branch))
    }
    if (formData.block) {
      newParams.set('block', String(formData.block))
    }
    if (formData.department) {
      newParams.set('department', String(formData.department))
    }
    if (
      formData.proposal_status__in &&
      Array.isArray(formData.proposal_status__in) &&
      formData.proposal_status__in.length > 0
    ) {
      newParams.set('proposal_status__in', formData.proposal_status__in.join(','))
    }
    if (
      formData.verifiers__status__in &&
      Array.isArray(formData.verifiers__status__in) &&
      formData.verifiers__status__in.length > 0
    ) {
      newParams.set('verifiers__status__in', formData.verifiers__status__in.join(','))
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

  const handleExport = useCallback(() => {
    // Build export params from URL (matching format expected by export hook)
    const exportFilterParams: Record<string, any> = {}

    const complaintDateGte = searchParams.get('timesheet_entry_complaint_complaint_date__gte')
    if (complaintDateGte?.trim()) {
      exportFilterParams.timesheet_entry_complaint_complaint_date__gte = complaintDateGte.trim()
    }
    const complaintDateLte = searchParams.get('timesheet_entry_complaint_complaint_date__lte')
    if (complaintDateLte?.trim()) {
      exportFilterParams.timesheet_entry_complaint_complaint_date__lte = complaintDateLte.trim()
    }
    if (validatedFilterParams.branch_id) {
      exportFilterParams.branch = validatedFilterParams.branch_id
    }
    if (validatedFilterParams.block_id) {
      exportFilterParams.block = validatedFilterParams.block_id
    }
    if (validatedFilterParams.department_id) {
      exportFilterParams.department = validatedFilterParams.department_id
    }

    const proposalStatusIn = searchParams.get('proposal_status__in')
    if (proposalStatusIn) {
      const statuses = proposalStatusIn.split(',').filter((s) => s.trim() !== '')
      const validStatuses = statuses.filter((s) =>
        Object.values(ProposalStatus).includes(s as ProposalStatus)
      ) as ProposalStatus[]
      if (validStatuses.length > 0) {
        exportFilterParams.proposal_status__in = validStatuses
      }
    }

    const verifierStatusIn = searchParams.get('verifiers__status__in')
    if (verifierStatusIn) {
      const statuses = verifierStatusIn.split(',').filter((s) => s.trim() !== '')
      const validStatuses = statuses.filter((s) =>
        Object.values(ProposalVerifierStatus).includes(s as ProposalVerifierStatus)
      ) as ProposalVerifierStatus[]
      if (validStatuses.length > 0) {
        exportFilterParams.verifiers__status__in = validStatuses
      }
    }

    openExportDialog(searchInput, exportFilterParams)
  }, [openExportDialog, searchInput, validatedFilterParams, searchParams])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (
      searchParams.get('timesheet_entry_complaint_complaint_date__gte') ||
      searchParams.get('timesheet_entry_complaint_complaint_date__lte')
    )
      count++
    if (validatedFilterParams.branch_id) count++
    if (validatedFilterParams.block_id) count++
    if (validatedFilterParams.department_id) count++

    const proposalStatusIn = searchParams.get('proposal_status__in')
    if (proposalStatusIn) {
      const statuses = proposalStatusIn.split(',').filter((s) => s.trim() !== '')
      const validStatuses = statuses.filter((s) =>
        Object.values(ProposalStatus).includes(s as ProposalStatus)
      )
      if (validStatuses.length > 0) count++
    }

    const verifierStatusIn = searchParams.get('verifiers__status__in')
    if (verifierStatusIn) {
      const statuses = verifierStatusIn.split(',').filter((s) => s.trim() !== '')
      const validStatuses = statuses.filter((s) =>
        Object.values(ProposalVerifierStatus).includes(s as ProposalVerifierStatus)
      )
      if (validStatuses.length > 0) count++
    }

    return count
  }, [validatedFilterParams, searchParams])

  // Convert currentFilterParams to form initialValues format
  const formInitialValues = useMemo(() => {
    return {
      timesheet_entry_complaint_complaint_date__gte:
        currentFilterParams.timesheet_entry_complaint_complaint_date__gte ?? '',
      timesheet_entry_complaint_complaint_date__lte:
        currentFilterParams.timesheet_entry_complaint_complaint_date__lte ?? '',
      branch_id: currentFilterParams.branch_id,
      block_id: currentFilterParams.block_id,
      department_id: currentFilterParams.department_id,
      proposal_status: currentFilterParams.proposal_status || [],
      verifier_status: currentFilterParams.verifier_status || [],
    }
  }, [currentFilterParams])

  return (
    <>
      <PageTitle
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm nhân viên, xác nhận công"
        searchClassName={'!w-[350px]'}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={handleExport}
      />
      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <TimesheetComplaintListTable
            apiParams={apiParams}
            isQueryReady={isQueryReady}
            currentPage={currentPage}
            pageSize={pageSize}
            onPaginationChange={handlePaginationChange}
            onClearFilter={handleClearAll}
            hasFilter={!!searchInput || activeFilterCount > 0}
          />
        </div>
      </Flex>

      {/* Filter Dialog using AppDialog with variant='filter' */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        title="Bộ lọc"
        content={<TimesheetComplaintFilterForm ref={formRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default TimesheetComplaintPage
