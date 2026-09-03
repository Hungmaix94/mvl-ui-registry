import { HTMLAttributes, ReactNode } from 'react'

// TODO: remove this type after migrating all dialogs to use AppDialogConfig
export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
// TODO: remove this type after migrating all dialogs to use AppDialogConfig
export type DialogVariant = 'alert' | 'confirm' | 'custom' | 'form' | 'filter'
// TODO: remove this type after migrating all dialogs to use AppDialogConfig
export type DialogConfig = {
  title?: ReactNode | string
  description?: string

  content?: ReactNode
  size?: DialogSize
  scrollable?: boolean
  maxHeight?: string
  dialogContentClassName?: string

  confirmText?: string
  confirmButtonSize?: 'small' | 'medium' | 'large'
  confirmButtonClassName?: HTMLAttributes<HTMLElement>['className']
  onConfirm?: () => void | Promise<void>
  disableConfirm?: boolean

  cancelText?: string
  cancelButtonSize?: 'small' | 'medium' | 'large'
  cancelButtonClassName?: HTMLAttributes<HTMLElement>['className']
  onCancel?: () => void

  footerFlexJustify?: 'start' | 'center' | 'end' | 'between'

  onClose?: () => void
  destroyOnClose?: boolean

  footer?: ReactNode
  leftFooterContent?: ReactNode
  hideFooter?: boolean

  disableBackdropClose?: boolean

  /**
   * Khi true, GlobalDialog KHÔNG tự gọi closeDialog() sau khi `onConfirm()` resolve.
   * Dialog hook phải tự quản lý đóng/mở (gọi `displayClose()` khi muốn).
   * Dùng cho multi-step dialog (ví dụ share → save → vẫn mở để copy link).
   */
  disableAutoCloseOnConfirm?: boolean

  loading?: boolean

  error?: string | null
}
