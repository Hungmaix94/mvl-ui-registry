import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import RecruitmentRequestTable from '@/features/recruitment/request/view/RecruitmentRequestTable.tsx'
import { useRecruitmentRequestDelete } from '@/features/recruitment/request/delete/RecruitmentRequestDelete.tsx'
import { useRecruitmentRequestImport } from '@/features/recruitment/request/_shares/hooks/useRecruitmentRequestImport.tsx'
import {
  type GetRecruitmentRequestsParams,
  useRecruitmentRequests,
} from '@/features/recruitment/services/recruitment-request-service'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
} from '@/hooks/useFilterEntityValidation'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { useDebounceValue } from 'usehooks-ts'
import { parse } from 'date-fns'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import RecruitmentRequestFilterForm, {
  type RecruitmentRequestFilterFormRef,
} from '@/features/recruitment/request/view/RecruitmentRequestFilterForm.tsx'

type FilterParams = {
  dateRange?: { from?: Date; to?: Date } | null
  branch_id?: number
  block_id?: number
  department_id?: number
  recruitment_type?: string[]
  status?: string[]
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

  // Parse recruitment_type (comma-separated or single value)
  const recruitmentType = searchParams.get('recruitment_type')
  if (recruitmentType) {
    params.recruitment_type = recruitmentType.split(',').filter((v) => v.trim() !== '')
  }

  // Parse status (single value or array)
  const status = searchParams.get('status__in')
  if (status) {
    params.status = status.split(',').filter((v) => v.trim() !== '')
  }

  return params
}

/**
 * Build API params from URL search params (without validation - will be validated separately)
 */
type RecruitmentRequestsQueryParams = GetRecruitmentRequestsParams & {
  from_date?: string
  to_date?: string
  status__in?: string[]
  recruitment_type__in?: string[]
}

function buildApiParamsFromUrl(searchParams: URLSearchParams): RecruitmentRequestsQueryParams {
  const params: RecruitmentRequestsQueryParams = {}

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
  const search = searchParams.get('search')
  if (search) {
    params.search = search
  }

  // Filter params - date range
  const fromDate = searchParams.get('from_date')
  if (fromDate) {
    params.from_date = fromDate
  }

  const toDate = searchParams.get('to_date')
  if (toDate) {
    params.to_date = toDate
  }

  // Note: branch, block, department, recruitment_type, status__in will be added after validation

  return params
}

const RecruitmentRequestPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<RecruitmentRequestFilterFormRef>(null)
  const ability = useAbility()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useRecruitmentRequestDelete()
  const { openImportDialog } = useRecruitmentRequestImport()

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

  // Initialize URL with defaults when empty; ensure page/page_size when URL has other params
  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else if (!hasPage || !hasPageSize) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    }

    setIsUrlReady(true)
  }, []) // Only run once on mount

  // Sync search input when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

  // Update URL when debounced search changes
  useEffect(() => {
    if (!isUrlReady) return

    const currentSearchTerm = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearchTerm) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch)
      } else {
        newParams.delete('search')
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

    // Only add validated IDs to API params
    if (validatedFilterParams.branch_id) {
      baseParams.branch = validatedFilterParams.branch_id
    }
    if (validatedFilterParams.block_id) {
      baseParams.block = validatedFilterParams.block_id
    }
    if (validatedFilterParams.department_id) {
      baseParams.department = validatedFilterParams.department_id
    }

    // Add recruitment_type__in (multiple values from comma-separated query param)
    const recruitmentType = searchParams.get('recruitment_type')
    if (recruitmentType) {
      const types = recruitmentType
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)

      if (types.length > 0) {
        baseParams.recruitment_type__in = types
      }
    }

    // Add status__in (multiple values from comma-separated query param)
    const status = searchParams.get('status__in')
    if (status) {
      const statusList = status
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)

      if (statusList.length > 0) {
        baseParams.status__in = statusList
      }
    }

    return baseParams
  }, [searchParams, isQueryReady, validatedFilterParams])

  // Call API with params derived from URL
  const {
    data: recruitmentRequestsData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useRecruitmentRequests(isQueryReady && apiParams ? apiParams : undefined)

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
    const formData = formRef.current?.getValues?.() as any
    if (!formData) return

    const newParams = new URLSearchParams()

    // Keep non-filter params
    newParams.set('page', '1') // Reset to page 1 when filter changes
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search')
    if (search) {
      newParams.set('search', search)
    }

    const ordering = searchParams.get('ordering')
    if (ordering) {
      newParams.set('ordering', ordering)
    }

    // Add filter params from form
    if (formData.from_date) {
      newParams.set('from_date', formData.from_date)
    }
    if (formData.to_date) {
      newParams.set('to_date', formData.to_date)
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

    if (formData.recruitment_type) {
      const recruitmentTypeValue = Array.isArray(formData.recruitment_type)
        ? formData.recruitment_type.join(',')
        : formData.recruitment_type
      if (recruitmentTypeValue) {
        newParams.set('recruitment_type', recruitmentTypeValue)
      }
    }

    if (formData.status) {
      const statusValue = Array.isArray(formData.status)
        ? formData.status.join(',')
        : formData.status
      if (statusValue) {
        newParams.set('status__in', String(statusValue))
      }
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

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.RECRUITMENT_REQUEST_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleImport = useCallback(() => {
    openImportDialog()
  }, [openImportDialog])

  const handleDeleteRecruitmentRequest = useCallback(
    (request: any) => {
      openDeleteDialog(request)
    },
    [openDeleteDialog]
  )

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.dateRange?.from || currentFilterParams.dateRange?.to) count++
    if (currentFilterParams.branch_id) count++
    if (currentFilterParams.block_id) count++
    if (currentFilterParams.department_id) count++
    if (currentFilterParams.recruitment_type && currentFilterParams.recruitment_type.length > 0)
      count++
    if (currentFilterParams.status && currentFilterParams.status.length > 0) count++
    return count
  }, [currentFilterParams])

  // Check if error is "Invalid page" - treat as empty data
  const isInvalidPageError = useMemo(() => {
    if (!error) return false
    const errorObj =
      (error as any)?.error || (error as any)?.server || (error as any)?.response?.data?.error
    return (
      errorObj?.type === 'client_error' &&
      Array.isArray(errorObj?.errors) &&
      errorObj.errors.some(
        (err: any) => err.code === 'not_found' && err.detail?.includes('Invalid page')
      )
    )
  }, [error])

  // Transform data for table
  // If "Invalid page" error, show empty state (no data)
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    // If "Invalid page" error, return empty data
    if (isInvalidPageError) {
      return {
        tableData: [],
        pageCount: 0,
        totalRecords: 0,
      }
    }

    const results = recruitmentRequestsData?.results ?? []
    const count = recruitmentRequestsData?.count ?? 0

    return {
      tableData: results.map((item) => ({
        ...item,
        department_name: item.department?.name ?? '-',
        position_name: item.job_description?.title ?? '-',
      })),
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [recruitmentRequestsData, pageSize, isInvalidPageError])

  const isTableLoading = isLoading || isFetching || isRefetching

  // Convert currentFilterParams to form initialValues format
  const formInitialValues = useMemo(() => {
    return {
      date_range: currentFilterParams.dateRange || null,
      branch_id: currentFilterParams.branch_id,
      block_id: currentFilterParams.block_id,
      department_id: currentFilterParams.department_id,
      recruitment_type:
        Array.isArray(currentFilterParams.recruitment_type) &&
        currentFilterParams.recruitment_type.length > 0
          ? currentFilterParams.recruitment_type[0]
          : undefined,
      status: currentFilterParams.status || [],
    }
  }, [currentFilterParams])

  return (
    <>
      <PageTitle
        title="Quản lý đề nghị tuyển dụng"
        searchPlaceholder="Tìm kiếm theo mã đề nghị, tên đề nghị"
        searchClassName="!w-[350px]"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleCreateNew={ability.can('create', 'recruitment_request') ? handleCreateNew : undefined}
        handleImportBtnFull={
          ability.can('start_import', 'recruitment_request') ? handleImport : undefined
        }
      />
      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <RecruitmentRequestTable
            data={tableData}
            isLoading={isTableLoading}
            error={error}
            pageCount={pageCount}
            pageSize={pageSize}
            currentPage={currentPage}
            totalRecords={totalRecords}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            onDeleteRecruitmentRequest={handleDeleteRecruitmentRequest}
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
        content={<RecruitmentRequestFilterForm ref={formRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default RecruitmentRequestPage
