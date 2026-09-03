import type { EmployeeOrgDetail } from '../utils/slk-pool-utils'

/**
 * Compact org breadcrumb (Phòng ban · Khối · Chi nhánh) shown under an employee's
 * name — used for the GĐKD (business director) rows in the SLK monthly commission
 * pool list + pool detail. Renders nothing when no org part is present.
 */
export function EmployeeOrgHint({ detail }: { detail?: EmployeeOrgDetail | null }) {
  if (!detail) return null
  const parts = [
    detail.department?.name && `Phòng: ${detail.department.name}`,
    detail.block?.name && `Khối: ${detail.block.name}`,
    detail.branch?.name && `Chi nhánh: ${detail.branch.name}`,
  ].filter(Boolean) as string[]
  if (parts.length === 0) return null
  return (
    <span className="text-content-dark-3 mt-0.5 block text-[11px] leading-snug" title={parts.join(' · ')}>
      {parts.join(' · ')}
    </span>
  )
}
