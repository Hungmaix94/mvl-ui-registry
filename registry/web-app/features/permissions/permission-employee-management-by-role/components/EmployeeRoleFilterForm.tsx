import { forwardRef, useImperativeHandle, useMemo, useState, useCallback } from 'react'
import Select from '@/components/ui/select/Select.tsx'
import { useRoleSelect } from '@/hooks/useRoleSelect.ts'
import { PAGE_SIZE } from '@/constants/table.ts'
import type { EmployeeRoleFilterFormRef, EmployeeRoleFilters } from '../types.ts'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'

type EmployeeRoleFilterFormProps = {
  initialFilters?: EmployeeRoleFilters
}

const EmployeeRoleFilterForm = forwardRef<EmployeeRoleFilterFormRef, EmployeeRoleFilterFormProps>(
  ({ initialFilters = {} }, ref) => {
    const [filters, setFilters] = useState<EmployeeRoleFilters>(initialFilters)
    const [formKey, setFormKey] = useState(0)

    // Lazy role select hook
    const { loadRoleOptions, loadInitialRoleOptions } = useRoleSelect({ pageSize: PAGE_SIZE })

    // Check if filters have changed from initial
    const hasChanges = useMemo(() => {
      return Object.keys(filters).some((key) => {
        const filterKey = key as keyof EmployeeRoleFilters
        return filters[filterKey] !== initialFilters[filterKey]
      })
    }, [filters, initialFilters])

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          setFilters({})
          setFormKey((prev) => prev + 1)
        },
        getValues: () => filters,
        hasChanges: () => hasChanges,
      }),
      [filters, hasChanges]
    )

    const handleFilterChange = (key: keyof EmployeeRoleFilters, value: string | undefined) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }))
    }

    const handleCascadeChange = useCallback((data: any) => {
      setFilters((prev) => {
        const updated = { ...prev }
        const newBranch = data.branch_id ? String(data.branch_id) : undefined
        const newBlock = data.block_id ? String(data.block_id) : undefined
        const newDepartment = data.department_id ? String(data.department_id) : undefined
        const newPosition = data.position_id ? String(data.position_id) : undefined

        if (newBranch !== prev.branch) {
          updated.branch = newBranch
        }

        if (newBlock !== prev.block) {
          updated.block = newBlock
        }

        if (newDepartment !== prev.department) {
          updated.department = newDepartment
        }

        if (newPosition !== prev.position) {
          updated.position = newPosition
        }

        return updated
      })
    }, [])

    return (
      <div className="flex flex-col gap-5">
        {/* Vai trò - lazy loading */}
        <Select
          value={filters.role ?? null}
          onChange={(value) => handleFilterChange('role', value ? String(value) : undefined)}
          label="Vai trò"
          placeholder="Chọn vai trò"
          loadOptions={loadRoleOptions}
          loadInitialOptions={loadInitialRoleOptions}
          pageSize={PAGE_SIZE}
          enableSearch
          searchPlaceholder="Tìm kiếm vai trò..."
          debounceMs={300}
        />

        {/* CascadeSelectGroupOrganization */}
        <CascadeSelectGroupOrganization
          key={formKey}
          initialValues={
            formKey === 0
              ? {
                  branch: filters.branch,
                  block: filters.block,
                  department: filters.department,
                  position: filters.position,
                }
              : undefined
          }
          onFormChange={handleCascadeChange}
          skipValidation
          showEmployee={false}
          showPosition
          positionLabel="Chức vụ"
          className="gap-6"
        />
      </div>
    )
  }
)

EmployeeRoleFilterForm.displayName = 'EmployeeRoleFilterForm'

export default EmployeeRoleFilterForm
