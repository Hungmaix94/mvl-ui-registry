import { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import PermissionManagementTable from '@/features/permissions/permission-management/PermissionManagementTable.tsx'
import PermissionManagementFilterForm, {
  type PermissionManagementFilterFormRef,
} from '@/features/permissions/permission-management/PermissionManagementFilterForm.tsx'
import { useDebounceValue } from 'usehooks-ts'
import type { GetPermissionsParams } from '@/services/permission-service.ts'
import { usePermissions } from '@/services/permission-service.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'

type FilterParams = {
  code?: string
  description?: string
  module?: string | null
  submodule?: string | null
}

/**
 * Parse filter params from URL search params (for form display only, no validation)
 */
function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  const params: FilterParams = {}

  const code = searchParams.get('code')
  if (code) {
    params.code = code
  }

  const description = searchParams.get('description')
  if (description) {
    params.description = description
  }

  const module = searchParams.get('module')
  if (module) {
    params.module = module
  }

  const submodule = searchParams.get('submodule')
  if (submodule) {
    params.submodule = submodule
  }

  return params
}

/**
 * Build API params from URL search params
 */
function buildApiParamsFromUrl(searchParams: URLSearchParams): GetPermissionsParams {
  const params: GetPermissionsParams = {}

  // Pagination - validate page is positive and reasonable (max 10000 to avoid invalid API calls)
  const pageFromUrl = parsePositiveInt(searchParams.get('page'))
  const MAX_REASONABLE_PAGE = 10000
  const page = pageFromUrl && pageFromUrl <= MAX_REASONABLE_PAGE ? pageFromUrl : undefined
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

  // Filter params
  const code = searchParams.get('code')
  if (code) {
    params.code = code
  }

  const description = searchParams.get('description')
  if (description) {
    params.description = description
  }

  const module = searchParams.get('module')
  if (module) {
    params.module = module
  }

  const submodule = searchParams.get('submodule')
  if (submodule) {
    params.submodule = submodule
  }

  return params
}

const PermissionManagementPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<PermissionManagementFilterFormRef>(null)

  // Track if URL has been initialized with defaults
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Filter dialog state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Local search input state (for controlled input)
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  // Initialize URL with defaults if empty (only on direct access, not navigate back)
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
    } else if (isUrlEmpty && isNavigateBack) {
      // URL is empty but this is navigate back - don't apply defaults, just mark as ready
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Sync search input when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Call API with params derived from URL
  const {
    data: permissionsData,
    isLoading,
    error,
  } = usePermissions(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

  // Get pagination info from URL (for UI display - use sanitized values)
  const pageFromUrl = parsePositiveInt(searchParams.get('page'))
  const MAX_REASONABLE_PAGE = 10000
  const currentPage = pageFromUrl && pageFromUrl <= MAX_REASONABLE_PAGE ? pageFromUrl : 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Table data
  const { permissions, totalRecords, pageCount } = useMemo(() => {
    const totalCount = permissionsData?.count ?? 0
    return {
      permissions: permissionsData?.results || [],
      totalRecords: totalCount,
      pageCount: totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0,
    }
  }, [permissionsData?.results, permissionsData?.count, pageSize])

  // Parse current filter params from URL for dialog
  const currentFilterParams = useMemo(() => {
    return parseFilterParamsFromUrl(searchParams)
  }, [searchParams])

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
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
    const formData = formRef.current?.getFormData()
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
    if (formData.code) {
      newParams.set('code', formData.code)
    }
    if (formData.description) {
      newParams.set('description', formData.description)
    }
    if (formData.module) {
      newParams.set('module', formData.module)
    }
    if (formData.submodule) {
      newParams.set('submodule', formData.submodule)
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams, pageSize])

  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

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
        newParams.set('ordering', direction === 'desc' ? `-${field}` : field)
      }
      // Reset to page 1 when sorting changes
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Calculate active filter count from URL
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.code) count++
    if (currentFilterParams.description) count++
    if (currentFilterParams.module) count++
    if (currentFilterParams.submodule) count++
    return count
  }, [currentFilterParams])

  const hasFilter = !!searchInput || activeFilterCount > 0

  return (
    <>
      <PageTitle
        searchPlaceholder="Tìm theo tên quyền"
        searchClassName={'!w-[350px]'}
        handleSearch={handleSearch}
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
      />

      <Flex flexGrow={'1'} direction="column" gap="4">
        <PermissionManagementTable
          data={permissions}
          isLoading={isLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onClearAll={handleClearAll}
          hasFilter={hasFilter}
        />
      </Flex>

      {/* Filter Dialog using AppDialog with variant='filter' */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <PermissionManagementFilterForm ref={formRef} initialValues={currentFilterParams} />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default PermissionManagementPage
