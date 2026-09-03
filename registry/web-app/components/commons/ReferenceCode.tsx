import React from 'react'
import { Link } from 'react-router-dom'
import { IconCopy } from '@/assets/icons'
import toastService from '@/services/toast-service'
import { cn } from '@/utils'

export interface ReferenceCodeProps {
  code?: string | null
  enableCopy?: boolean
  className?: string
  fallback?: string
  linkTo?: string
}

export const ReferenceCode: React.FC<ReferenceCodeProps> = ({
  code,
  enableCopy = false,
  className,
  fallback = '-',
  linkTo,
}) => {
  if (!code) {
    return <span>{fallback}</span>
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    toastService.success('Đã copy mã')
  }

  const codeElement = <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">{code}</code>

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      {linkTo ? (
        <Link to={linkTo} className="text-action-primary-default hover:underline">
          {codeElement}
        </Link>
      ) : (
        codeElement
      )}
      {enableCopy && (
        <IconCopy
          className="text-content-dark-4 hover:text-content-dark-1 cursor-pointer"
          size={16}
          onClick={handleCopy}
        />
      )}
    </div>
  )
}
