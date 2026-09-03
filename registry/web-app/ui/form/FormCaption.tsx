import { cn } from '@/utils'

export interface FormCaptionProps {
  caption?: string
  error?: string
  disabled?: boolean
}

export const FormCaption = ({ caption, error, disabled }: FormCaptionProps) => {
  if (!error && !caption) {
    return null
  }

  return (
    <div
      className={cn(
        `text-xs`,
        'text-neutral-80',
        disabled && 'text-content-dark-4',
        error && 'text-data-red-default'
      )}
    >
      {error || caption}
    </div>
  )
}
