import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import DepartmentManagement from '@/features/org/department/view/DepartmentManagement.tsx'
import { useDepartmentDelete } from '@/features/org/department/delete/DeleteDepartmentManagement.tsx'
import { useDepartmentExport } from '@/features/org/department/_shares/hooks/useDepartmentExport.tsx'
import DepartmentFilterForm, {
  type DepartmentFilterFormData,
  type DepartmentFilterFormRef,
} from '@/features/org/department/_shares/components/DepartmentFilterForm.tsx'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import {
  type Department,
  type GetDepartmentsExportParams,
  type GetDepartmentsParams,
  useDepartments,
} from '@/features/org/services/department-service'
import { useBranchForFilter, useBlockForFilter } from '@/hooks/useFilterEntityValidation'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { useDebounceValue } from 'usehooks-ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import { BlockType } from '@/constants/api-schema-aliases'
const VALID_BLOCK_TYPES = Object.values(BlockType)

function parseDepartmentFilterParamsFromUrl(
  searchParams: URLSearchParams
): DepartmentFilterFormData {
  const params: DepartmentFilterFormData = {}
  const branch = parsePositiveInt(searchParams.get('branch'))
  if (branch) params.branch_id = branch
  const block = parsePositiveInt(searchParams.get('block'))
  if (block) params.block_id = block
  const blockType = searchParams.get('block_type')
  if (blockType && VALID_BLOCK_TYPES.includes(blockType as BlockType)) {
    params.block_type = blockType as BlockType
  }
  return params
}

