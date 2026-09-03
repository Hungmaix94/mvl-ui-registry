import { type ReactNode } from 'react'
import { cn } from '@/utils'

export type DisplayFieldProps = {
  label: string
  value: string | ReactNode | null | undefined
  className?: string
  labelClassName?: string
  valueClassName?: string
}

export const DisplayField = ({
  label,
  value,
  className,
  labelClassName = 'typo-body-base-semibold text-content-dark-3',
  valueClassName = 'typo-body-base text-content-dark-1',
}: DisplayFieldProps) => {
  const displayValue = value || '-'

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className={labelClassName}>{label}</span>
      <span className={valueClassName}>{displayValue}</span>
    </div>
  )
}

export default DisplayField

export const DisplayFieldRow = ({
  label,
  value,
  className,
}: {
  label: string
  value: string | ReactNode | null | undefined
  className?: string
}) => {
  const displayValue = value || '-'

  return (
    <div
      className={cn(
        'border-border-1 flex items-center justify-between border-b py-4 last:border-b-0',
        className
      )}
    >
      <span className="typo-body-base-medium text-content-dark-3 w-[168px] flex-shrink-0 font-medium">
        {label}
      </span>
      <span className="typo-body-base text-content-dark-1 text-right">{displayValue}</span>
    </div>
  )
}
