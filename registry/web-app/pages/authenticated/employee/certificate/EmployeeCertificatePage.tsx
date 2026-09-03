import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import EmployeeCertificateTable from '@/features/employee/certificate/view/EmployeeCertificateTable.tsx'
import EmployeeCertificateFilterForm, {
  type EmployeeCertificateFilterFormRef,
} from '@/features/employee/certificate/_shares/components/EmployeeCertificateFilterForm.tsx'
import { useEmployeeCertificateDelete } from '@/features/employee/certificate/delete/EmployeeCertificateDelete.tsx'
import {
  type EmployeeCertificate,
  type GetEmployeeCertificatesExportParams,
  type GetEmployeeCertificatesParams,
  useEmployeeCertificates,
} from '@/features/employee/services/employee-certificate-service'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
  usePositionForFilter,
  useEmployeeForFilter,
} from '@/hooks/useFilterEntityValidation'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { useDebounceValue } from 'usehooks-ts'
import { parse } from 'date-fns'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import { useEmployeeCertificateExport } from '@/features/employee/certificate/_shares/hooks/useEmployeeCertificateExport.tsx'
import { useEmployeeCertificateImport } from '@/features/employee/certificate/_shares/hooks/useEmployeeCertificateImport.tsx'
import { EmployeeCertificateType, EmployeeCertificateStatus } from '@/constants/api-schema-aliases'
// Valid enum values for validation
const VALID_CERTIFICATE_TYPES = Object.values(EmployeeCertificateType)
const VALID_STATUSES = Object.values(EmployeeCertificateStatus)

type FilterParams = {
  certificateTypes?: string[]
  branchId?: number
  blockId?: number
  departmentId?: number
  positionId?: number
  employeeId?: number
  expiryDateRange?: { from?: Date; to?: Date } | null
  statuses?: string[]
}

/**
 * Parse and sanitize filter params from URL (for form display)
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  const params: FilterParams = {}

  // Certificate types - validate against enum
  const certificateTypes = searchParams.get('certificate_types')
  if (certificateTypes) {
    const types = certificateTypes
      .split(',')
      .filter((t) => VALID_CERTIFICATE_TYPES.includes(t as any))
    if (types.length > 0) {
      params.certificateTypes = types
    }
  }

  // Statuses - validate against enum
  const statuses = searchParams.getAll('status')
  if (statuses.length > 0) {
    const validStatuses = statuses.filter((s) => VALID_STATUSES.includes(s as any))
    if (validStatuses.length > 0) {
      params.statuses = validStatuses
    }
  }

  // Organization IDs (will be validated separately via hooks)
  const branchId = parsePositiveInt(searchParams.get('branch_id'))
  if (branchId) params.branchId = branchId

  const blockId = parsePositiveInt(searchParams.get('block_id'))
  if (blockId) params.blockId = blockId

  const departmentId = parsePositiveInt(searchParams.get('department_id'))
  if (departmentId) params.departmentId = departmentId

  const positionId = parsePositiveInt(searchParams.get('position'))
  if (positionId) params.positionId = positionId

  const employeeId = parsePositiveInt(searchParams.get('employee'))
  if (employeeId) params.employeeId = employeeId

  // Expiry date range
  const expiryFrom = searchParams.get('expiry_date_from')
  const expiryTo = searchParams.get('expiry_date_to')
  if (expiryFrom || expiryTo) {
    try {
      params.expiryDateRange = {
        from: expiryFrom ? parse(expiryFrom, DATE_SERVER_FORMAT, new Date()) : undefined,
        to: expiryTo ? parse(expiryTo, DATE_SERVER_FORMAT, new Date()) : undefined,
      }
    } catch {
      // Invalid date format, ignore
    }
  }

  return params
}

/**
 * Build API params from URL (without cascade ID validation - will be added later)
 */
function buildBaseApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetEmployeeCertificatesParams> {
  const params: NonNullable<GetEmployeeCertificatesParams> = {}

  // Pagination
  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  // Ordering
  const ordering = searchParams.get('ordering')
  if (ordering) {
    params.ordering = ordering
  }

  // Search
  const search = searchParams.get('search')
  if (search) {
    params.search = search
  }

  // Certificate types - validate against enum
  const certificateTypes = searchParams.get('certificate_types')
  if (certificateTypes) {
    const validTypes = certificateTypes
      .split(',')
      .filter((t) => VALID_CERTIFICATE_TYPES.includes(t as any))
    if (validTypes.length > 0) {
      params.certificate_types = validTypes.join(',')
    }
  }

  // Statuses - validate against enum (API supports array)
  const statuses = searchParams.getAll('status')
  if (statuses.length > 0) {
    const validStatuses = statuses.filter((s) => VALID_STATUSES.includes(s as any))
    if (validStatuses.length > 0) {
      params.status = validStatuses as any
    }
  }

  // Expiry date range
  const expiryFrom = searchParams.get('expiry_date_from')
  if (expiryFrom) {
    params.expiry_date_from = expiryFrom
  }
  const expiryTo = searchParams.get('expiry_date_to')
  if (expiryTo) {
    params.expiry_date_to = expiryTo
  }

  // Note: employee and position will be added after validation
  return params
}

