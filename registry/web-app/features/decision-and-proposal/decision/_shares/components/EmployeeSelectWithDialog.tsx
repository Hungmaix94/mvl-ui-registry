import { useCallback, useMemo, useRef, useState } from 'react'
import { Select, TextField } from '@/components/ui'
import { IconMagnifyingglass } from '@/assets/icons'
import { Button } from '@/components/ui/button'
import { useDialog } from '@/hooks/useDialog.ts'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect.ts'
import { PAGE_SIZE } from '@/constants/table.ts'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import type { CascadeSelectFormData } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { Flex } from '@radix-ui/themes'
import { cn } from '@/utils'
import {
  getEmployeeService,
  type EmployeeDropdown,
  type GetEmployeesDropdownParams,
} from '@/features/employee/services/employee-service'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { useAbility } from '@/lib/ability'

/** Display shape derived from EmployeeDropdown (schema), with nested fields nullable for fallback */
type SelectedEmployee = Pick<EmployeeDropdown, 'id' | 'code' | 'fullname'> & {
  branch: EmployeeDropdown['branch'] | null
  block: EmployeeDropdown['block'] | null
  department: EmployeeDropdown['department'] | null
  position: EmployeeDropdown['position'] | null
}

type EmployeeSelectWithDialogProps = {
  value?: number | null
  onChange?: (value: number | null) => void
  error?: string
  disabled?: boolean
  required?: boolean
  label?: string
  additionalParams?: GetEmployeesDropdownParams | (() => GetEmployeesDropdownParams)
  onEntityChange?: (employee: SelectedEmployee | null) => void
}

function mapToSelectedEmployee(
  emp: Pick<
    EmployeeDropdown,
    'id' | 'code' | 'fullname' | 'branch' | 'block' | 'department' | 'position'
  > & { username?: string | null },
  fullnameFallback?: string
): SelectedEmployee {
  const fullname =
    emp.fullname?.trim() || (emp as { username?: string }).username || fullnameFallback || ''
  return {
    id: emp.id,
    code: emp.code || '',
    fullname,
    branch: emp.branch ?? null,
    block: emp.block ?? null,
    department: emp.department ?? null,
    position: emp.position ?? null,
  }
}

