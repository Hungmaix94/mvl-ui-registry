import React from 'react'
import { toast, type ToastOptions } from 'react-toastify'
import { IconWarning, IconCheck } from '@/assets/icons'
import React__default from 'react'

export type ToastMessage = string | { title?: string; description?: string } | unknown

const STYLE: React__default.CSSProperties = {
  borderRadius: '4px',
  borderWidth: '1px',
  borderStyle: 'solid',

  fontFamily: 'var(--font-family-inter), serif',
  fontSize: 'var(--font-size-body-base-medium)',
  fontWeight: 'var(--font-weight-body-base-medium)',
  lineHeight: 'var(--line-height-body-base-medium)',

  padding: '20px',
  zIndex: 9999,
} as const

function toText(message: ToastMessage): string {
  if (typeof message === 'string') return message
  try {
    return JSON.stringify(message)
  } catch {
    return String(message)
  }
}

const createToastContent = (message: ToastMessage) => {
  return toText(message)
}

const showSuccess = (message: ToastMessage, options?: ToastOptions) => {
  const toastContent = createToastContent(message)
  return toast.success(toastContent, {
    icon: IconCheck,
    closeButton: false,
    style: {
      ...STYLE,
      borderColor: 'var(--color-data-green-default)',

      backgroundColor: 'var(--color-data-green-disabled)',
      color: 'var(--color-data-green-default)',
      zIndex: 10000,
    },
    // className: "rounded-[4px] border-data-red-default bg-data-red-disabled typo-body-base-medium text-data-red-default flex items-center gap-2 p-[20px]",

    ...options,
  })
}

const showError = (message: ToastMessage, options?: ToastOptions) => {
  const toastContent = createToastContent(message)
  return toast.error(toastContent, {
    icon: IconWarning,
    closeButton: false,
    style: {
      ...STYLE,
      borderColor: 'var(--color-data-red-default)',

      backgroundColor: 'var(--color-data-red-disabled)',
      color: 'var(--color-data-red-default)',
      zIndex: 10000,
    },
    className:
      'z-[10000] rounded-[4px] border-data-red-default bg-data-red-disabled typo-body-base-medium text-data-red-default flex items-center gap-2 p-[20px]',

    ...options,
  })
}

const show =
  (fn: (m: string | React.ReactNode, o?: ToastOptions) => any) =>
  (message: ToastMessage, options?: ToastOptions) => {
    const toastContent = createToastContent(message)
    return fn(toastContent, {
      ...options,
    })
  }

const showApiError = (error: any) => {
  if (error?.server?.type === 'validation_error' && Array.isArray(error?.server?.errors)) {
    error.server.errors.forEach((err: any, index: number) => {
      const errorMessage = err.detail || 'Có lỗi xảy ra'
      setTimeout(() => showError(errorMessage), 300 * index)
    })
  } else {
    showError(error?.message || 'Có lỗi xảy ra')
  }
}

const toastService = {
  success: showSuccess,
  error: showError,
  apiError: showApiError,
  info: show(toast.info),
  warning: show(toast.warn),
  promise: toast.promise,
}

export default toastService