function buildExportParamsFromApiParams(
  apiParams: NonNullable<GetEmployeeCertificatesParams>
): GetEmployeeCertificatesExportParams {
  const exportParams: GetEmployeeCertificatesExportParams = {}

  if (apiParams.block !== undefined) {
    exportParams.block = apiParams.block
  }

  if (apiParams.branch !== undefined) {
    exportParams.branch = apiParams.branch
  }

  if (apiParams.certificate_name !== undefined) {
    exportParams.certificate_name = apiParams.certificate_name
  }

  if (apiParams.certificate_name__icontains !== undefined) {
    exportParams.certificate_name__icontains = apiParams.certificate_name__icontains
  }

  if (apiParams.certificate_types !== undefined) {
    exportParams.certificate_types = apiParams.certificate_types
  }

  if (apiParams.department !== undefined) {
    exportParams.department = apiParams.department
  }

  if (apiParams.effective_date__gte !== undefined) {
    exportParams.effective_date__gte = apiParams.effective_date__gte
  }

  if (apiParams.effective_date__lte !== undefined) {
    exportParams.effective_date__lte = apiParams.effective_date__lte
  }

  if (apiParams.effective_date_from !== undefined) {
    exportParams.effective_date_from = apiParams.effective_date_from
  }

  if (apiParams.effective_date_to !== undefined) {
    exportParams.effective_date_to = apiParams.effective_date_to
  }

  if (apiParams.employee !== undefined) {
    exportParams.employee = apiParams.employee
  }

  if (apiParams.expiry_date__gte !== undefined) {
    exportParams.expiry_date__gte = apiParams.expiry_date__gte
  }

  if (apiParams.expiry_date__lte !== undefined) {
    exportParams.expiry_date__lte = apiParams.expiry_date__lte
  }

  if (apiParams.expiry_date_from !== undefined) {
    exportParams.expiry_date_from = apiParams.expiry_date_from
  }

  if (apiParams.expiry_date_to !== undefined) {
    exportParams.expiry_date_to = apiParams.expiry_date_to
  }

  if (apiParams.issue_date__gte !== undefined) {
    exportParams.issue_date__gte = apiParams.issue_date__gte
  }

  if (apiParams.issue_date__lte !== undefined) {
    exportParams.issue_date__lte = apiParams.issue_date__lte
  }

  if (apiParams.issue_date_from !== undefined) {
    exportParams.issue_date_from = apiParams.issue_date_from
  }

  if (apiParams.issue_date_to !== undefined) {
    exportParams.issue_date_to = apiParams.issue_date_to
  }

  if (apiParams.issuing_organization !== undefined) {
    exportParams.issuing_organization = apiParams.issuing_organization
  }

  if (apiParams.issuing_organization__icontains !== undefined) {
    exportParams.issuing_organization__icontains = apiParams.issuing_organization__icontains
  }

  if (apiParams.ordering !== undefined) {
    exportParams.ordering = apiParams.ordering
  }

  if (apiParams.position !== undefined) {
    exportParams.position = apiParams.position
  }

  if (apiParams.search !== undefined) {
    exportParams.search = apiParams.search
  }

  if (apiParams.status !== undefined) {
    exportParams.status = apiParams.status
  }

  return exportParams
}

