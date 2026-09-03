import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/utils'

const loadingVariants = cva('flex items-center justify-center', {
  variants: {
    size: {
      sm: 'h-6 w-6',
      md: 'h-8 w-8',
      lg: 'h-12 w-12',
      xl: 'h-16 w-16',
    },
    variant: {
      spinner: '',
      dots: 'space-x-1',
      pulse: '',
    },
    fullScreen: {
      true: 'min-h-screen',
      false: '',
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'spinner',
    fullScreen: false,
  },
})

const spinnerVariants = cva('relative rounded-full', {
  variants: {
    size: {
      sm: 'h-6 w-6',
      md: 'h-8 w-8',
      lg: 'h-12 w-12',
      xl: 'h-16 w-16',
    },
    color: {
      primary: '',
      secondary: '',
    },
  },
  defaultVariants: {
    size: 'md',
    color: 'primary',
  },
})

type LoadingProperties = VariantProps<typeof loadingVariants> & {
  className?: string
  message?: string
  color?: 'primary' | 'secondary'
}

/**
 * Reusable Loading component with multiple variants and sizes
 * Can be used for full screen loading, inline loading, or button loading states
 */
export function Loading({
  size,
  variant,
  fullScreen,
  className,
  message,
  color = 'primary',
  ...properties
}: LoadingProperties) {
  const renderSpinner = () => (
    <div className={cn(spinnerVariants({ size, color }))}>
      {/* Outer ring */}
      <div
        className={cn(
          'absolute inset-0 rounded-full border-2 border-transparent',
          'animate-spin',
          size === 'sm' && 'border-t-2',
          size === 'md' && 'border-t-2',
          size === 'lg' && 'border-t-3',
          size === 'xl' && 'border-t-4'
        )}
        style={{
          animationDuration: '1s',
          animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          borderTopColor:
            color === 'primary'
              ? 'var(--color-action-primary-red-default)'
              : color === 'secondary'
                ? 'var(--color-action-secondary-grey-default)'
                : undefined,
        }}
      />

      {/* Inner ring */}
      <div
        className={cn(
          'absolute inset-1 rounded-full border border-transparent',
          'animate-spin',
          size === 'sm' && 'border-t-1',
          size === 'md' && 'border-t-1',
          size === 'lg' && 'border-t-2',
          size === 'xl' && 'border-t-2'
        )}
        style={{
          animationDuration: '1.5s',
          animationDirection: 'reverse',
          animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          borderTopColor:
            color === 'primary'
              ? 'var(--color-action-primary-red-default)'
              : color === 'secondary'
                ? 'var(--color-action-secondary-grey-default)'
                : undefined,
          opacity: color === 'primary' || color === 'secondary' ? 0.6 : undefined,
        }}
      />

      {/* Center dot */}
      <div
        className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform rounded-full',
          'animate-pulse',
          size === 'sm' && 'h-1 w-1',
          size === 'md' && 'h-1.5 w-1.5',
          size === 'lg' && 'h-2 w-2',
          size === 'xl' && 'h-3 w-3'
        )}
        style={{
          animationDuration: '2s',
          backgroundColor:
            color === 'primary'
              ? 'var(--color-action-primary-red-default)'
              : color === 'secondary'
                ? 'var(--color-action-secondary-grey-default)'
                : undefined,
        }}
      />
    </div>
  )

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            'animate-bounce rounded-full',
            size === 'sm' && 'h-2 w-2',
            size === 'md' && 'h-3 w-3',
            size === 'lg' && 'h-4 w-4',
            size === 'xl' && 'h-6 w-6'
          )}
          style={{
            animationDelay: `${index * 0.1}s`,
            backgroundColor:
              color === 'primary'
                ? 'var(--color-action-primary-red-default)'
                : color === 'secondary'
                  ? 'var(--color-action-secondary-grey-default)'
                  : undefined,
          }}
        />
      ))}
    </div>
  )

  const renderPulse = () => (
    <div
      className={cn(
        'animate-pulse rounded-lg',
        size === 'sm' && 'h-6 w-16',
        size === 'md' && 'h-8 w-20',
        size === 'lg' && 'h-12 w-32',
        size === 'xl' && 'h-16 w-40'
      )}
      style={{
        backgroundColor:
          color === 'primary'
            ? 'var(--color-action-primary-red-default)'
            : color === 'secondary'
              ? 'var(--color-action-secondary-grey-default)'
              : undefined,
      }}
    />
  )

  const renderLoadingContent = () => {
    switch (variant) {
      case 'dots': {
        return renderDots()
      }
      case 'pulse': {
        return renderPulse()
      }
      case 'spinner':
      default: {
        return renderSpinner()
      }
    }
  }

  return (
    <div
      className={cn(loadingVariants({ size, variant, fullScreen }), 'w-full', className)}
      {...properties}
    >
      <div className="flex w-full flex-col items-center space-y-2">
        {renderLoadingContent()}
        {message && (
          <p
            className={cn(
              'text-gray-600',
              size === 'sm' && 'text-sm',
              size === 'md' && 'text-base',
              size === 'lg' && 'text-lg',
              size === 'xl' && 'text-xl'
            )}
          >
            {message}
            <span className="dot-loader" />
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Full screen loading component
 */
export function FullScreenLoading({
  message = 'Loading...',
  ...properties
}: Omit<LoadingProperties, 'fullScreen'>) {
  return (
    <Loading
      fullScreen
      size="lg"
      message={message}
      className="bg-white/80 backdrop-blur-sm"
      {...properties}
    />
  )
}

/**
 * Inline loading component for buttons
 */
export function ButtonLoading({ size = 'sm', ...properties }: LoadingProperties) {
  return <Loading size={size} variant="spinner" className="inline-flex" {...properties} />
}

/**
 * Page loading component
 */
export function PageLoading({ message = 'Loading page...', ...properties }: LoadingProperties) {
  return (
    <div className={cn('flex min-h-screen items-center justify-center', properties.className)}>
      <Loading size="lg" message={message} {...properties} />
    </div>
  )
}
