import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { useDebounceValue } from 'usehooks-ts'

import { PageTitle } from '@/components/ui'
import RoleTable from '@/features/permissions/permission-role/view/RoleTable.tsx'
import { usePermissionRoleDelete } from '@/features/permissions/permission-role/_shares/hooks/usePermissionRoleDelete.tsx'
import type { Role } from '@/services/role-service.ts'
import { type GetRolesParams, useRoles } from '@/services/role-service.ts'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'

/**
 * Build API params from URL (single source of truth).
 * Query keys align with backend: page, page_size, ordering, search.
 */
function buildApiParamsFromUrl(searchParams: URLSearchParams): NonNullable<GetRolesParams> {
  const params: NonNullable<GetRolesParams> = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  const ordering = searchParams.get('ordering')
  if (ordering) params.ordering = ordering

  const search = searchParams.get('search')
  if (search) params.search = search

  return params
}

const PermissionRoleManagementPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()

  const [isUrlReady, setIsUrlReady] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = usePermissionRoleDelete()

  // Initialize URL with defaults if empty (pattern: ProjectManagementPage)
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
    } else {
      const needsUpdate = !hasPage || !hasPageSize
      if (needsUpdate) {
        const newParams = new URLSearchParams(searchParams)
        if (!hasPage) newParams.set('page', '1')
        if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
        setSearchParams(newParams, { replace: true })
      }
    }

    setIsUrlReady(true)
  }, [])

  // Sync search input when URL changes (back/forward, external navigation)
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

  // Debounced search → URL (reset page to 1)
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
  }, [debouncedSearch, isUrlReady, searchParams, setSearchParams])

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  const {
    data: rolesData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useRoles(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = rolesData?.results ?? []
    const count = rolesData?.count ?? 0
    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [rolesData, pageSize])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

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
    navigate(APP_PATH.PERMISSION_ROLE_MANAGEMENT_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleDeleteRole = useCallback(
    (role: Role) => {
      openDeleteDialog(role)
    },
    [openDeleteDialog]
  )

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = !!searchInput && searchInput.trim() !== ''

  return (
    <>
      <PageTitle
        handleSearch={handleSearch}
        searchPlaceholder="Tìm theo mã vai trò, tên vai trò"
        searchClassName="!w-[350px]"
        searchValue={searchInput}
        handleCreateNew={ability.can('create', 'role') ? handleCreateNew : undefined}
      />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <RoleTable
          data={tableData}
          isLoading={isTableLoading}
          error={error}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onDeleteRole={handleDeleteRole}
          onClearFilter={handleClearAll}
          hasFilter={hasFilter}
        />
      </Flex>
    </>
  )
}

export default PermissionRoleManagementPage