export default function EmployeeCertificatePage() {
  const navigate = useNavigate()
  const ability = useAbility()

  const formRef = useRef<EmployeeCertificateFilterFormRef>(null)

  const [searchParams, setSearchParams] = useSearchParams()

  // Track if URL has been initialized
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Local search input state
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useEmployeeCertificateDelete()
  const { openExportDialog } = useEmployeeCertificateExport()
  const { openImportDialog } = useEmployeeCertificateImport()

  // ===== Parse IDs from URL for validation =====
  const rawBranchId = parsePositiveInt(searchParams.get('branch_id'))
  const rawBlockId = parsePositiveInt(searchParams.get('block_id'))
  const rawDepartmentId = parsePositiveInt(searchParams.get('department_id'))
  const rawPositionId = parsePositiveInt(searchParams.get('position'))
  const rawEmployeeId = parsePositiveInt(searchParams.get('employee'))

  // ===== Validate cascade IDs (branch → block → department) via dropdown API =====
  const branchQuery = useBranchForFilter(rawBranchId ?? 0)
  const isBranchValid = !!branchQuery.data

  // Block validation - only validate if branch is valid (BlockDropdown.branch is number)
  const blockQuery = useBlockForFilter(rawBlockId ?? 0, rawBranchId)
  const isBlockValid = isBranchValid && !!blockQuery.data && blockQuery.data.branch === rawBranchId

  // Department validation - API filter (branch, block) implies validity when we get a result
  const departmentQuery = useDepartmentForFilter(rawDepartmentId ?? 0, rawBranchId, rawBlockId)
  const isDepartmentValid = isBlockValid && !!departmentQuery.data

  // Position validation - independent of cascade
  const positionQuery = usePositionForFilter(rawPositionId ?? 0)
  const isPositionValid = !!positionQuery.data

  // Employee validation - independent of cascade (API filters by employee ID directly)
  const employeeQuery = useEmployeeForFilter(rawEmployeeId ?? 0)
  const isEmployeeValid = !!employeeQuery.data

  // Build validated filter params
  const validatedFilterParams = useMemo(() => {
    return {
      branchId: isBranchValid ? rawBranchId : undefined,
      blockId: isBlockValid ? rawBlockId : undefined,
      departmentId: isDepartmentValid ? rawDepartmentId : undefined,
      positionId: isPositionValid ? rawPositionId : undefined,
      employeeId: isEmployeeValid ? rawEmployeeId : undefined,
    }
  }, [
    isBranchValid,
    rawBranchId,
    isBlockValid,
    rawBlockId,
    isDepartmentValid,
    rawDepartmentId,
    isPositionValid,
    rawPositionId,
    isEmployeeValid,
    rawEmployeeId,
  ])

  // Check if validation is still loading
  const isFilterValidationLoading = useMemo(() => {
    const isBranchLoading = !!rawBranchId && branchQuery.isLoading
    const isBlockLoading = !!rawBlockId && isBranchValid && blockQuery.isLoading
    const isDepartmentLoading = !!rawDepartmentId && isBlockValid && departmentQuery.isLoading
    const isPositionLoading = !!rawPositionId && positionQuery.isLoading
    const isEmployeeLoading = !!rawEmployeeId && employeeQuery.isLoading

    return (
      isBranchLoading ||
      isBlockLoading ||
      isDepartmentLoading ||
      isPositionLoading ||
      isEmployeeLoading
    )
  }, [
    rawBranchId,
    branchQuery.isLoading,
    rawBlockId,
    isBranchValid,
    blockQuery.isLoading,
    rawDepartmentId,
    isBlockValid,
    departmentQuery.isLoading,
    rawPositionId,
    positionQuery.isLoading,
    rawEmployeeId,
    employeeQuery.isLoading,
  ])

  // Initialize URL with defaults if empty
  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    const referrer = document.referrer
    const isNavigateBack = referrer && referrer.includes(window.location.origin)

    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    if (isUrlEmpty && !isNavigateBack) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else {
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
  }, [])

  // Sync search input when URL changes
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
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady])

  const isQueryReady = isUrlReady && !isFilterValidationLoading

  // Build API params with validated IDs (similar to EmployeeManagementPage pattern)
  const apiParams = useMemo(() => {
    if (!isQueryReady) return undefined

    const baseParams = buildBaseApiParamsFromUrl(searchParams)

    // Add validated cascade IDs to API params
    if (validatedFilterParams.branchId) {
      baseParams.branch = validatedFilterParams.branchId
    }
    if (validatedFilterParams.blockId) {
      baseParams.block = validatedFilterParams.blockId
    }
    if (validatedFilterParams.departmentId) {
      baseParams.department = validatedFilterParams.departmentId
    }
    if (validatedFilterParams.positionId) {
      baseParams.position = validatedFilterParams.positionId
    }
    if (validatedFilterParams.employeeId) {
      baseParams.employee = validatedFilterParams.employeeId
    }

    return baseParams
  }, [searchParams, isQueryReady, validatedFilterParams])

  // Call API with params derived from URL
  const {
    data: certificatesData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useEmployeeCertificates(apiParams, {
    enabled: isQueryReady && !!apiParams,
  })

  // Parse current filter params from URL for dialog
  const currentFilterParams = useMemo(() => {
    const parsed = parseFilterParamsFromUrl(searchParams)
    // Merge validated IDs
    return {
      ...parsed,
      branchId: validatedFilterParams.branchId,
      blockId: validatedFilterParams.blockId,
      departmentId: validatedFilterParams.departmentId,
      positionId: validatedFilterParams.positionId,
      employeeId: validatedFilterParams.employeeId,
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
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Handle filter dialog
  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  // Handle apply filter
  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    const newParams = new URLSearchParams()

    // Keep non-filter params
    newParams.set('page', '1')
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
    if (formData.certificate_types) {
      newParams.set('certificate_types', formData.certificate_types)
    }

    // Organization cascade - only for UI badge counting (API uses employee directly)
    if (formData.branch_id) {
      newParams.set('branch_id', String(formData.branch_id))
    }
    if (formData.block_id) {
      newParams.set('block_id', String(formData.block_id))
    }
    if (formData.department_id) {
      newParams.set('department_id', String(formData.department_id))
    }

    if (formData.position) {
      newParams.set('position', String(formData.position))
    }

    if (formData.employee) {
      newParams.set('employee', String(formData.employee))
    }

    if (formData.expiry_date_from) {
      newParams.set('expiry_date_from', formData.expiry_date_from)
    }
    if (formData.expiry_date_to) {
      newParams.set('expiry_date_to', formData.expiry_date_to)
    }

    if (formData.status) {
      const statuses = Array.isArray(formData.status) ? formData.status : [formData.status]
      statuses.forEach((s: string) => newParams.append('status', s))
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams, pageSize])

  // Handle clear all
  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.EMPLOYEE_CERTIFICATE_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleDeleteEmployeeCertificate = useCallback(
    (certificate: EmployeeCertificate) => {
      openDeleteDialog(certificate)
    },
    [openDeleteDialog]
  )

  const handleExport = useCallback(() => {
    if (!apiParams) {
      return
    }

    const exportParams = buildExportParamsFromApiParams(apiParams)
    void openExportDialog(exportParams)
  }, [apiParams, openExportDialog])

  const handleImport = useCallback(() => {
    void openImportDialog()
  }, [openImportDialog])

  // Calculate active filter count from validated params
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.certificateTypes && currentFilterParams.certificateTypes.length > 0)
      count++
    if (currentFilterParams.branchId) count++
    if (currentFilterParams.blockId) count++
    if (currentFilterParams.departmentId) count++
    if (currentFilterParams.positionId) count++
    if (currentFilterParams.employeeId) count++
    if (currentFilterParams.expiryDateRange?.from || currentFilterParams.expiryDateRange?.to)
      count++
    if (currentFilterParams.statuses && currentFilterParams.statuses.length > 0) count++
    return count
  }, [currentFilterParams])

  // Transform data for table
  const { tableData, pageCount } = useMemo(() => {
    const results = certificatesData?.results ?? []
    const count = certificatesData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
    }
  }, [certificatesData, pageSize])

  const isTableLoading = isLoading || isFetching || isRefetching || isFilterValidationLoading

  // Convert currentFilterParams to form initialValues
  const formInitialValues = useMemo(() => {
    return {
      certificate_type: currentFilterParams.certificateTypes || [],
      branch_id: currentFilterParams.branchId,
      block_id: currentFilterParams.blockId,
      department_id: currentFilterParams.departmentId,
      position: currentFilterParams.positionId,
      employee: currentFilterParams.employeeId,
      expiry_date_range: currentFilterParams.expiryDateRange || null,
      status: currentFilterParams.statuses || [],
    }
  }, [currentFilterParams])

  return (
    <>
      <PageTitle
        searchPlaceholder="Tìm kiếm theo mã chứng chỉ, tên nhân viên"
        searchClassName="!w-[356px]"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={
          ability.can('export', 'employee_certificate') ? handleExport : undefined
        }
        handleImportBtnFull={
          ability.can('start_import', 'employee_certificate') ? handleImport : undefined
        }
        handleCreateNew={
          ability.can('create', 'employee_certificate') ? handleCreateNew : undefined
        }
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <EmployeeCertificateTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onDeleteEmployeeCertificate={handleDeleteEmployeeCertificate}
          onClearFilter={handleClearAll}
          hasFilter={!!searchInput || activeFilterCount > 0}
        />
      </Flex>

      {/* Filter Dialog */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={<EmployeeCertificateFilterForm ref={formRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}
