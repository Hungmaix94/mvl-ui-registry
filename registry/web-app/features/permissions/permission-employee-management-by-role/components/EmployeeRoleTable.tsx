import { useMemo, useEffect } from 'react'
import { IconPencilsimple } from '@/assets/icons'
import { Table } from '@/components/ui/table/Table.tsx'
import TableError from '@/components/ui/table/TableError'
import type { EmployeeRole } from '../types.ts'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui'
import { cn } from '@/utils'
import { Box } from '@radix-ui/themes'
import { useAbility } from '@/lib/ability.ts'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { useEmployeeRoles } from '@/features/employee/services/employee-role-service'
import { parsePositiveInt } from '@/utils/common.ts'

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

// Build API params from URL (URL is single source of truth)
function buildApiParamsFromUrl(searchParams: URLSearchParams): Record<string, any> {
  const params: Record<string, any> = {}

  // Pagination
  const page = parsePositiveInt(searchParams.get(URL_PARAMS.PAGE)) || 1
  const pageSizeRaw = parsePositiveInt(searchParams.get(URL_PARAMS.PAGE_SIZE))
  const pageSize = pageSizeRaw && PAGE_SIZES.includes(pageSizeRaw) ? pageSizeRaw : PAGE_SIZE

  params.page = page
  params.page_size = pageSize

  // Search
  const search = searchParams.get(URL_PARAMS.SEARCH)
  if (search) params.search = search

  // Ordering
  const ordering = searchParams.get(URL_PARAMS.ORDERING)
  if (ordering) params.ordering = ordering

  // Filters
  const role = searchParams.get(URL_PARAMS.ROLE)
  if (role) params.role = role

  const branch = searchParams.get(URL_PARAMS.BRANCH)
  if (branch) params.branch = branch

  const block = searchParams.get(URL_PARAMS.BLOCK)
  if (block) params.block = block

  const department = searchParams.get(URL_PARAMS.DEPARTMENT)
  if (department) params.department = department

  const position = searchParams.get(URL_PARAMS.POSITION)
  if (position) params.position = position

  return params
}

type EmployeeRoleTableProps = {
  isBulkMode?: boolean
  onSelectionChange?: (selectedEmployees: EmployeeRole[]) => void
  onEditEmployee?: (employee: EmployeeRole) => void
  onClearFilter?: () => void
  loading?: boolean
  // URL-driven: receive searchParams from parent
  searchParams?: URLSearchParams
  onPaginationChange?: (pageIndex: number, pageSize: number) => void
  onSortingChange?: (field: string, direction: 'asc' | 'desc' | null) => void
  // Legacy props for backward compatibility (bulk edit page)
  filterParams?: Record<string, any>
  searchQuery?: string
  // Notify parent about current page data and loading state (useful for bulk edit page)
  onPageDataChange?: (payload: {
    roles: EmployeeRole[]
    totalRecords: number
    isLoading: boolean
  }) => void
}

