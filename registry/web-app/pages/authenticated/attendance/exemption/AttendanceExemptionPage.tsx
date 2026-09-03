import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import AttendanceExemptionTable from '@/features/attendance/exemption/view/AttendanceExemptionTable.tsx'
// TODO: Đã tạm thời comment để ẩn tính năng edit/delete, có thể bật lại trong tương lai
// import { useAttendanceExemptionDelete } from '@/features/attendance/exemption/_shares/hooks/useAttendanceExemptionDelete.tsx'
import { useAttendanceExemptionExport } from '@/features/attendance/exemption/_shares/hooks/useAttendanceExemptionExport.tsx'
import useAttendanceExemptionImport from '@/features/attendance/exemption/_shares/hooks/useAttendanceExemptionImport.tsx'
import { useAttendanceExemptionCreate } from '@/features/attendance/exemption/_shares/hooks/useAttendanceExemptionCreate.tsx'
// TODO: Đã tạm thời comment để ẩn tính năng edit/delete, có thể bật lại trong tương lai
// import { useAttendanceExemptionEdit } from '@/features/attendance/exemption/_shares/hooks/useAttendanceExemptionEdit.tsx'
import { useAttendanceExemptionDisable } from '@/features/attendance/exemption/_shares/hooks/useAttendanceExemptionDisable.tsx'
import {
  type AttendanceExemption,
  type GetAttendanceExemptionsParams,
  useAttendanceExemptions,
} from '@/features/attendance/services/attendance-exemption-service'
import {
  useBranchForFilter,
  useBlockForFilter,
  useDepartmentForFilter,
  usePositionForFilter,
} from '@/hooks/useFilterEntityValidation'
import { useDebounceValue } from 'usehooks-ts'
import { useAbility } from '@/lib/ability.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { parse } from 'date-fns'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import AttendanceExemptionFilterForm, {
  type AttendanceExemptionFilterFormRef,
} from '@/features/attendance/exemption/_shares/components/AttendanceExemptionFilterForm.tsx'

type FilterParams = {
  effectiveDate?: Date | null
  branchId?: number
  blockId?: number
  departmentId?: number
  positionId?: number
}

