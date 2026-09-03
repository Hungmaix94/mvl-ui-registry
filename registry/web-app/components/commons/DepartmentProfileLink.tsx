import { type ReactNode } from 'react'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { cn } from '@/utils'

type DepartmentProfileLinkProps = {
  /** Department id. When missing, children render as plain text (no link). */
  departmentId?: number | null
  children: ReactNode
  className?: string
  title?: string
}

/**
 * Renders a department name/code as a link that opens the department management
 * detail page in a new browser tab. Falls back to plain text when the viewer
 * lacks the `department.retrieve` permission or no id is available. Stops click
 * propagation so it can sit inside clickable table rows without triggering
 * row-level navigation. Mirrors EmployeeProfileLink.
 */
const DepartmentProfileLink = ({
  departmentId,
  children,
  className,
  title,
}: DepartmentProfileLinkProps) => {
  const ability = useAbility()
  const canViewDepartment = ability.can('retrieve', 'department')

  if (!departmentId || !canViewDepartment) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    )
  }

  const href = APP_PATH.DEPARTMENT_MANAGEMENT_DETAIL.replace(':id', String(departmentId))

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        'text-action-primary-red-default hover:underline focus-visible:underline',
        className
      )}
    >
      {children}
    </a>
  )
}

export default DepartmentProfileLink
