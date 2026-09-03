export const getActiveProjectStaff = (
  staffs: any[] | null | undefined,
  role: 'project_director' | 'project_secretary',
  targetDate?: string | null
): any | null => {
  if (!staffs || staffs.length === 0) return null

  // Filter by role
  const roleStaffs = staffs.filter((s: any) => s.role === role && s.employee)
  if (roleStaffs.length === 0) return null

  if (targetDate) {
    // Rule: active at targetDate
    // effective_from <= targetDate AND (effective_to is null OR effective_to >= targetDate)
    const activeStaffs = roleStaffs.filter((s: any) => {
      const from = s.effective_from || ''
      const to = s.effective_to || ''
      return from <= targetDate && (!to || to >= targetDate)
    })

    if (activeStaffs.length > 0) {
      // Sort by effective_from descending to get the latest one starting before targetDate
      return activeStaffs.sort((a: any, b: any) => {
        const fromA = a.effective_from || ''
        const fromB = b.effective_from || ''
        return fromB.localeCompare(fromA)
      })[0]?.employee || null
    }
  }

  // Fallback if no targetDate or no active staff found at targetDate:
  // Get the latest one starting ever (newest effective_from)
  return (
    roleStaffs.sort((a: any, b: any) => {
      const fromA = a.effective_from || ''
      const fromB = b.effective_from || ''
      return fromB.localeCompare(fromA)
    })[0]?.employee || null
  )
}
