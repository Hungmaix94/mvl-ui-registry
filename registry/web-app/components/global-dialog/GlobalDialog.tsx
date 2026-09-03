import { Dialog, DialogContent } from '@/components/ui/dialog.tsx'

import { cn } from '@/lib/utils.ts'
import { useDialogStore } from '@/store/dialog-store.ts'
import { useCallback } from 'react'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { DefaultDialog } from './DefaultDialog.tsx'

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-[95vw]',
} as const

export default function GlobalDialog() {
  const { isOpen, variant, config, closeDialog } = useDialogStore()

  const handleOpenChange = (open: boolean) => {
    if (!open && !config?.disableBackdropClose) {
      closeDialog()
    }
  }

  const handleEscapeKeyDown = (event: KeyboardEvent) => {
    // When a combobox is open, pressing escape should close the combobox and not the dialog.
    const target = event.target as HTMLElement
    const isCombobox = target.closest('[cmdk-root]')
    if (isCombobox) {
      return
    }

    if (config?.disableBackdropClose) {
      event.preventDefault()
    }
  }

  const handleInteractOutside = (event: Event) => {
    if (config?.disableBackdropClose) {
      event.preventDefault()
    }
  }

  const handleConfirm = useCallback(async () => {
    if (config?.onConfirm) {
      try {
        await config?.onConfirm()
        // todo: handle update url based on current filter if variant is 'filter'
      } catch (error: any) {
        // Silently handle validation errors (they're expected to prevent dialog closing)
        if (error?.isValidationError) {
          return
        }
        // Silently handle API errors (they're expected to prevent dialog closing after showing toast)
        if (error?.isApiError) {
          return
        }
        console.error('Dialog confirm error:', error)
        return
      }
    }
    // Dialog hook tự quản lý đóng/mở (ví dụ share dialog multi-step) — skip auto-close.
    if (config?.disableAutoCloseOnConfirm) {
      return
    }
    if (!config?.loading) {
      closeDialog()
    }
  }, [config, closeDialog])

  const handleCancel = useCallback(() => {
    config?.onCancel?.()
    closeDialog()
  }, [config, closeDialog])

  // Size mapping
  const size = config?.size || 'md'

  return (
    <div className={'bg-red-80 flex items-center justify-center'}>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            'DialogContent',
            'z-50',
            'flex flex-col',
            'w-full min-w-[732px]',
            SIZE_CLASSES[size],
            'bg-background-1 border-border-1 border shadow-lg sm:rounded-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-in-95',
            // 'data-[state=open]:slide-in-from-left-1/2 data-[state=closed]:slide-out-to-left-1/2',
            // 'data-[state=open]:slide-in-from-top-1/2 data-[state=closed]:slide-out-to-top-1/2',
            config?.dialogContentClassName
          )}
          onEscapeKeyDown={handleEscapeKeyDown}
          onInteractOutside={handleInteractOutside}
          aria-describedby={config?.description}
        >
          {config && variant === 'confirm' ? (
            <ConfirmDialog config={config} onConfirm={handleConfirm} onCancel={handleCancel} />
          ) : config ? (
            <DefaultDialog config={config} onConfirm={handleConfirm} onCancel={handleCancel} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