export default function EmployeeRoleTable({
  isBulkMode = false,
  onSelectionChange,
  onEditEmployee,
  onClearFilter,
  loading = false,
  searchParams,
  onPaginationChange,
  onSortingChange,
  filterParams,
  searchQuery,
  onPageDataChange,
}: EmployeeRoleTableProps) {
  const ability = useAbility()

  // === Build API params from URL (URL is single source of truth) ===
  const apiParams = useMemo(() => {
    // URL-driven mode (new)
    if (searchParams) {
      return buildApiParamsFromUrl(searchParams)
    }

    // Legacy mode (for backward compatibility with bulk edit page)
    const params: Record<string, any> = {
      page: 1,
      page_size: PAGE_SIZE,
    }
    if (searchQuery) params.search = searchQuery
    if (filterParams) Object.assign(params, filterParams)
    return params
  }, [searchParams, filterParams, searchQuery])

  // Get current pagination values from URL
  const currentPage = apiParams.page || 1
  const pageSize = apiParams.page_size || PAGE_SIZE

  // === Gọi API ===
  const {
    data: apiEmployeeRolesResponse,
    error,
    isLoading: isApiLoading,
  } = useEmployeeRoles(apiParams)

  const { roles, pageCount, totalRecords } = useMemo(() => {
    const results = apiEmployeeRolesResponse?.results || []
    const totalRecords = apiEmployeeRolesResponse?.count || 0
    const pageCount = Math.ceil(totalRecords / pageSize) || 1

    return { roles: results, pageCount, totalRecords }
  }, [apiEmployeeRolesResponse?.results, apiEmployeeRolesResponse?.count, pageSize])

  // Expose current page data and loading state to parent when needed
  useEffect(() => {
    onPageDataChange?.({ roles, totalRecords, isLoading: !!isApiLoading })
  }, [roles, totalRecords, isApiLoading, onPageDataChange])

  // Handle pagination change - delegate to parent (URL-driven)
  const handlePaginationChange = (pageIndex: number, newPageSize: number) => {
    onPaginationChange?.(pageIndex, newPageSize)
  }

  // === Cấu hình cột ===
  const columns: ColumnDef<EmployeeRole>[] = useMemo(() => {
    const baseColumns: ColumnDef<EmployeeRole>[] = [
      {
        accessorKey: 'employee_code',
        header: 'Mã',
        meta: {
          width: '130px',
          sortable: true,
        },
        cell: ({ row }) => (
          <span title={row.original.employee_code || ''}>{row.original.employee_code || '-'}</span>
        ),
      },
      {
        accessorKey: 'employee_name',
        header: 'Tên',
        meta: {
          width: '200px',
        },
        cell: ({ row }) => (
          <span title={row.original.employee_name || ''}>{row.original.employee_name || '-'}</span>
        ),
      },
      {
        accessorKey: 'role_name',
        header: 'Vai trò',
        meta: {
          width: '150px',
        },
        cell: ({ row }) => (
          <span title={row.original.role_name || ''}>{row.original.role_name || '-'}</span>
        ),
      },
      {
        accessorKey: 'branch_name',
        header: 'Chi nhánh',
        meta: {
          width: '150px',
        },
        cell: ({ row }) => (
          <span title={row.original.branch_name || ''}>{row.original.branch_name || '-'}</span>
        ),
      },
      {
        accessorKey: 'block_name',
        header: 'Khối',
        meta: {
          width: '120px',
        },
        cell: ({ row }) => (
          <span title={row.original.block_name || ''}>{row.original.block_name || '-'}</span>
        ),
      },
      {
        accessorKey: 'department_name',
        header: 'Phòng ban',
        meta: {
          width: '150px',
        },
        cell: ({ row }) => (
          <span title={row.original.department_name || ''}>
            {row.original.department_name || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'position_name',
        header: 'Chức vụ',
        meta: {
          width: '150px',
        },
        cell: ({ row }) => (
          <span title={row.original.position_name || ''}>{row.original.position_name || '-'}</span>
        ),
      },
    ]

    if (isBulkMode) {
      return baseColumns
    }

    const tableActions: ColumnDef<EmployeeRole>[] = []
    if (ability.can('bulk_update_roles', 'employee_role')) {
      tableActions.push({
        id: 'actions',
        meta: {
          width: '32px',
        },
        cell: ({ row }) => (
          <Button
            onClick={() => onEditEmployee?.(row.original)}
            className={cn(
              'text-content-dark-1 bg-transparent',
              'hover:text-action-primary-red-default hover:bg-transparent',
              'flex h-8 w-8 items-center justify-center',
              'border-none'
            )}
            title="Chỉnh sửa"
            iconOnly
            leftIcon={<IconPencilsimple className="h-4 w-4" />}
            variant={'secondary-border'}
          />
        ),
      })
    }

    return [...baseColumns, ...tableActions]
  }, [onEditEmployee, ability])

  // Handle sorting change - delegate to parent (URL-driven)
  const handleSortingChange = (field: string, direction: 'asc' | 'desc' | null) => {
    onSortingChange?.(field, direction)
  }

  if (error) {
    return <TableError />
  }

  return (
    <Box mb="0">
      <Table
        isLoading={loading || !!isApiLoading}
        data={roles}
        columns={columns}
        enableSorting
        manualSorting
        enablePagination
        enableRowSelection={isBulkMode}
        onSelectionChange={isBulkMode ? onSelectionChange : undefined}
        getRowId={(row) => row.id.toString()}
        manualPagination
        pageCount={pageCount}
        pageSize={pageSize}
        currentPageIndex={currentPage - 1}
        totalRecords={totalRecords}
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
        onClearFilter={onClearFilter}
        emptyMessage="Không có dữ liệu nhân viên"
        hasFilter={
          !!apiParams.search ||
          !!apiParams.role ||
          !!apiParams.branch ||
          !!apiParams.block ||
          !!apiParams.department ||
          !!apiParams.position
        }
        showSTT={false}
      />
    </Box>
  )
}
