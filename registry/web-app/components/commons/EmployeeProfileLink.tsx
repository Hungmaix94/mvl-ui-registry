import { type ReactNode } from 'react'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { cn } from '@/utils'

type EmployeeProfileLinkProps = {
  /** Employee id. When missing, children render as plain text (no link). */
  employeeId?: number | null
  children: ReactNode
  className?: string
  title?: string
}

/**
 * Renders an employee name/code as a link that opens the employee profile
 * (Hồ sơ nhân viên) detail page in a new browser tab. Falls back to plain text
 * when the viewer lacks the `employee.retrieve` permission or no id is
 * available. Stops click propagation so it can sit inside clickable table rows
 * without triggering row-level navigation.
 */
const EmployeeProfileLink = ({
  employeeId,
  children,
  className,
  title,
}: EmployeeProfileLinkProps) => {
  const ability = useAbility()
  const canViewEmployee = ability.can('retrieve', 'employee')

  if (!employeeId || !canViewEmployee) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    )
  }

  const href = APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(employeeId))

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

export default EmployeeProfileLink
