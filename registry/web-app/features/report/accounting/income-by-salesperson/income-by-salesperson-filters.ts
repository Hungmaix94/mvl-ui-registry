export type IncomeBySalespersonFilterPatch = Record<string, string | number | null | undefined>

/**
  Patch multiple keys onto URL search params for report 21.11 and reset page to 1.
 */
export function buildIncomeBySalespersonSearchParams(
  current: URLSearchParams,
  changes: IncomeBySalespersonFilterPatch
): URLSearchParams {
  const next = new URLSearchParams(current)

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === '') next.delete(key)
    else next.set(key, String(value))
  }

  next.set('page', '1')
  return next
}

/**
 * Client-side row filtering logic for Income by Salesperson Report (21.11).
 */
export function filterIncomeBySalespersonRows(
  rows: any[],
  filters: {
    branch?: string
    block?: string
    department?: string
    employee?: string
    searchQuery?: string
  }
): any[] {
  const { branch, block, department, employee, searchQuery } = filters

  return rows.filter((r) => {
    // 1. Branch filter
    if (branch) {
      const branchId = Number(branch)
      if (isNaN(branchId) || r.branch_id !== branchId) return false
    }

    // 2. Block filter
    if (block) {
      const blockId = Number(block)
      if (isNaN(blockId) || r.block_id !== blockId) return false
    }

    // 3. Department filter
    if (department) {
      const deptId = Number(department)
      if (isNaN(deptId) || r.department_id !== deptId) return false
    }

    // 4. Employee filter
    if (employee) {
      const empId = Number(employee)
      if (isNaN(empId) || r.employee_id !== empId) return false
    }

    // 5. Search query filter
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        (r.employee_name || '').toLowerCase().includes(q) ||
        (r.employee_code || '').toLowerCase().includes(q) ||
        (r.department_name || '').toLowerCase().includes(q)
      if (!matchesSearch) return false
    }

    return true
  })
}
