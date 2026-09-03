import { type ReactNode } from 'react'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { cn } from '@/utils'

type ProjectDetailLinkProps = {
  /** Project id. When missing, children render as plain text (no link). */
  projectId?: number | null
  children: ReactNode
  className?: string
  title?: string
}

/**
 * Renders a project code as a link that opens the project (Quản lý dự án)
 * detail page in a new browser tab. Falls back to plain text when the viewer
 * lacks the `project.retrieve` permission or no id is available. Stops click
 * propagation so it can sit inside clickable table rows without triggering
 * row-level navigation.
 */
const ProjectDetailLink = ({ projectId, children, className, title }: ProjectDetailLinkProps) => {
  const ability = useAbility()
  const canViewProject = ability.can('retrieve', 'project')

  if (!projectId || !canViewProject) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    )
  }

  const href = APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(projectId))

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

export default ProjectDetailLink
