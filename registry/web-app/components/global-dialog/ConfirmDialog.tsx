import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { cn } from '@/lib/utils'
import { DialogConfig } from '@/types'

interface ConfirmDialogProps {
  config: DialogConfig
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ config, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto')}>
      <DialogHeader className={cn('px-6 pt-20', 'text-center')}>
        {config?.title ? (
          typeof config.title === 'string' ? (
            <DialogTitle className={'typo-h4 text-content-dark-1'}>{config.title}</DialogTitle>
          ) : (
            config.title
          )
        ) : null}

        {typeof config?.content === 'string' ? (
          <DialogDescription className={cn('typo-body-lg-regular text-content-dark-2')}>
            {config.content}
          </DialogDescription>
        ) : (
          <div className="w-full">{config?.content}</div>
        )}
      </DialogHeader>

      <DialogFooter className={cn('px-6 pb-20', 'text-center', 'mt-9')}>
        <Flex align={'center'} justify={'center'} gap={'4'}>
          <Button
            variant={'secondary'}
            onClick={onCancel}
            size={'large'}
            className={cn('min-w-[150px] whitespace-nowrap')}
            disabled={config?.loading}
          >
            {config?.cancelText || 'Huỷ'}
          </Button>
          <Button
            variant={'primary'}
            onClick={onConfirm}
            size={'large'}
            className={cn('min-w-[150px] whitespace-nowrap')}
            loading={config?.loading}
            disabled={config?.loading}
          >
            {config?.confirmText || 'Xoá'}
          </Button>
        </Flex>
      </DialogFooter>
    </div>
  )
}