/**
 * Parse filter params from URL search params (for form display only, no validation)
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  const params: FilterParams = {}

  const effectiveDate = searchParams.get('effective_date')
  if (effectiveDate) {
    try {
      params.effectiveDate = parse(effectiveDate, DATE_SERVER_FORMAT, new Date())
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

  return params
}

/**
 * Build API params from URL search params (without validation - will be validated separately)
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetAttendanceExemptionsParams> {
  const params: NonNullable<GetAttendanceExemptionsParams> = {}

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
  const effectiveDate = searchParams.get('effective_date')
  if (effectiveDate) {
    params.effective_date_from = effectiveDate
    params.effective_date_to = effectiveDate
  }

  // Note: branch, block, department, position will be added after validation

  return params
}

const AttendanceExemptionPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<AttendanceExemptionFilterFormRef>(null)

  const ability = useAbility()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  // TODO: Đã tạm thời comment để ẩn tính năng edit/delete, có thể bật lại trong tương lai
  // const { openDeleteDialog } = useAttendanceExemptionDelete()
  const { openExportDialog } = useAttendanceExemptionExport()
  const { openImportDialog } = useAttendanceExemptionImport()
  const { openCreateDialog } = useAttendanceExemptionCreate()
  // TODO: Đã tạm thời comment để ẩn tính năng edit/delete, có thể bật lại trong tương lai
  // const { openEditDialog } = useAttendanceExemptionEdit()
  const { openDisableDialog } = useAttendanceExemptionDisable()

  // ===== Validate cascade select IDs from URL =====
  const branchIdFromUrl = parsePositiveInt(searchParams.get('branch'))
  const blockIdFromUrl = parsePositiveInt(searchParams.get('block'))
  const departmentIdFromUrl = parsePositiveInt(searchParams.get('department'))
  const positionIdFromUrl = parsePositiveInt(searchParams.get('position'))

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

  const validatedFilterParams = useMemo(() => {
    return {
      branchId: isBranchValid ? branchIdFromUrl : undefined,
      blockId: isBlockValid ? blockIdFromUrl : undefined,
      departmentId: isDepartmentValid ? departmentIdFromUrl : undefined,
      positionId: isPositionValid ? positionIdFromUrl : undefined,
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
  ])

  const isFilterValidationLoading = useMemo(() => {
    const isBranchLoading = !!branchIdFromUrl && branchQuery.isLoading
    const isBlockLoading = !!blockIdFromUrl && blockQuery.isLoading
    const isDepartmentLoading = !!departmentIdFromUrl && departmentQuery.isLoading
    const isPositionLoading = !!positionIdFromUrl && positionQuery.isLoading
    return isBranchLoading || isBlockLoading || isDepartmentLoading || isPositionLoading
  }, [
    branchIdFromUrl,
    branchQuery.isLoading,
    blockIdFromUrl,
    blockQuery.isLoading,
    departmentIdFromUrl,
    departmentQuery.isLoading,
    positionIdFromUrl,
    positionQuery.isLoading,
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

  const isExemptionsQueryReady = isUrlReady && !isFilterValidationLoading

  // Build API params from URL (with validated IDs)
  const apiParams = useMemo(() => {
    if (!isExemptionsQueryReady) return undefined

    const baseParams = buildApiParamsFromUrl(searchParams)

    // Only add validated IDs to API params
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

    return baseParams
  }, [searchParams, isExemptionsQueryReady, validatedFilterParams])

  // Call API with params derived from URL
  const {
    data: exemptionsData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useAttendanceExemptions(apiParams, {
    enabled: isExemptionsQueryReady && !!apiParams,
  })

  // Parse current filter params from URL for dialog (merge validated IDs)
  const currentFilterParams = useMemo(() => {
    const urlParams = parseFilterParamsFromUrl(searchParams)
    return {
      effective_date: urlParams.effectiveDate || null,
      branch_id: validatedFilterParams.branchId,
      block_id: validatedFilterParams.blockId,
      department_id: validatedFilterParams.departmentId,
      position_id: validatedFilterParams.positionId,
    }
  }, [searchParams, validatedFilterParams])

  // Get pagination info from URL
  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = exemptionsData?.results ?? []
    const count = exemptionsData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [exemptionsData, pageSize])

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

    const search = searchParams.get('search')
    if (search) {
      newParams.set('search', search)
    }

    const ordering = searchParams.get('ordering')
    if (ordering) {
      newParams.set('ordering', ordering)
    }

    // Add filter params from form
    if (formData.effective_date) {
      newParams.set('effective_date', formatDateToApi(formData.effective_date))
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

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  // TODO: Đã tạm thời comment để ẩn tính năng edit/delete, có thể bật lại trong tương lai
  // const handleDeleteAttendanceExemption = useCallback(
  //   (exemption: AttendanceExemption) => {
  //     openDeleteDialog(exemption)
  //   },
  //   [openDeleteDialog]
  // )
  // const handleEditAttendanceExemption = useCallback(
  //   (exemption: AttendanceExemption) => {
  //     openEditDialog(exemption)
  //   },
  //   [openEditDialog]
  // )

  const handleDisableAttendanceExemption = useCallback(
    (exemption: AttendanceExemption) => {
      openDisableDialog(exemption)
    },
    [openDisableDialog]
  )

  const handleExport = useCallback(() => {
    openExportDialog(debouncedSearch, apiParams)
  }, [openExportDialog, debouncedSearch, apiParams])

  const handleImport = useCallback(() => {
    openImportDialog()
  }, [openImportDialog])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.effective_date) count++
    if (currentFilterParams.branch_id) count++
    if (currentFilterParams.block_id) count++
    if (currentFilterParams.department_id) count++
    if (currentFilterParams.position_id) count++
    return count
  }, [currentFilterParams])

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = !!searchInput || activeFilterCount > 0

  // Convert currentFilterParams to form initialValues format
  const formInitialValues = useMemo(() => {
    return {
      effective_date: currentFilterParams.effective_date || null,
      branch_id: currentFilterParams.branch_id || undefined,
      block_id: currentFilterParams.block_id || undefined,
      department_id: currentFilterParams.department_id || undefined,
      position_id: currentFilterParams.position_id || undefined,
    }
  }, [currentFilterParams])

  return (
    <>
      <PageTitle
        title="Danh sách miễn chấm công"
        searchPlaceholder="Tìm kiếm theo mã nhân viên, họ tên"
        searchClassName="!w-[350px]"
        handleSearch={handleSearch}
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={handleExport}
        handleImportBtnFull={
          ability.can('import_template', 'attendance_exemption') ? handleImport : undefined
        }
        handleCreateNew={
          ability.can('create', 'attendance_exemption') ? openCreateDialog : undefined
        }
        titleCreateNew={'Thêm nhân viên'}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <AttendanceExemptionTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          // TODO: Đã tạm thời comment để ẩn tính năng edit/delete, có thể bật lại trong tương lai
          // onDeleteAttendanceExemption={handleDeleteAttendanceExemption}
          // onEditAttendanceExemption={handleEditAttendanceExemption}
          onDisableAttendanceExemption={handleDisableAttendanceExemption}
          onClearFilter={handleClearAll}
          hasFilter={hasFilter}
        />
      </Flex>

      {/* Filter Dialog using AppDialog with variant='filter' */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        title="Bộ lọc"
        content={<AttendanceExemptionFilterForm ref={formRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default AttendanceExemptionPage
