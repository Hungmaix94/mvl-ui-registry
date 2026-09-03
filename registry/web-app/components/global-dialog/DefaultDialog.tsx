import { DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { cn } from '@/lib/utils'
import { IconX } from '@/assets/icons'
import { DialogConfig } from '@/types'

interface DefaultDialogProps {
  config: DialogConfig
  onConfirm: () => void
  onCancel: () => void
}

export function DefaultDialog({ config, onConfirm, onCancel }: DefaultDialogProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      {(config?.title || config?.description) && (
        <DialogHeader
          className={cn(
            'flex !flex-row justify-between',
            'border-border-1',
            'border-b-[1px]',
            'flex-shrink-0',
            'px-6 pt-4 pb-[16px]'
          )}
        >
          {config?.title && (
            <DialogTitle className={cn('typo-h6 text-content-dark-1')}>{config.title}</DialogTitle>
          )}
          {config?.onClose && !config?.disableBackdropClose ? (
            <>
              <DialogClose
                className={cn(
                  'ring-offset-background',
                  'focus:ring-ring',
                  'data-[state=open]:bg-accent',
                  'data-[state=open]:text-muted-foreground',
                  'rounded-sm opacity-70 transition-opacity',
                  'hover:opacity-100',
                  'disabled:pointer-events-none'
                )}
                asChild={true}
              >
                <Button
                  iconOnly
                  leftIcon={<IconX />}
                  variant={'secondary'}
                  className={cn(
                    'bg-transparent',
                    'text-content-dark-2',
                    'p-[9px]',
                    'focus:border-none focus:outline-none focus-visible:border-none focus-visible:outline-none'
                  )}
                />
              </DialogClose>
            </>
          ) : (
            <>&nbsp;</>
          )}
        </DialogHeader>
      )}

      {/* Scrollable Content */}
      <div className={cn('flex-1', 'p-6', config?.dialogContentClassName)}>{config?.content}</div>
      {/* Error Display */}
      {config?.error && (
        <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-md border p-3 text-sm">
          {config.error}
        </div>
      )}

      {/* Footer */}
      {!config?.hideFooter &&
        (config?.footer || (
          <DialogFooter
            className={cn(
              'border-border-1',
              'border-t-[1px]',
              'px-6 pt-4 pb-[20px]',
              'flex-shrink-0'
            )}
          >
            {/* Left footer content */}
            {config?.leftFooterContent && <Flex flexGrow="1">{config.leftFooterContent}</Flex>}

            {/* Right side buttons */}
            <Flex
              direction={{ initial: 'column-reverse', sm: 'row' }}
              gap={{ initial: '2', sm: '2' }}
              flexGrow={'1'}
              justify={config?.footerFlexJustify || 'between'}
            >
              {config?.onCancel ? (
                <Button
                  onClick={onCancel}
                  disabled={config?.loading}
                  variant="secondary"
                  size={config?.cancelButtonSize || 'small'}
                  className={cn('mt-2 min-w-[130px] whitespace-nowrap sm:mt-0', config?.cancelButtonClassName)}
                >
                  {config?.cancelText || 'Cancel'}
                </Button>
              ) : (
                <>&nbsp;</>
              )}

              <Button
                onClick={onConfirm}
                disabled={config?.loading || config?.disableConfirm}
                variant="primary"
                size={config?.confirmButtonSize || 'small'}
                loading={config?.loading}
                className={cn('min-w-[130px] whitespace-nowrap', config?.confirmButtonClassName)}
              >
                {config?.confirmText || 'OK'}
              </Button>
            </Flex>
          </DialogFooter>
        ))}
    </div>
  )
}
