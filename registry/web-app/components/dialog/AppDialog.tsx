import { Dialog, DialogContent } from '@/components/ui/dialog.tsx'
import { cn } from '@/lib/utils.ts'
import { ReactNode, useCallback, useEffect, useRef } from 'react'
import AppAlertDialog, { AppAlertDialogProps } from '@/components/dialog/AppAlertDialog.tsx'
import { AppDialogVariant } from '@/types/app-dialog.types.ts'
import { isDevelopment } from '@/config/environment.ts'
import AppFilterDialog, { AppFilterDialogProps } from '@/components/dialog/AppFilterDialog.tsx'
import AppCustomDialog, { AppCustomDialogConfig } from '@/components/dialog/AppCustomDialog.tsx'

// Lưu ý: `DialogContent` có `min-w-[732px]`, nên mọi nấc ≤ `2xl` (672px) đều ra đúng 732px. Muốn
// dialog rộng hơn thật sự thì phải dùng từ `3xl` trở lên.
const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'max-w-[95vw]',
} as const

export interface AppDialogBaseProps {
  variant: AppDialogVariant
  size?: keyof typeof SIZE_CLASSES

  // Controlled mode props (required)
  open: boolean
  onOpenChange: (open: boolean) => void

  disableBackdropClose?: boolean

  loading?: boolean

  error?: string

  title?: string | ReactNode
  titleDescription?: string | ReactNode

  content: string | ReactNode
  dialogContentClassName?: string
  dialogFormClassName?: string

  cancelText?: string
  onCancel: () => void

  disableConfirm?: boolean
  confirmText?: string
  onConfirm: () => void | Promise<void>
}

const AppDialog = (
  props: AppDialogBaseProps &
    (
      | ({ variant: 'alert' } & AppAlertDialogProps)
      | ({ variant: 'filter' } & AppFilterDialogProps)
      | ({ variant?: 'custom' } & AppCustomDialogConfig)
    )
) => {
  const loadingRef = useRef(props.loading)
  useEffect(() => {
    loadingRef.current = props.loading
  }, [props.loading])

  const closeDialog = useCallback(() => {
    props.onOpenChange(false)
  }, [props])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && props.disableBackdropClose) {
        return
      }
      props.onOpenChange(open)
    },
    [props.disableBackdropClose, props]
  )

  // When a combobox is open, pressing escape should close the combobox and not the dialog.
  const handleEscapeKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isCombobox = (event.target as HTMLElement)?.closest('[cmdk-root]')
      if (isCombobox) {
        return
      }

      if (props.disableBackdropClose) {
        event.preventDefault()
      }
    },
    [props.disableBackdropClose]
  )

  const handleInteractOutside = useCallback(
    (event: Event) => {
      if (props.disableBackdropClose) {
        event.preventDefault()
      }
    },
    [props.disableBackdropClose]
  )

  const handleConfirm = useCallback(async () => {
    try {
      await props.onConfirm?.()
    } catch (error: any) {
      // Silently handle validation errors (they're expected to prevent dialog closing)
      // Silently handle API errors (they're expected to prevent dialog closing after showing toast)
      if (error?.isValidationError || error?.isApiError) {
        return
      }

      if (isDevelopment()) {
        console.error('Dialog confirm error:', error)
      }
      return
    }

    if (!loadingRef.current) {
      closeDialog()
    }
  }, [closeDialog, props])

  const handleCancel = useCallback(() => {
    props.onCancel?.()
    closeDialog()
  }, [closeDialog, props])

  return (
    <>
      <Dialog open={props.open} onOpenChange={handleOpenChange}>
        <DialogContent
          aria-describedby={undefined}
          className={cn(
            'DialogContent',
            'z-50',
            `${SIZE_CLASSES[props.size || 'lg']}`,
            'bg-content-light-1 border-border-1 border shadow-lg sm:rounded-lg',
            'data-[state=open]:animate-in',
            'data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0',
            'data-[state=closed]:fade-out-0',
            'data-[state=open]:zoom-in-95',
            'data-[state=closed]:zoom-in-95',
            props.dialogContentClassName,
            props.dialogFormClassName
          )}
          onEscapeKeyDown={handleEscapeKeyDown}
          onInteractOutside={handleInteractOutside}
        >
          {props.variant === 'alert' && (
            <AppAlertDialog {...props} onConfirm={handleConfirm} onCancel={handleCancel} />
          )}
          {props.variant === 'filter' && (
            <AppFilterDialog {...props} onConfirm={handleConfirm} onCancel={handleCancel} />
          )}
          {props.variant === 'custom' && (
            <AppCustomDialog {...props} onConfirm={handleConfirm} onCancel={handleCancel} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AppDialog
