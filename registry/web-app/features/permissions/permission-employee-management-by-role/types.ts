import type { EmployeeRoleList } from '@/features/employee/services/employee-role-service'

export type EmployeeRole = EmployeeRoleList

export type EmployeeRoleFilters = {
  role?: string
  branch?: string
  block?: string
  department?: string
  position?: string
}

export type EmployeeRoleFilterFormRef = {
  clearForm: () => void
  getValues: () => EmployeeRoleFilters
  hasChanges: () => boolean
}
