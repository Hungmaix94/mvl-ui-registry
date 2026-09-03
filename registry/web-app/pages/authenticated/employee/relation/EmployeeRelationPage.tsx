import { useCallback, useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import RelationTable from '@/features/employee/relation/view/RelationTable.tsx'
import { useRelationDelete } from '@/features/employee/relation/_shares/hooks/useRelationDelete.tsx'
import { useEmployeeRelationshipExport } from '@/features/employee/relation/_shares/hooks/useEmployeeRelationshipExport.tsx'
import { useEmployeeRelationshipImport } from '@/features/employee/relation/_shares/hooks/useEmployeeRelationshipImport.tsx'
import {
  type GetEmployeeRelationshipsParams,
  type EmployeeRelationship,
  useEmployeeRelationships,
} from '@/features/employee/services/employee-relationship-service'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { useDebounceValue } from 'usehooks-ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'

/**
 * Build API params from URL search params
 */
function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetEmployeeRelationshipsParams> {
  const params: NonNullable<GetEmployeeRelationshipsParams> = {}

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

  return params
}

const EmployeeRelationPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()

  // Track if URL has been initialized
  const [isUrlReady, setIsUrlReady] = useState(false)

  // Local search input state
  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useRelationDelete()
  const { openExportDialog } = useEmployeeRelationshipExport()
  const { openImportDialog } = useEmployeeRelationshipImport()

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

  // Build API params from URL
  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  // Call API with params derived from URL
  const {
    data: relationshipsData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useEmployeeRelationships(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

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

  // Handle clear all
  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleDeleteRelation = useCallback(
    (relation: EmployeeRelationship) => {
      openDeleteDialog(relation)
    },
    [openDeleteDialog]
  )

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.EMPLOYEE_RELATION_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  // Handle export
  const handleExport = useCallback(() => {
    const searchQuery = searchParams.get('search') || ''
    openExportDialog(searchQuery)
  }, [openExportDialog, searchParams])

  // Handle import
  const handleImport = useCallback(() => {
    openImportDialog()
  }, [openImportDialog])

  // Transform data for table
  const { tableData, pageCount } = useMemo(() => {
    const results = relationshipsData?.results ?? []
    const count = relationshipsData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
    }
  }, [relationshipsData, pageSize])

  const isTableLoading = isLoading || isFetching || isRefetching

  return (
    <>
      <PageTitle
        searchPlaceholder="Tìm kiếm"
        searchClassName={'!w-[356px]'}
        handleSearch={setSearchInput}
        searchValue={searchInput}
        handleExportBtnFull={
          ability.can('export', 'employee_relationship') ? handleExport : undefined
        }
        handleImportBtnFull={
          ability.can('start_import', 'employee_relationship') ? handleImport : undefined
        }
        handleCreateNew={
          ability.can('create', 'employee_relationship') ? handleCreateNew : undefined
        }
      />
      <Flex flexGrow={'1'} direction="column" gap="4">
        <RelationTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onDeleteRelation={handleDeleteRelation}
          onClearFilter={handleClearAll}
          hasFilter={!!searchInput}
        />
      </Flex>
    </>
  )
}

export default EmployeeRelationPage