function serializeDepartmentFiltersToUrl(
  values: DepartmentFilterFormData,
  baseParams: URLSearchParams
): URLSearchParams {
  const newParams = new URLSearchParams()
  newParams.set('page', '1')
  const pageSizeFromUrl = parsePositiveInt(baseParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  newParams.set('page_size', String(safePageSize))
  const search = baseParams.get('search')
  if (search) newParams.set('search', search)
  const ordering = baseParams.get('ordering')
  if (ordering) newParams.set('ordering', ordering)
  if (values.branch_id) newParams.set('branch', String(values.branch_id))
  if (values.block_id) newParams.set('block', String(values.block_id))
  if (values.block_type) newParams.set('block_type', values.block_type)
  return newParams
}

/**
 * Build API params from URL search params
 */
function buildApiParamsFromUrl(searchParams: URLSearchParams): NonNullable<GetDepartmentsParams> {
  const params: NonNullable<GetDepartmentsParams> = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  const ordering = searchParams.get('ordering')
  if (ordering) {
    params.ordering = ordering
  }

  const search = searchParams.get('search')
  if (search) {
    params.search = search
  }

  const branch = parsePositiveInt(searchParams.get('branch'))
  if (branch) params.branch = branch
  const block = parsePositiveInt(searchParams.get('block'))
  if (block) params.block = block
  const blockType = searchParams.get('block_type')
  if (blockType && VALID_BLOCK_TYPES.includes(blockType as BlockType)) {
    params.block_type = blockType as BlockType
  }

  return params
}

function buildDepartmentsExportParamsFromListQuery(
  apiParams: NonNullable<GetDepartmentsParams> | undefined
): GetDepartmentsExportParams {
  const exportParams: GetDepartmentsExportParams = {}

  if (apiParams) {
    if (apiParams.branch) exportParams.branch = apiParams.branch
    if (apiParams.block) exportParams.block = apiParams.block
    if (apiParams.block_type) exportParams.block_type = apiParams.block_type
    if (apiParams.search && apiParams.search.trim() !== '') {
      exportParams.search = apiParams.search
    }
  }

  return exportParams
}

const DepartmentPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()
  const formRef = useRef<DepartmentFilterFormRef>(null)

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useDepartmentDelete()
  const { openExportDialog } = useDepartmentExport()

  const branchIdFromUrl = parsePositiveInt(searchParams.get('branch'))
  const blockIdFromUrl = parsePositiveInt(searchParams.get('block'))
  const branchQuery = useBranchForFilter(branchIdFromUrl ?? 0)
  const isBranchValid = !branchIdFromUrl || !!branchQuery.data
  const blockQuery = useBlockForFilter(blockIdFromUrl ?? 0, branchIdFromUrl)
  const isBlockValid =
    isBranchValid &&
    !!blockIdFromUrl &&
    !!blockQuery.data &&
    blockQuery.data.branch === branchIdFromUrl

  // Initialize URL with defaults when empty; ensure page/page_size when URL has other params
  useEffect(() => {
    const actualUrlSearch = window.location.search
    const actualUrlParams = new URLSearchParams(actualUrlSearch)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    if (isUrlEmpty) {
      // URL empty (direct visit or nav link without query) → always set page/page_size
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else if (!hasPage || !hasPageSize) {
      // URL has params but missing page/page_size → add them
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

  const rawFilterParams = useMemo(
    () => parseDepartmentFilterParamsFromUrl(searchParams),
    [searchParams]
  )

  // Validated filter params for form/API (guide 4.1: do not set invalid IDs into Select)
  const currentFilterParams = useMemo(
    () => ({
      ...rawFilterParams,
      branch_id: isBranchValid && branchIdFromUrl ? branchIdFromUrl : undefined,
      block_id: isBlockValid && blockIdFromUrl ? blockIdFromUrl : undefined,
    }),
    [rawFilterParams, isBranchValid, isBlockValid, branchIdFromUrl, blockIdFromUrl]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.branch_id) count++
    if (currentFilterParams.block_id) count++
    if (currentFilterParams.block_type) count++
    return count
  }, [currentFilterParams])

  const isOrgValidationLoading = useMemo(() => {
    const isBranchLoading = !!branchIdFromUrl && branchQuery.isLoading
    const isBlockLoading = !!blockIdFromUrl && isBranchValid && blockQuery.isLoading
    return isBranchLoading || isBlockLoading
  }, [branchIdFromUrl, branchQuery.isLoading, blockIdFromUrl, blockQuery.isLoading, isBranchValid])

  const apiParams = useMemo(() => {
    if (!isUrlReady || isOrgValidationLoading) return undefined
    const params = buildApiParamsFromUrl(searchParams)
    if (params.branch && !isBranchValid) {
      delete params.branch
      delete params.block
    } else if (params.block && !isBlockValid) {
      delete params.block
    }
    return params
  }, [searchParams, isUrlReady, isOrgValidationLoading, isBranchValid, isBlockValid])

  const isDepartmentsQueryReady = isUrlReady && !isOrgValidationLoading && !!apiParams

  // Call API with params derived from URL (gate with enabled per url-driven-filter-dialog guide)
  const {
    data: departmentsData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useDepartments(apiParams ?? {}, isDepartmentsQueryReady)

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

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.DEPARTMENT_CREATE_NEW, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleDeleteDepartment = useCallback(
    (department: Department) => {
      openDeleteDialog(department)
    },
    [openDeleteDialog]
  )

  const handleOpenFilterDialog = useCallback(() => setIsFilterDialogOpen(true), [])
  const handleCloseFilterDialog = useCallback(() => setIsFilterDialogOpen(false), [])
  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])
  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return
    const newParams = serializeDepartmentFiltersToUrl(formData, searchParams)
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  // Handle export
  const handleExport = useCallback(() => {
    openExportDialog(buildDepartmentsExportParamsFromListQuery(apiParams))
  }, [openExportDialog, apiParams])

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = departmentsData?.results ?? []
    const count = departmentsData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [departmentsData, pageSize])

  const isTableLoading = isLoading || isFetching || isRefetching

  return (
    <>
      <PageTitle
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm theo mã phòng ban, tên phòng ban"
        searchClassName="!w-[350px]"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleCreateNew={ability.can('create', 'department') ? handleCreateNew : undefined}
        handleExportBtnFull={ability.can('export', 'department') ? handleExport : undefined}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <DepartmentManagement
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onDeleteDepartment={handleDeleteDepartment}
          onClearFilter={handleClearAll}
          hasFilter={(!!searchInput && searchInput.trim() !== '') || activeFilterCount > 0}
        />
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <DepartmentFilterForm
            ref={formRef}
            initialValues={currentFilterParams}
            isOpen={isFilterDialogOpen}
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default DepartmentPage