const EmployeeSelectWithDialog = ({
  value,
  onChange,
  error,
  disabled,
  required,
  label = 'Người ký',
  additionalParams,
  onEntityChange,
}: EmployeeSelectWithDialogProps) => {
  const ability = useAbility()
  const canAccessEmployeeDropdown = ability.can('dropdown', 'employee')

  // Hide component completely if user doesn't have permission
  if (!canAccessEmployeeDropdown) {
    return null
  }

  const [selectedEmployee, setSelectedEmployee] = useState<SelectedEmployee | null>(null)
  const pendingFormDataRef = useRef<CascadeSelectFormData | null>(null)
  const cascadeFormRef = useRef<{ reset: () => void; clearAll: () => void }>(null)
  const { displayFormContent, displayClose } = useDialog()
  const queryClient = useQueryClient()

  const { loadEmployeeOptions, loadInitialEmployeeOptions, getCachedEmployeeById } =
    useEmployeeSelect({
      valueType: 'id',
      pageSize: PAGE_SIZE,
      fields: ['code', 'id', 'fullname', 'branch', 'block', 'department'],
      additionalParams,
    })

  // Load initial employee if value is provided
  const loadInitialOptions = useCallback(async () => {
    if (!value) return

    const employeeId = Number(value)

    // Prefer cache from dropdown (no extra API call)
    const cached = getCachedEmployeeById(employeeId)
    if (cached) {
      setSelectedEmployee(mapToSelectedEmployee(cached))
      return
    }

    try {
      const params = { id__in: [employeeId], page: 1, page_size: 1 }
      const data = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.HRM.EMPLOYEES.DROPDOWN(params),
        queryFn: () => getEmployeeService().listEmployeesDropdown(params),
        staleTime: 1000 * 60 * 5, // 5 minutes cache
      })
      const employee = data?.results?.[0]
      if (employee) {
        setSelectedEmployee(mapToSelectedEmployee(employee))
      }
    } catch {
      // Fallback: try to parse from option label
      const options = await loadInitialEmployeeOptions([value])
      if (options.length > 0) {
        const option = options[0]
        const match = option.label.match(/^(.+?) - (.+)$/)
        if (match) {
          setSelectedEmployee({
            id: Number(option.value),
            code: match[1],
            fullname: match[2]?.trim() || match[1] || '',
            branch: null,
            block: null,
            department: null,
            position: null,
          })
        }
      }
    }
  }, [value, getCachedEmployeeById, queryClient, loadInitialEmployeeOptions])

  // Sync with external value changes
  useMemo(() => {
    if (value && !selectedEmployee) {
      loadInitialOptions()
    } else if (!value && selectedEmployee) {
      setSelectedEmployee(null)
      onEntityChange?.(null)
    } else if (value && selectedEmployee) {
      // Compare with type coercion to handle number/string mismatch
      const valueAsNumber = Number(value)
      const selectedIdAsNumber = Number(selectedEmployee.id)
      if (valueAsNumber !== selectedIdAsNumber) {
        loadInitialOptions()
      }
    }
  }, [value, selectedEmployee, loadInitialOptions, onEntityChange])

  const handleSelectChange = useCallback(
    (newValue: string | number | (string | number)[] | null) => {
      let employeeId: number | null = null
      if (Array.isArray(newValue)) {
        employeeId = newValue.length > 0 ? Number(newValue[0]) : null
      } else {
        employeeId = newValue ? Number(newValue) : null
      }

      if (employeeId) {
        // Prefer cache from dropdown (no extra API call when option was just loaded)
        const cached = getCachedEmployeeById(employeeId)
        if (cached) {
          const emp = mapToSelectedEmployee(cached)
          setSelectedEmployee(emp)
          onEntityChange?.(emp)
          onChange?.(employeeId)
          return
        }

        const params = { id__in: [employeeId], page: 1, page_size: 1 }
        queryClient
          .fetchQuery({
            queryKey: QUERY_KEYS.HRM.EMPLOYEES.DROPDOWN(params),
            queryFn: () => getEmployeeService().listEmployeesDropdown(params),
            staleTime: 1000 * 60 * 5,
          })
          .then((data) => {
            const employee = data?.results?.[0]
            if (employee) {
              const emp = mapToSelectedEmployee(employee)
              setSelectedEmployee(emp)
              onEntityChange?.(emp)
            } else {
              const fallback = {
                id: employeeId,
                code: '',
                fullname: '',
                branch: null,
                block: null,
                department: null,
                position: null,
              }
              setSelectedEmployee(fallback)
              onEntityChange?.(fallback)
            }
          })
          .catch(() => {
            loadInitialEmployeeOptions([employeeId]).then((options) => {
              if (options.length > 0) {
                const option = options[0]
                const match = option.label.match(/^(.+?) - (.+)$/)
                if (match) {
                  setSelectedEmployee({
                    id: employeeId!,
                    code: match[1],
                    fullname: match[2]?.trim() || match[1] || '',
                    branch: null,
                    block: null,
                    department: null,
                    position: null,
                  })
                } else {
                  setSelectedEmployee({
                    id: employeeId,
                    code: '',
                    fullname: '',
                    branch: null,
                    block: null,
                    department: null,
                    position: null,
                  })
                }
              } else {
                setSelectedEmployee({
                  id: employeeId,
                  code: '',
                  fullname: '',
                  branch: null,
                  block: null,
                  department: null,
                  position: null,
                })
              }
            })
          })
      } else {
        setSelectedEmployee(null)
        onEntityChange?.(null)
      }

      onChange?.(employeeId)
    },
    [onChange, getCachedEmployeeById, queryClient, loadInitialEmployeeOptions]
  )

  // Handler to store pending form data when user selects in dialog (before clicking "Chọn")
  const handleDialogFormChange = useCallback((data: CascadeSelectFormData) => {
    // Only store the data, don't apply it yet
    pendingFormDataRef.current = data
  }, [])

  // Handler to apply the selection when user clicks "Chọn" button
  const applyEmployeeSelection = useCallback(
    async (data: CascadeSelectFormData) => {
      if (!data.employee_id || data.employee_id <= 0) return
      if (selectedEmployee?.id === data.employee_id) return

      const employeeId = data.employee_id

      // Prefer cache from dropdown (e.g. user searched this employee before opening dialog)
      const cached = getCachedEmployeeById(employeeId)
      if (cached) {
        const employeeData = mapToSelectedEmployee(cached, data.employee_name)
        try {
          await loadInitialEmployeeOptions([employeeId])
        } finally {
          setSelectedEmployee(employeeData)
          onEntityChange?.(employeeData)
          onChange?.(employeeId)
        }
        return
      }

      try {
        const params = { id__in: [employeeId], page: 1, page_size: 1 }
        const dropdownData = await queryClient.fetchQuery({
          queryKey: QUERY_KEYS.HRM.EMPLOYEES.DROPDOWN(params),
          queryFn: () => getEmployeeService().listEmployeesDropdown(params),
          staleTime: 1000 * 60 * 5,
        })
        const employee = dropdownData?.results?.[0]

        if (employee) {
          const employeeData = mapToSelectedEmployee(employee, data.employee_name)
          try {
            await loadInitialEmployeeOptions([employeeId])
          } finally {
            setSelectedEmployee(employeeData)
            onEntityChange?.(employeeData)
            onChange?.(employeeId)
          }
        } else {
          const fallback = {
            id: employeeId,
            code: '',
            fullname: data.employee_name || '',
            branch: null,
            block: null,
            department: null,
            position: null,
          }
          setSelectedEmployee(fallback)
          onEntityChange?.(fallback)
          onChange?.(employeeId)
        }
      } catch {
        const fallback = {
          id: employeeId,
          code: '',
          fullname: data.employee_name || '',
          branch: null,
          block: null,
          department: null,
          position: null,
        }
        setSelectedEmployee(fallback)
        onEntityChange?.(fallback)
        onChange?.(employeeId)
      }
    },
    [onChange, getCachedEmployeeById, queryClient, selectedEmployee, loadInitialEmployeeOptions]
  )

  const openFilterDialog = useCallback(() => {
    // Don't open dialog if component is disabled
    if (disabled) {
      return
    }

    // Reset pending data when opening dialog
    pendingFormDataRef.current = null

    displayFormContent({
      title: 'Tìm nhân viên',
      content: (
        <CascadeSelectGroupOrganization
          ref={cascadeFormRef}
          onFormChange={handleDialogFormChange}
          onEmployeeSelect={handleDialogFormChange}
          showEmployee={true}
          employeeLabel="Chọn nhân viên"
          layout="grid"
          skipValidation
          showDepartment
          showPosition={true}
          positionLabel="Chức vụ"
          className={'gap-4'}
          employeeAdditionalParams={additionalParams}
        />
      ),
      confirmText: 'Chọn',
      onConfirm: async () => {
        // Apply the selection only when user clicks "Chọn"
        if (pendingFormDataRef.current) {
          await applyEmployeeSelection(pendingFormDataRef.current)
        }

        displayClose()
      },
      confirmButtonClassName:
        'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white min-w-[128px]',
    })
  }, [disabled, displayFormContent, displayClose, handleDialogFormChange, applyEmployeeSelection])

  const employeeDisplayValue = selectedEmployee
    ? `${selectedEmployee.code} - ${selectedEmployee.fullname} - ${
        selectedEmployee.branch?.name || '-'
      } - ${selectedEmployee.block?.name || '-'} - ${selectedEmployee.department?.name || '-'} - ${selectedEmployee.position?.name || '-'}`
    : null

  // Calculate Select value - use string to match option.value type from loadInitialEmployeeOptions
  // This ensures allOptionsMap.get() can find the option correctly (options use string values)
  const selectValue = selectedEmployee?.id ? String(selectedEmployee.id) : null

  return (
    <Flex direction="column" gap="2" className="w-full">
      {label && (
        <div className="flex items-center gap-0.5">
          <label className="typo-body-base-semibold text-content-dark-2">{label}</label>
          {required && (
            <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
          )}
        </div>
      )}
      <Flex gap="2" className="w-full">
        <div className="flex-1">
          <Select
            value={selectValue}
            onChange={handleSelectChange}
            loadOptions={loadEmployeeOptions}
            loadInitialOptions={loadInitialEmployeeOptions}
            placeholder="Nhập/chọn họ tên hoặc mã nhân viên"
            searchPlaceholder="Tìm kiếm nhân viên..."
            enableSearch
            pageSize={PAGE_SIZE}
            disabled={disabled}
            title={employeeDisplayValue || undefined}
            className={cn('w-full', error && 'border-data-red-default')}
          />
        </div>
        <Button
          type="button"
          variant="secondary-border"
          onClick={openFilterDialog}
          disabled={disabled}
          className="border-border-1 flex-shrink-0"
          leftIcon={<IconMagnifyingglass />}
          title={'Mở bộ lọc Nhân viên'}
        />
      </Flex>
      {error && <span className="text-data-red-default text-xs">{error}</span>}
      {selectedEmployee && (
        <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField label="Chi nhánh" value={selectedEmployee.branch?.name} disabled />
          <TextField label="Khối" value={selectedEmployee.block?.name} disabled />
          <TextField label="Phòng ban" value={selectedEmployee.department?.name} disabled />
          <TextField label="Chức vụ" value={selectedEmployee.position?.name} disabled />
        </div>
      )}
    </Flex>
  )
}

export default EmployeeSelectWithDialog
