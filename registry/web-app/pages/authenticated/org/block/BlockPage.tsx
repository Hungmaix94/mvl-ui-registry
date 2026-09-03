import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import { useBlockDelete } from '@/features/org/block/_shares/hooks/useBlockDelete.tsx'
import { useBlockExport } from '@/features/org/block/_shares/hooks/useBlockExport.tsx'
import BlockTable from '@/features/org/block/view/BlockTable.tsx'
import BlockFilterForm, {
  type BlockFilterFormData,
  type BlockFilterFormRef,
} from '@/features/org/block/_shares/components/BlockFilterForm.tsx'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import { APP_PATH } from '@/routes'
import {
  type Block,
  type GetBlocksExportParams,
  type GetBlocksParams,
  useBlocks,
} from '@/features/org/services/block-service'
import { useBranchForFilter } from '@/hooks/useFilterEntityValidation'
import { useDebounceValue } from 'usehooks-ts'
import { useAbility } from '@/lib/ability.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import { BlockType } from '@/constants/api-schema-aliases'
const VALID_BLOCK_TYPES = Object.values(BlockType)

function parseBlockFilterParamsFromUrl(searchParams: URLSearchParams): BlockFilterFormData {
  const params: BlockFilterFormData = {}
  const branch = parsePositiveInt(searchParams.get('branch'))
  if (branch) params.branch_id = branch
  const blockType = searchParams.get('block_type')
  if (blockType && VALID_BLOCK_TYPES.includes(blockType as BlockType)) {
    params.block_type = blockType as BlockType
  }
  return params
}

function serializeBlockFiltersToUrl(
  values: BlockFilterFormData,
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
  if (values.block_type) newParams.set('block_type', values.block_type)
  return newParams
}

/**
 * Build API params from URL search params
 */
function buildApiParamsFromUrl(searchParams: URLSearchParams): NonNullable<GetBlocksParams> {
  const params: NonNullable<GetBlocksParams> = {}

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

  // Filters
  const branch = parsePositiveInt(searchParams.get('branch'))
  if (branch) params.branch = branch
  const blockType = searchParams.get('block_type')
  if (blockType && VALID_BLOCK_TYPES.includes(blockType as BlockType)) {
    params.block_type = blockType as BlockType
  }

  return params
}

function buildBlocksExportParamsFromListQuery(
  apiParams: NonNullable<GetBlocksParams> | undefined
): GetBlocksExportParams {
  const exportParams: GetBlocksExportParams = {}

  if (apiParams) {
    if (apiParams.branch) exportParams.branch = apiParams.branch
    if (apiParams.block_type) exportParams.block_type = apiParams.block_type
    if (apiParams.search && apiParams.search.trim() !== '') {
      exportParams.search = apiParams.search
    }
  }

  return exportParams
}

export const BlockPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()
  const formRef = useRef<BlockFilterFormRef>(null)

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useBlockDelete()
  const { openExportDialog } = useBlockExport()

  const branchIdFromUrl = parsePositiveInt(searchParams.get('branch'))
  const branchQuery = useBranchForFilter(branchIdFromUrl ?? 0)
  const isBranchValid = !branchIdFromUrl || !!branchQuery.data

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
  }, [debouncedSearch, isUrlReady])

  const currentFilterParams = useMemo(
    () => parseBlockFilterParamsFromUrl(searchParams),
    [searchParams]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.branch_id) count++
    if (currentFilterParams.block_type) count++
    return count
  }, [currentFilterParams])

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    const params = buildApiParamsFromUrl(searchParams)
    if (params.branch && !isBranchValid) {
      delete params.branch
    }
    return params
  }, [searchParams, isUrlReady, isBranchValid])

  // Call API with params derived from URL
  const {
    data: blocksData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useBlocks(isUrlReady && apiParams ? apiParams : undefined, isUrlReady && !!apiParams)

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
    navigate(APP_PATH.BLOCK_MANAGEMENT_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleDeleteBlock = useCallback(
    (block: Block) => {
      openDeleteDialog(block)
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
    const newParams = serializeBlockFiltersToUrl(formData, searchParams)
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
    openExportDialog(buildBlocksExportParamsFromListQuery(apiParams))
  }, [openExportDialog, apiParams])

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = blocksData?.results ?? []
    const count = blocksData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [blocksData, pageSize])

  const isTableLoading = isLoading || isFetching || isRefetching

  return (
    <>
      <PageTitle
        handleSearch={setSearchInput}
        searchValue={searchInput}
        searchPlaceholder="Tìm theo mã khối, tên khối"
        searchClassName="!w-[350px]"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleCreateNew={ability.can('create', 'block') ? handleCreateNew : undefined}
        handleExportBtnFull={ability.can('export', 'block') ? handleExport : undefined}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <BlockTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onDeleteBlock={handleDeleteBlock}
          onClearFilter={handleClearAll}
          hasFilter={(!!searchInput && searchInput.trim() !== '') || activeFilterCount > 0}
        />
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <BlockFilterForm
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
export default BlockPage
