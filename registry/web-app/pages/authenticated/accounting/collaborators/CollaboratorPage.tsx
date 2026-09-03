import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import { useAbility } from '@/lib/ability.ts'
import { APP_PATH } from '@/routes'
import CollaboratorTable from '@/features/accounting/collaborators/view/CollaboratorTable.tsx'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import CollaboratorFilterForm, {
  type CollaboratorFilterFormRef,
} from '@/features/accounting/collaborators/_shares/components/CollaboratorFilterForm.tsx'
import { useCollaboratorClone } from '@/features/accounting/collaborators/_shares/hooks/useCollaboratorClone.tsx'
import { useCollaboratorDelete } from '@/features/accounting/collaborators/_shares/hooks/useCollaboratorDelete.tsx'
import {
  type GetCollaboratorsParams,
  useCollaborators,
} from '@/features/accounting/collaborators/services/collaborator-service.ts'
import type { CollaboratorFilterValues } from '@/features/accounting/collaborators/types/collaborator-types.ts'

type FilterParams = {
  is_active?: string | null
}

function buildApiParamsFromUrl(searchParams: URLSearchParams): GetCollaboratorsParams {
  const params: GetCollaboratorsParams = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  const search = searchParams.get('search')
  if (search) params.search = search

  const isActive = searchParams.get('is_active')
  if (isActive === 'true') params.is_active = true
  else if (isActive === 'false') params.is_active = false

  const ordering = searchParams.get('ordering')
  if (ordering) params.ordering = ordering

  return params
}

function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  return {
    is_active: searchParams.get('is_active'),
  }
}

export default function CollaboratorPage() {
  const navigate = useNavigate()
  const ability = useAbility()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterFormRef = useRef<CollaboratorFilterFormRef>(null)

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [shouldShowConfig, setShouldShowConfig] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openCloneFlow } = useCollaboratorClone()
  const { openDeleteDialog } = useCollaboratorDelete()

  useEffect(() => {
    const actualUrlParams = new URLSearchParams(window.location.search)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const urlSearch = searchParams.get('search') || ''
    if (urlSearch !== searchInput && urlSearch !== debouncedSearch) {
      setSearchInput(urlSearch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    if (!isUrlReady) return
    const currentSearch = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearch) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch)
      } else {
        newParams.delete('search')
      }
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, isUrlReady])

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  const { data, isLoading, error, isFetching, isRefetching } = useCollaborators(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = data?.results ?? []
    const count = data?.count ?? 0
    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [data, pageSize])

  const currentFilterParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  const filterBadgeCount = useMemo(
    () => (currentFilterParams.is_active ? 1 : 0),
    [currentFilterParams]
  )

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.COLLABORATOR_CREATE)
  }, [navigate])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleClearFilterInDialog = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search')
    if (search) newParams.set('search', search)

    if (formData.is_active) {
      newParams.set('is_active', String(formData.is_active))
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams, pageSize])

  const formInitialValues: Partial<CollaboratorFilterValues> = useMemo(
    () => ({
      is_active:
        currentFilterParams.is_active === 'true' || currentFilterParams.is_active === 'false'
          ? (currentFilterParams.is_active as 'true' | 'false')
          : null,
    }),
    [currentFilterParams]
  )

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = !!searchInput || filterBadgeCount > 0

  const { openExportDialog } = useAccountingListExport(
    '/api/sales/collaborators/export/',
    'cong-tac-vien.xlsx'
  )
  const handleExportBtnFull = useCallback(() => {
    const { page: _page, page_size: _pageSize, ...filters } = apiParams ?? {}
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  // Reset trigger after a short delay to allow dialog to open
  useEffect(() => {
    if (shouldShowConfig) {
      const timer = setTimeout(() => {
        setShouldShowConfig(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldShowConfig])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Cộng tác viên"
        handleSearch={handleSearch}
        searchPlaceholder="Tìm theo tên, SĐT, CMND, MST..."
        searchClassName="!w-[350px]"
        searchValue={searchInput}
        handleFilter={() => setIsFilterDialogOpen(true)}
        filterBadgeCount={filterBadgeCount}
        handleConfigTableColumn={() => setShouldShowConfig(true)}
        handleExportBtnFull={handleExportBtnFull}
        titleExportBtnIcon="Xuất Excel"
        handleCreateNew={ability.can('create', 'collaborator') ? handleCreateNew : undefined}
        titleCreateNew="Thêm CTV"
      />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto pt-4 pb-6">
        <CollaboratorTable
          data={tableData}
          isLoading={isTableLoading}
          error={error as Error | null}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onClone={openCloneFlow}
          onDelete={openDeleteDialog}
          onClearFilter={handleClearAll}
          hasFilter={hasFilter}
          isShowTableColumnConfig={shouldShowConfig}
        />
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={<CollaboratorFilterForm ref={filterFormRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </div>
  )
}
