import { cn } from '@/utils'

type DotLoaderProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function DotLoader({ className, size = 'md' }: DotLoaderProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  }

  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      <div
        className={cn('bg-data-blue-default animate-pulse rounded-full', sizeClasses[size])}
        style={{
          animationDelay: '0ms',
          animationDuration: '1.4s',
        }}
      />
      <div
        className={cn('bg-data-blue-default animate-pulse rounded-full', sizeClasses[size])}
        style={{
          animationDelay: '160ms',
          animationDuration: '1.4s',
        }}
      />
      <div
        className={cn('bg-data-blue-default animate-pulse rounded-full', sizeClasses[size])}
        style={{
          animationDelay: '320ms',
          animationDuration: '1.4s',
        }}
      />
    </div>
  )
}
