import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import ContractTable from '@/features/contract/manage/view/ContractTable.tsx'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import {
  useContractExport,
  useContracts,
  type GetContractsExportParams,
} from '@/features/contract/services/contract-service'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
  useEmployeeForFilter,
} from '@/hooks/useFilterEntityValidation'
import { useContractType } from '@/features/contract/services/contract-type-service'
import useContractImport from '@/features/contract/manage/_shares/hooks/useContractImport.tsx'
import { useContractDelete } from '@/features/contract/manage/_shares/hooks/useContractDelete.tsx'
import type { components } from '@/api/schema.ts'
import { useDebounceValue } from 'usehooks-ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import {
  DEFAULT_CONTRACT_ORDERING,
  VALID_EMPLOYEE_TYPE_VALUES,
  buildApiParamsFromUrl,
  parseFilterParamsFromUrl,
} from '@/features/contract/manage/_shares/utils/contract-filter-params.ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import ContractFilterForm, {
  type ContractFilterFormRef,
} from '@/features/contract/manage/_shares/components/ContractFilterForm.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { EmployeeType } from '@/constants/api-schema-aliases'

export default function ContractManagePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<ContractFilterFormRef>(null)
  const ability = useAbility()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Table column config state
  const [shouldShowConfig, setShouldShowConfig] = useState<boolean>(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useContractDelete()
  const { openExportDialog } = useContractExport()
  const { openImportDialog } = useContractImport()

  // Get status options for validation
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS],
  })

  const statusOptions = useMemo(() => {
    return keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS)
      ? keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS) || []
      : []
  }, [keysMapOptions])

  const validStatusValues = useMemo(() => {
    return new Set(statusOptions.map((opt: { value: string }) => String(opt.value)))
  }, [statusOptions])

  // ===== Validate async select IDs from URL =====
  const contractTypeIdFromUrl = parsePositiveInt(searchParams.get('contract_type'))
  const branchIdFromUrl = parsePositiveInt(searchParams.get('branch'))
  const blockIdFromUrl = parsePositiveInt(searchParams.get('block'))
  const departmentIdFromUrl = parsePositiveInt(searchParams.get('department'))
  const employeeIdFromUrl = parsePositiveInt(searchParams.get('employee'))
  const employeeTypeFromUrl = searchParams.get('employee_type')

  // Validate contract_type (independent)
  const contractTypeQuery = useContractType(contractTypeIdFromUrl ?? 0)
  const isContractTypeValid = !!contractTypeQuery.data

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

  const employeeQuery = useEmployeeForFilter(employeeIdFromUrl ?? 0)
  const isEmployeeValid = !!employeeQuery.data

  // Validate status (filter by valid enum values)
  const statusesFromUrl = searchParams.getAll('status')
  const validatedStatuses = useMemo(() => {
    return statusesFromUrl.filter((status) => validStatusValues.has(status))
  }, [statusesFromUrl, validStatusValues])

  const validatedFilterParams = useMemo(() => {
    return {
      contract_type_id: isContractTypeValid ? contractTypeIdFromUrl : undefined,
      branch_id: isBranchValid ? branchIdFromUrl : undefined,
      block_id: isBlockValid ? blockIdFromUrl : undefined,
      department_id: isDepartmentValid ? departmentIdFromUrl : undefined,
      employee_id: isEmployeeValid ? employeeIdFromUrl : undefined,
      employee_type:
        employeeTypeFromUrl && VALID_EMPLOYEE_TYPE_VALUES.includes(employeeTypeFromUrl)
          ? employeeTypeFromUrl
          : undefined,
      status: validatedStatuses.length > 0 ? validatedStatuses : undefined,
    }
  }, [
    isContractTypeValid,
    contractTypeIdFromUrl,
    isBranchValid,
    branchIdFromUrl,
    isBlockValid,
    blockIdFromUrl,
    isDepartmentValid,
    departmentIdFromUrl,
    isEmployeeValid,
    employeeIdFromUrl,
    employeeTypeFromUrl,
    validatedStatuses,
  ])

  const isFilterValidationLoading = useMemo(() => {
    const isContractTypeLoading = !!contractTypeIdFromUrl && contractTypeQuery.isLoading
    const isBranchLoading = !!branchIdFromUrl && branchQuery.isLoading
    const isBlockLoading = !!blockIdFromUrl && blockQuery.isLoading
    const isDepartmentLoading = !!departmentIdFromUrl && departmentQuery.isLoading
    const isEmployeeLoading = !!employeeIdFromUrl && employeeQuery.isLoading
    return (
      isContractTypeLoading ||
      isBranchLoading ||
      isBlockLoading ||
      isDepartmentLoading ||
      isEmployeeLoading
    )
  }, [
    contractTypeIdFromUrl,
    contractTypeQuery.isLoading,
    branchIdFromUrl,
    branchQuery.isLoading,
    blockIdFromUrl,
    blockQuery.isLoading,
    departmentIdFromUrl,
    departmentQuery.isLoading,
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

      // Set defaults: pagination + default ordering (no filters)
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      newParams.set('ordering', DEFAULT_CONTRACT_ORDERING)

      setSearchParams(newParams, { replace: true })
    } else if (isUrlEmpty && isNavigateBack) {
      // URL is empty but this is navigate back - still need pagination + ordering for API to work
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      newParams.set('ordering', DEFAULT_CONTRACT_ORDERING)

      setSearchParams(newParams, { replace: true })
    } else {
      // URL has some params - ensure page, page_size and ordering exist (don't force filters)
      const hasOrdering = searchParams.has('ordering') || actualUrlParams.has('ordering')
      const needsUpdate = !hasPage || !hasPageSize || !hasOrdering
      if (needsUpdate) {
        const newParams = new URLSearchParams(searchParams)
        if (!hasPage) {
          newParams.set('page', '1')
        }
        if (!hasPageSize) {
          newParams.set('page_size', String(PAGE_SIZE))
        }
        if (!hasOrdering) {
          newParams.set('ordering', DEFAULT_CONTRACT_ORDERING)
        }

        setSearchParams(newParams, { replace: true })
      }
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
  }, [debouncedSearch, isUrlReady])

  const isContractsQueryReady = isUrlReady && !isFilterValidationLoading

  // Build API params from URL (with validated IDs)
  const apiParams = useMemo(() => {
    if (!isContractsQueryReady) return undefined

    const baseParams = buildApiParamsFromUrl(searchParams)

    // Only add validated IDs to API params
    if (validatedFilterParams.contract_type_id) {
      baseParams.contract_type = validatedFilterParams.contract_type_id
    }
    if (validatedFilterParams.branch_id) {
      baseParams.branch = validatedFilterParams.branch_id
    }
    if (validatedFilterParams.block_id) {
      baseParams.block = validatedFilterParams.block_id
    }
    if (validatedFilterParams.department_id) {
      baseParams.department = validatedFilterParams.department_id
    }
    if (validatedFilterParams.employee_id) {
      baseParams.employee = validatedFilterParams.employee_id
    }
    if (validatedFilterParams.employee_type) {
      baseParams.employee_type = validatedFilterParams.employee_type as EmployeeType
    }
    if (validatedFilterParams.status && validatedFilterParams.status.length > 0) {
      baseParams.status = validatedFilterParams.status as any
    }

    return baseParams
  }, [searchParams, isContractsQueryReady, validatedFilterParams])

  // Call API with params derived from URL
  const {
    data: contractsData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useContracts(apiParams, isContractsQueryReady && !!apiParams)

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

  // Current ordering from URL (defaults to expiration_date asc) for header sort indicators
  const currentOrdering = searchParams.get('ordering') || DEFAULT_CONTRACT_ORDERING

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
        // Clearing a column sort returns to the default ordering (kept in the URL)
        newParams.set('ordering', DEFAULT_CONTRACT_ORDERING)
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

  // Handle config table column (opens the column-config panel inside the table)
  const handleConfigTableColumn = useCallback(() => {
    setShouldShowConfig(true)
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

    const search = searchParams.get('search')
    if (search) {
      newParams.set('search', search)
    }

    newParams.set('ordering', searchParams.get('ordering') || DEFAULT_CONTRACT_ORDERING)

    // Add filter params from form
    if (formData.effective_date_range?.from) {
      newParams.set('effective_date_from', formatDateToApi(formData.effective_date_range.from))
    }
    if (formData.effective_date_range?.to) {
      newParams.set('effective_date_to', formatDateToApi(formData.effective_date_range.to))
    }

    if (formData.expiration_date_range?.from) {
      newParams.set('expiration_date_from', formatDateToApi(formData.expiration_date_range.from))
    }
    if (formData.expiration_date_range?.to) {
      newParams.set('expiration_date_to', formatDateToApi(formData.expiration_date_range.to))
    }

    if (formData.contract_type_id) {
      newParams.set('contract_type', String(formData.contract_type_id))
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

    if (formData.employee_id) {
      newParams.set('employee', String(formData.employee_id))
    }

    if (formData.employee_type) {
      newParams.set('employee_type', String(formData.employee_type))
    }

    // Handle status (array)
    if (formData.status && formData.status.length > 0) {
      // Remove existing status params
      newParams.delete('status')
      // Add each status as separate param
      formData.status.forEach((status) => {
        newParams.append('status', status)
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
    newParams.set('ordering', DEFAULT_CONTRACT_ORDERING)
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.CONTRACT_MANAGE_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleDeleteContract = useCallback(
    (contract: components['schemas']['ContractList']) => {
      openDeleteDialog(contract)
    },
    [openDeleteDialog]
  )

  const handleExport = useCallback(() => {
    const exportParams: GetContractsExportParams = {}

    if (apiParams) {
      if (apiParams.block !== undefined) exportParams.block = apiParams.block
      if (apiParams.branch !== undefined) exportParams.branch = apiParams.branch
      if (apiParams.code) exportParams.code = apiParams.code
      if (apiParams.contract_number) exportParams.contract_number = apiParams.contract_number
      if (apiParams.contract_type !== undefined)
        exportParams.contract_type = apiParams.contract_type
      if (apiParams.department !== undefined) exportParams.department = apiParams.department
      if (apiParams.effective_date_from) {
        exportParams.effective_date_from = apiParams.effective_date_from
      }
      if (apiParams.effective_date_to) {
        exportParams.effective_date_to = apiParams.effective_date_to
      }
      if (apiParams.employee !== undefined) exportParams.employee = apiParams.employee
      if (apiParams.employee_type !== undefined)
        exportParams.employee_type = apiParams.employee_type
      if (apiParams.expiration_date_from) {
        exportParams.expiration_date_from = apiParams.expiration_date_from
      }
      if (apiParams.expiration_date_to) {
        exportParams.expiration_date_to = apiParams.expiration_date_to
      }
      if (apiParams.ordering) exportParams.ordering = apiParams.ordering
      if (apiParams.search) exportParams.search = apiParams.search
      if (apiParams.sign_date_from) exportParams.sign_date_from = apiParams.sign_date_from
      if (apiParams.sign_date_to) exportParams.sign_date_to = apiParams.sign_date_to
      if (Array.isArray(apiParams.status) && apiParams.status.length > 0) {
        exportParams.status = apiParams.status
      }
    }

    if (debouncedSearch) {
      exportParams.search = debouncedSearch
    }

    openExportDialog(exportParams)
  }, [openExportDialog, apiParams, debouncedSearch])

  const handleImport = useCallback(() => {
    openImportDialog()
  }, [openImportDialog])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (
      currentFilterParams.effective_date_range?.from ||
      currentFilterParams.effective_date_range?.to
    )
      count++
    if (
      currentFilterParams.expiration_date_range?.from ||
      currentFilterParams.expiration_date_range?.to
    )
      count++
    if (currentFilterParams.contract_type_id) count++
    if (currentFilterParams.branch_id) count++
    if (currentFilterParams.block_id) count++
    if (currentFilterParams.department_id) count++
    if (currentFilterParams.employee_id) count++
    if (currentFilterParams.employee_type) count++
    if (currentFilterParams.status && currentFilterParams.status.length > 0) count++
    return count
  }, [currentFilterParams])

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = contractsData?.results ?? []
    const count = contractsData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [contractsData, pageSize])

  const isTableLoading = isLoading || isFetching || isRefetching

  // Convert currentFilterParams to form initialValues format
  const formInitialValues = useMemo(() => {
    return {
      effective_date_range: currentFilterParams.effective_date_range || null,
      expiration_date_range: currentFilterParams.expiration_date_range || null,
      contract_type_id: currentFilterParams.contract_type_id,
      branch_id: currentFilterParams.branch_id,
      block_id: currentFilterParams.block_id,
      department_id: currentFilterParams.department_id,
      employee_id: currentFilterParams.employee_id,
      employee_type: currentFilterParams.employee_type,
      status: currentFilterParams.status || [],
    }
  }, [currentFilterParams])

  // Reset the column-config trigger shortly after opening so it can be re-triggered
  useEffect(() => {
    if (shouldShowConfig) {
      const timer = setTimeout(() => {
        setShouldShowConfig(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldShowConfig])

  return (
    <>
      <PageTitle
        title="Quản lý hợp đồng"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm thông tin hợp đồng, nhân viên"
        searchClassName={'!w-[356px]'}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleConfigTableColumn={handleConfigTableColumn}
        handleExportBtnFull={ability.can('export', 'contract') ? handleExport : undefined}
        handleImportBtnFull={ability.can('start_import', 'contract') ? handleImport : undefined}
        handleCreateNew={ability.can('create', 'contract') ? handleCreateNew : undefined}
        titleCreateNew="Tạo mới"
      />
      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <ContractTable
            data={tableData}
            isShowTableColumnConfig={shouldShowConfig}
            isLoading={isTableLoading}
            error={error}
            pageCount={pageCount}
            pageSize={pageSize}
            currentPage={currentPage}
            totalRecords={totalRecords}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            ordering={currentOrdering}
            onDeleteContract={handleDeleteContract}
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
        content={<ContractFilterForm ref={formRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}
