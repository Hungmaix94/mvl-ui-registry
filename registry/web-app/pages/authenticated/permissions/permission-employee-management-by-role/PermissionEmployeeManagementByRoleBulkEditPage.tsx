import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import PageTitle from '@/components/ui/page-title/PageTitle.tsx'
import {
  BulkEditFooter,
  EmployeeRoleTable,
} from '@/features/permissions/permission-employee-management-by-role/components'
import { useEmployeeRoleFilter } from '@/features/permissions/permission-employee-management-by-role/hooks/useEmployeeRoleFilter.tsx'
import { useBulkRoleSelection } from '@/features/permissions/permission-employee-management-by-role/hooks/useBulkRoleSelection.tsx'
import type {
  EmployeeRoleFilters,
  EmployeeRole,
} from '@/features/permissions/permission-employee-management-by-role/types.ts'
import { APP_PATH } from '@/routes'

export default function PermissionEmployeeManagementByRoleBulkEditPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<EmployeeRoleFilters>({})
  const [selectedEmployees, setSelectedEmployees] = useState<EmployeeRole[]>([])

  const [pageRoles, setPageRoles] = useState<any[]>([])
  const [pageLoading, setPageLoading] = useState(false)

  const { openFilterDialog } = useEmployeeRoleFilter(filters)
  const { openBulkRoleSelection } = useBulkRoleSelection()

  const handleFilter = (newFilters: EmployeeRoleFilters) => {
    setFilters(newFilters)
  }

  const handleClearFilter = () => {
    setFilters({})
    setSearchQuery('')
  }

  const handleSelectionChange = (selectedEmployees: EmployeeRole[]) => {
    setSelectedEmployees(selectedEmployees)
  }

  const handleRoleChange = () => {
    openBulkRoleSelection(selectedEmployees, () => {
      // Invalidate and refetch after successful update
      queryClient.invalidateQueries({ queryKey: ['hrm', 'employee-roles', 'list'] })
      // Clear selection after successful update
      setSelectedEmployees([])
      // Navigate back to view mode
      navigate(APP_PATH.PERMISSION_EMPLOYEE_MANAGEMENT_BY_ROLE)
    })
  }

  const handleNavigateToViewMode = () => {
    navigate(APP_PATH.PERMISSION_EMPLOYEE_MANAGEMENT_BY_ROLE)
  }

  const activeFilterCount = Object.values(filters).filter((value) => value && value !== '').length

  const customActions = (
    <button
      onClick={handleNavigateToViewMode}
      className="border-border-2 bg-background-1 text-content-dark-1 hover:bg-background-2 rounded-md border px-4 py-2 text-sm font-medium"
    >
      Thay đổi vai trò từng người
    </button>
  )

  return (
    <div className="space-y-6">
      <PageTitle
        title="Chỉnh sửa vai trò hàng loạt"
        searchPlaceholder="Tìm theo mã nhân viên, tên nhân viên"
        searchValue={searchQuery}
        searchClassName={'!w-[310px]'}
        handleSearch={setSearchQuery}
        filterBadgeCount={activeFilterCount}
        handleFilter={() => openFilterDialog(handleFilter)}
        customActions={customActions}
      />

      <EmployeeRoleTable
        isBulkMode={true}
        onSelectionChange={handleSelectionChange}
        onClearFilter={handleClearFilter}
        filterParams={filters}
        searchQuery={searchQuery}
        onPageDataChange={({ roles, isLoading }) => {
          setPageRoles(roles)
          setPageLoading(isLoading)
        }}
      />

      <BulkEditFooter
        selectedCount={selectedEmployees.length}
        totalCount={pageRoles.length}
        onRoleChange={handleRoleChange}
        disabled={pageLoading}
      />
    </div>
  )
}
