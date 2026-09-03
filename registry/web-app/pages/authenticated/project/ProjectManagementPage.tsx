import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import ProjectFilterForm, {
  type ProjectFilterFormData,
} from '@/features/project/_shares/components/ProjectFilterForm.tsx'
import { useProjectDelete } from '@/features/project/_shares/hooks/useProjectDelete.tsx'
import ProjectTable from '@/features/project/list/ProjectTable.tsx'
import { APP_PATH } from '@/routes'
import type { Project } from '@/services/realestate-service.ts'
import {
  type GetProjectsParams,
  useProjectExport,
  useProjects,
} from '@/services/realestate-service.ts'
import { useDebounceValue } from 'usehooks-ts'
import { useAbility } from '@/lib/ability.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'

function parseProjectFilterParamsFromUrl(searchParams: URLSearchParams): ProjectFilterFormData {
  const params: ProjectFilterFormData = {}
  const investor = parsePositiveInt(searchParams.get('investor'))
  if (investor) params.investor = investor
  const projectType = searchParams.get('project_type')
  if (projectType) params.project_type = projectType
  const sourceType = searchParams.get('source_type')
  if (sourceType) params.source_type = sourceType
  const isActive = searchParams.get('is_active')
  if (isActive) params.is_active = isActive === 'true'
  const secretary = parsePositiveInt(
    searchParams.get('project_secretary') ||
      searchParams.get('secretary_id') ||
      searchParams.get('secretary')
  )
  if (secretary) params.project_secretary = secretary
  const director = parsePositiveInt(
    searchParams.get('project_director') ||
      searchParams.get('director_id') ||
      searchParams.get('director')
  )
  if (director) params.project_director = director
  return params
}

function serializeProjectFiltersToUrl(
  values: ProjectFilterFormData,
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
  if (values.investor) newParams.set('investor', String(values.investor))
  if (values.project_type) newParams.set('project_type', values.project_type)
  if (values.source_type) newParams.set('source_type', values.source_type)
  if (values.is_active !== undefined) newParams.set('is_active', String(values.is_active))
  if (values.project_secretary) newParams.set('project_secretary', String(values.project_secretary))
  if (values.project_director) newParams.set('project_director', String(values.project_director))
  return newParams
}

/**
 * Build API params from URL search params
 */
function buildApiParamsFromUrl(searchParams: URLSearchParams): NonNullable<GetProjectsParams> {
  const params: NonNullable<GetProjectsParams> = {}

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
  const investor = parsePositiveInt(searchParams.get('investor'))
  if (investor) params.investor = investor
  const projectType = searchParams.get('project_type')
  if (projectType) params.project_type = projectType
  const sourceType = searchParams.get('source_type')
  if (sourceType) params.source_type = sourceType
  // Deep-link from the admin dashboard "Dự án đang mở bán" card (is_active = status ACTIVE).
  const isActive = searchParams.get('is_active')
  if (isActive === 'true' || isActive === 'false') params.is_active = isActive === 'true'

  const secretary = parsePositiveInt(
    searchParams.get('project_secretary') ||
      searchParams.get('secretary_id') ||
      searchParams.get('secretary')
  )
  if (secretary) {
    params.project_secretary = secretary
  }

  const director = parsePositiveInt(
    searchParams.get('project_director') ||
      searchParams.get('director_id') ||
      searchParams.get('director')
  )
  if (director) {
    params.project_director = director
  }

  return params
}

const ProjectManagementPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const ability = useAbility()

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Table column config trigger (opens column config dialog)
  const [shouldShowConfig, setShouldShowConfig] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const formRef = useRef<{ clearForm: () => void; getValues: () => ProjectFilterFormData }>(null)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useProjectDelete()
  const { openExportDialog } = useProjectExport()

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

  // Build API params from URL
  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  // Current filter params from URL (for filter dialog initial values)
  const currentFilterParams = useMemo(
    () => parseProjectFilterParamsFromUrl(searchParams),
    [searchParams]
  )

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.investor) count++
    if (currentFilterParams.project_type) count++
    if (currentFilterParams.source_type) count++
    if (currentFilterParams.is_active) count++
    if (currentFilterParams.project_secretary) count++
    if (currentFilterParams.project_director) count++
    return count
  }, [currentFilterParams])

  // Call API with params derived from URL
  const {
    data: projectsData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useProjects(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

  // Get pagination info from URL
  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Transform data for table
  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = projectsData?.results ?? []
    const count = projectsData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [projectsData, pageSize])

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

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.PROJECT_MANAGEMENT_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleDeleteProject = useCallback(
    (project: Project) => {
      openDeleteDialog(project)
    },
    [openDeleteDialog]
  )

  const handleExport = useCallback(() => {
    openExportDialog(debouncedSearch)
  }, [openExportDialog, debouncedSearch])

  const handleConfigTableColumn = useCallback(() => {
    setShouldShowConfig(true)
  }, [])

  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return
    const newParams = serializeProjectFiltersToUrl(formData, searchParams)
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  // Reset column config trigger after dialog opens
  useEffect(() => {
    if (shouldShowConfig) {
      const timer = setTimeout(() => setShouldShowConfig(false), 100)
      return () => clearTimeout(timer)
    }
  }, [shouldShowConfig])

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = !!searchInput?.trim() || activeFilterCount > 0

  return (
    <>
      <PageTitle
        handleSearch={handleSearch}
        searchPlaceholder="Tìm theo mã dự án, tên dự án"
        searchClassName="!w-[350px]"
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleConfigTableColumn={handleConfigTableColumn}
        handleCreateNew={ability.can('create', 'project') ? handleCreateNew : undefined}
        handleExportBtnFull={ability.can('export', 'project') ? handleExport : undefined}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className="pb-6">
        <ProjectTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onDeleteProject={handleDeleteProject}
          onClearFilter={handleClearAll}
          hasFilter={hasFilter}
          isShowTableColumnConfig={shouldShowConfig}
        />
      </Flex>
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <ProjectFilterForm
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

export default ProjectManagementPage
