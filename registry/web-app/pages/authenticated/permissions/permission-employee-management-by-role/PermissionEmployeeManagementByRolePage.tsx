import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import PageTitle from '@/components/ui/page-title/PageTitle.tsx'
import { EmployeeRoleTable } from '@/features/permissions/permission-employee-management-by-role/components'
import { useEmployeeRoleFilter } from '@/features/permissions/permission-employee-management-by-role/hooks/useEmployeeRoleFilter.tsx'
import { useSingleRoleEdit } from '@/features/permissions/permission-employee-management-by-role/hooks/useSingleRoleEdit.tsx'
import type { EmployeeRoleFilters } from '@/features/permissions/permission-employee-management-by-role/types.ts'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { PAGE_SIZE } from '@/constants/table.ts'
import { useDebounceValue } from 'usehooks-ts'

// URL param keys
const URL_PARAMS = {
  PAGE: 'page',
  PAGE_SIZE: 'page_size',
  SEARCH: 'search',
  ORDERING: 'ordering',
  ROLE: 'role',
  BRANCH: 'branch',
  BLOCK: 'block',
  DEPARTMENT: 'department',
  POSITION: 'position',
} as const

// Parse filter params from URL
function parseFilterParamsFromUrl(searchParams: URLSearchParams): EmployeeRoleFilters {
  return {
    role: searchParams.get(URL_PARAMS.ROLE) || undefined,
    branch: searchParams.get(URL_PARAMS.BRANCH) || undefined,
    block: searchParams.get(URL_PARAMS.BLOCK) || undefined,
    department: searchParams.get(URL_PARAMS.DEPARTMENT) || undefined,
    position: searchParams.get(URL_PARAMS.POSITION) || undefined,
  }
}

// Serialize filters to URL params
function serializeFiltersToUrl(
  filters: EmployeeRoleFilters,
  searchParams: URLSearchParams
): URLSearchParams {
  const newParams = new URLSearchParams(searchParams)

  // Reset page when filters change
  newParams.set(URL_PARAMS.PAGE, '1')

  // Set or remove filter params
  const filterKeys: (keyof EmployeeRoleFilters)[] = [
    'role',
    'branch',
    'block',
    'department',
    'position',
  ]
  filterKeys.forEach((key) => {
    const urlKey = URL_PARAMS[key.toUpperCase() as keyof typeof URL_PARAMS]
    if (filters[key]) {
      newParams.set(urlKey, filters[key]!)
    } else {
      newParams.delete(urlKey)
    }
  })

  return newParams
}

export default function PermissionEmployeeManagementByRolePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ability = useAbility()
  const [searchParams, setSearchParams] = useSearchParams()
  const isInitialized = useRef(false)

  // Local search input state for smooth UX
  const [searchInput, setSearchInput] = useState(() => searchParams.get(URL_PARAMS.SEARCH) || '')
  const [debouncedSearch] = useDebounceValue(searchInput, 300)

  // Init defaults when URL is empty (only once on mount)
  useEffect(() => {
    if (isInitialized.current) return

    const actualUrlParams = new URLSearchParams(window.location.search)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''

    if (isUrlEmpty) {
      const defaultParams = new URLSearchParams()
      defaultParams.set(URL_PARAMS.PAGE, '1')
      defaultParams.set(URL_PARAMS.PAGE_SIZE, String(PAGE_SIZE))
      setSearchParams(defaultParams, { replace: true })
    } else {
      // Ensure page and page_size exist
      const newParams = new URLSearchParams(searchParams)
      let needsUpdate = false

      if (!newParams.has(URL_PARAMS.PAGE)) {
        newParams.set(URL_PARAMS.PAGE, '1')
        needsUpdate = true
      }
      if (!newParams.has(URL_PARAMS.PAGE_SIZE)) {
        newParams.set(URL_PARAMS.PAGE_SIZE, String(PAGE_SIZE))
        needsUpdate = true
      }

      if (needsUpdate) {
        setSearchParams(newParams, { replace: true })
      }
    }

    isInitialized.current = true
  }, [])

  // Sync debounced search to URL
  useEffect(() => {
    if (!isInitialized.current) return

    const currentSearch = searchParams.get(URL_PARAMS.SEARCH) || ''
    if (debouncedSearch !== currentSearch) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set(URL_PARAMS.SEARCH, debouncedSearch)
      } else {
        newParams.delete(URL_PARAMS.SEARCH)
      }
      newParams.set(URL_PARAMS.PAGE, '1') // Reset page on search
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch])

  // Parse current filters from URL
  const currentFilters = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  // Handle filter apply - serialize to URL
  const handleFilterApply = useCallback(
    (newFilters: EmployeeRoleFilters) => {
      const newParams = serializeFiltersToUrl(newFilters, searchParams)
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Handle clear all filters
  const handleClearFilter = useCallback(() => {
    const newParams = new URLSearchParams()
    newParams.set(URL_PARAMS.PAGE, '1')
    newParams.set(URL_PARAMS.PAGE_SIZE, searchParams.get(URL_PARAMS.PAGE_SIZE) || String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
    setSearchInput('')
  }, [searchParams, setSearchParams])

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (pageIndex: number, pageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set(URL_PARAMS.PAGE, String(pageIndex + 1))
      newParams.set(URL_PARAMS.PAGE_SIZE, String(pageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  // Handle sorting change
  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (field && direction) {
        newParams.set(URL_PARAMS.ORDERING, direction === 'desc' ? `-${field}` : field)
      } else {
        newParams.delete(URL_PARAMS.ORDERING)
      }
      newParams.set(URL_PARAMS.PAGE, '1') // Reset page on sort
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const { openFilterDialog } = useEmployeeRoleFilter(currentFilters)
  const { openSingleRoleEdit } = useSingleRoleEdit()

  const handleEditEmployee = (employee: any) => {
    openSingleRoleEdit(employee, () => {
      queryClient.invalidateQueries({ queryKey: ['hrm', 'employee-roles', 'list'] })
    })
  }

  const handleNavigateToBulkEdit = () => {
    navigate(APP_PATH.PERMISSION_EMPLOYEE_MANAGEMENT_BY_ROLE_BULK_EDIT)
  }

  // Count active filters from URL
  const activeFilterCount = useMemo(() => {
    return Object.values(currentFilters).filter((value) => value && value !== '').length
  }, [currentFilters])

  const customActions = useMemo(() => {
    if (ability.can('bulk_update_roles', 'employee_role')) {
      return (
        <button
          onClick={handleNavigateToBulkEdit}
          className="bg-action-primary-red-default hover:bg-action-primary-red-hover rounded-md px-4 py-2 text-sm font-medium text-white"
        >
          Thay đổi vai trò hàng loạt
        </button>
      )
    }
    return null
  }, [ability])

  return (
    <>
      <PageTitle
        title="Quản lý nhân viên theo role"
        searchPlaceholder="Tìm theo mã nhân viên, tên nhân viên"
        searchClassName={'!w-[310px]'}
        handleSearch={setSearchInput}
        searchValue={searchInput}
        filterBadgeCount={activeFilterCount}
        handleFilter={() => openFilterDialog(handleFilterApply)}
        customActions={customActions}
      />

      <EmployeeRoleTable
        isBulkMode={false}
        onEditEmployee={handleEditEmployee}
        onClearFilter={handleClearFilter}
        searchParams={searchParams}
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
      />
    </>
  )
}
