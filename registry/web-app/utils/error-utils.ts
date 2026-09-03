import type { components } from '@/api/schema'
import toastService from '@/services/toast-service'
import { UseFormSetError } from 'react-hook-form'

/** Backend emits the same blocker shape for every "cannot do this yet" refusal. */
export type ApiBlocker = components['schemas']['RevertBlocker']

interface ApiErrorDetail {
  code: string
  detail: string
  attr: string
}

interface ApiError {
  type: string
  errors: ApiErrorDetail[]
}

/**
 * Extract error message from API error
 *
 * Standard error structure from base-service.ts (throw response.error):
 * { success: false, error: { type: "validation_error", errors: [{ detail, attr, code }] } }
 */
export function extractErrorMessage(error: unknown, fallback = 'Có lỗi xảy ra'): string {
  if (!error) return fallback

  const err = error as any

  // PRIMARY: Check summary detail if string exists (e.g. "File nhập có 12 dòng lỗi.")
  if (err?.error?.detail && typeof err.error.detail === 'string') {
    return err.error.detail
  }

  if (err?.server?.detail && typeof err.server.detail === 'string') {
    return err.server.detail
  }

  // error.error structure with errors array (from base-service.ts or import endpoints)
  if (err?.error?.errors && Array.isArray(err.error.errors) && err.error.errors.length > 0) {
    const firstErr = err.error.errors[0]
    if (typeof firstErr === 'string') return firstErr
    if (firstErr?.detail && typeof firstErr.detail === 'string') return firstErr.detail
    if (firstErr?.error && typeof firstErr.error === 'string') return firstErr.error
  }

  // extractApiData throws with err.server = payload.error
  if (err?.server?.errors && Array.isArray(err.server.errors) && err.server.errors.length > 0) {
    const firstErr = err.server.errors[0]
    if (typeof firstErr === 'string') return firstErr
    if (firstErr?.detail && typeof firstErr.detail === 'string') return firstErr.detail
    if (firstErr?.error && typeof firstErr.error === 'string') return firstErr.error
  }

  // Flat client_error thrown directly (e.g. { detail, code } without wrapper)
  if (err?.detail && typeof err.detail === 'string') {
    return err.detail
  }

  // error.error.error (nested error object, e.g., { error: { error: "message" } })
  if (err?.error?.error && typeof err.error.error === 'string') {
    return err.error.error
  }

  // err.server.error (from extractApiData error structure)
  if (err?.server?.error && typeof err.server.error === 'string') {
    return err.server.error
  }

  // Handle non_field_errors (Django)
  if (err?.error?.non_field_errors && Array.isArray(err.error.non_field_errors)) {
    return err.error.non_field_errors[0]
  }
  if (err?.non_field_errors && Array.isArray(err.non_field_errors)) {
    return err.non_field_errors[0]
  }

  // Handle Django field-level validation errors: { error: { field_name: [messages] } }
  // Example: { error: { citizen_id: ["Nhân viên với số CMND/CCCD này đã tồn tại."] } }
  if (err?.error && typeof err.error === 'object' && !Array.isArray(err.error)) {
    const errorObj = err.error
    // Check if it's a field-level error object (not the standard errors array structure)
    const fieldKeys = Object.keys(errorObj)
    // If we have field names as keys and values are arrays of strings
    if (fieldKeys.length > 0) {
      const firstField = fieldKeys[0]
      const firstFieldErrors = errorObj[firstField]
      if (Array.isArray(firstFieldErrors) && firstFieldErrors.length > 0) {
        // Return first error message from first field
        return typeof firstFieldErrors[0] === 'string' ? firstFieldErrors[0] : fallback
      }
    }
  }

  // Fallback to message property
  return err?.message || err?.error?.message || fallback
}

/**
 * Find the detail message for a specific field-level validation error (attr), e.g. to
 * detect a soft-warning field (like `confirm_unpaid_reconciliation`) without swallowing
 * it into the generic first-error toast that `extractErrorMessage` returns.
 */
export function extractFieldErrorDetail(error: unknown, attr: string): string | undefined {
  if (!error) return undefined
  const err = error as any
  const errorsArrays = [err?.error?.errors, err?.server?.errors, err?.errors].filter(Array.isArray)
  for (const errors of errorsArrays) {
    const match = errors.find((e: any) => e?.attr === attr && typeof e?.detail === 'string')
    if (match) return match.detail
  }
  return undefined
}

/**
 * Structured refusals a 400 can carry instead of a single message: each blocker says what
 * is in the way (`title`/`detail`) and what to do about it (`remediation`).
 *
 * Used by the reconciliation revert flow (`code: "revert_blocked"`) and by hủy/hoàn cọc when
 * an output invoice stands in the way (`code: "invoice_blocked"`, bug 86expaf56). Toasting
 * only `detail` drops the invoice code and the remediation, which is exactly what the user
 * needs, so callers should render the list instead — see `BlockerList`.
 *
 * Two envelope shapes because `BaseApiService.withStatus()` throws the wrapped body while
 * `extractApiData` throws with the payload on `.server`.
 */
export function extractBlockers(error: unknown): ApiBlocker[] {
  const err = error as { error?: { blockers?: unknown }; server?: { blockers?: unknown } }
  const raw = err?.error?.blockers ?? err?.server?.blockers
  return Array.isArray(raw) ? (raw as ApiBlocker[]) : []
}

/**
 * Payload máy-đọc-được BE gắn kèm một refusal (`ConflictValidationError.extra`), ví dụ
 * cổng đề xuất hỗ trợ phí trả `{ code, blocking_proposals }`.
 *
 * `extra` không nằm trong schema sinh tự động (nó là túi tự do theo từng luật), nên
 * caller tự ép kiểu. Hai dạng envelope cùng lý do như `extractBlockers`.
 */
export function extractErrorExtra<T = Record<string, unknown>>(error: unknown): T | undefined {
  const err = error as { error?: { extra?: unknown }; server?: { extra?: unknown } }
  const raw = err?.error?.extra ?? err?.server?.extra
  return raw && typeof raw === 'object' ? (raw as T) : undefined
}

/**
 * Check if an error is a 404/not_found error from API
 * Handles multiple error structures:
 * - HTTP status 404
 * - API error with code "not_found"
 */
export function isNotFoundError(error: unknown): boolean {
  if (!error) return false

  const err = error as any

  // Check status code in any potential location
  const status =
    err.status ??
    err.response?.status ??
    err.server?.status ??
    err.error?.status ??
    err.response?.data?.error?.status

  if (status === 404) return true

  // Check error type/code
  if (
    err.type === 'not_found' ||
    err.server?.type === 'not_found' ||
    err.error?.type === 'not_found'
  ) {
    return true
  }

  // Check errors array in error or nested properties
  const errors =
    err.errors ?? err.server?.errors ?? err.error?.errors ?? err.response?.data?.error?.errors

  if (Array.isArray(errors) && errors.some((e: any) => e?.code === 'not_found')) {
    return true
  }

  // Fallback to detail message check
  const detail =
    err.detail ?? err.server?.detail ?? err.error?.detail ?? err.response?.data?.error?.detail

  if (typeof detail === 'string' && detail.toLowerCase().includes('not found')) {
    return true
  }

  return false
}

/**
 * Check if an error is a 409/conflict error from the API.
 * Status is attached to the thrown error by BaseApiService.withStatus().
 */
export function isConflictError(error: unknown): boolean {
  if (!error) return false
  const errorStatus = (error as { status?: number })?.status
  const errorResponse = (error as { response?: { status?: number } })?.response?.status
  return errorStatus === 409 || errorResponse === 409
}

/**
 * Locate the DOM element that renders a form field by attribute name, using the
 * same selectors as the scroll-to-error logic below. Returns null when no field
 * renders this attr.
 *
 * Used to decide whether a `setError(attr, ...)` call would actually be visible:
 * server-only attrs (e.g. `created_by`, `non_field_errors`) have no rendered
 * field, so their error must be surfaced via toast instead of being swallowed
 * silently into React Hook Form state.
 */
const isFieldRendered = (attr: string): boolean => {
  const selectors = [
    `[name="${attr}"]`,
    `[data-field-name="${attr}"]`,
    `[data-field="${attr}"]`,
    `[id="${attr}"]`,
  ]
  return selectors.some((selector) => {
    try {
      return document.querySelector(selector) !== null
    } catch {
      // attr chứa ký tự không hợp lệ cho CSS selector → coi như không có field render (→ toast).
      return false
    }
  })
}

/**
 * DRF trả lỗi của một dòng trong mảng dưới dạng `sales_staff[0].exchange_id`,
 * còn react-hook-form đọc lỗi ở `sales_staff.0.exchange` (tên field khác nhau
 * theo module: deposit dùng `exchange`, booking dùng `exchange_id`). Vì
 * `fieldMap` là bảng phẳng nên không diễn tả được chỉ số dòng — caller khai báo
 * theo template `sales_staff[].exchange_id` và dùng `{index}` ở vế phải:
 *
 *   { 'sales_staff[].exchange_id': 'sales_staff.{index}.exchange' }
 *
 * Không khớp template nào thì trả null và attr đi tiếp theo luồng cũ (toast),
 * tức là không nuốt lỗi.
 */
const resolveIndexedAttr = (attr: string, fieldMap?: Record<string, string>): string | null => {
  if (!fieldMap) return null
  const match = attr.match(/^([A-Za-z0-9_]+)\[(\d+)\]\.(.+)$/)
  if (!match) return null
  const [, arrayName, index, rest] = match
  const mapped = fieldMap[`${arrayName}[].${rest}`]
  if (!mapped) return null
  return mapped.replace('{index}', index)
}

export const handleApiError = (
  error: unknown,
  setError?: UseFormSetError<any>,
  fieldMap?: Record<string, string>
): void => {
  const err = error as any

  // Extract error object - standard structure from base-service.ts
  let errorObj: ApiError | null = null

  // Primary: error.error (from throw response.error in base-service.ts)
  if (err?.error?.type === 'validation_error' || err?.error?.type === 'client_error') {
    errorObj = err.error as ApiError
  }
  // extractApiData: validation payload is attached to err.server (see response-handler.ts)
  else if (err?.server?.type === 'validation_error' || err?.server?.type === 'client_error') {
    errorObj = err.server as ApiError
  }
  // Fallback: error directly is the error object
  else if (err?.type === 'validation_error' || err?.type === 'client_error') {
    errorObj = err as ApiError
  }

  // Process validation errors
  if (errorObj && errorObj.errors && Array.isArray(errorObj.errors)) {
    const hasSetErrors = errorObj.errors.some((err) => err.attr && err.detail)
    // If we have setError and errors with attr/detail, set form errors
    if (setError && hasSetErrors) {
      let firstErrorAttr: string | null = null

      errorObj.errors.forEach((err) => {
        if (err.attr && err.detail) {
          if (fieldMap) {
            // `sales_staff[0].exchange_id` → `sales_staff.0.exchange` khi caller khai báo
            // template; không khớp thì tra thẳng bảng phẳng như cũ.
            const mapped = resolveIndexedAttr(err.attr, fieldMap) ?? fieldMap[err.attr]
            if (mapped) {
              // Attr được remap sang tên field khác của form (vd files.attachments → attachment_tokens).
              setError(mapped, { type: err.code, message: err.detail })
              if (!firstErrorAttr) {
                firstErrorAttr = mapped
              }
            } else if (isFieldRendered(err.attr)) {
              // Attr không nằm trong map NHƯNG là field đang render → hiển thị lỗi inline thay vì
              // toast. `fieldMap` là bảng override tên field, không phải whitelist field được set lỗi.
              setError(err.attr, { type: err.code, message: err.detail })
              if (!firstErrorAttr) {
                firstErrorAttr = err.attr
              }
            } else {
              // Attr chỉ tồn tại phía server (không render field) → toast để không nuốt lỗi.
              toastService.error(err.detail)
            }
          } else {
            setError(err.attr, { type: err.code, message: err.detail })
            // Server-only attrs (e.g. created_by) have no rendered field → the
            // inline error is invisible; surface it as a toast so it isn't swallowed.
            if (isFieldRendered(err.attr)) {
              if (!firstErrorAttr) {
                firstErrorAttr = err.attr
              }
            } else {
              toastService.error(err.detail)
            }
          }
        } else if (err.detail) {
          toastService.error(err.detail)
        }
      })

      // Scroll to first error field
      if (firstErrorAttr) {
        setTimeout(() => {
          // Try multiple selectors to find the field
          const selectors = [
            `[name="${firstErrorAttr}"]`, // Standard input fields
            `[data-field-name="${firstErrorAttr}"]`, // FormController container
            `[data-field="${firstErrorAttr}"]`, // Custom data attribute
            `[id*="${firstErrorAttr}"]`, // ID containing field name
          ]

          let fieldElement: Element | null = null
          for (const selector of selectors) {
            fieldElement = document.querySelector(selector)
            if (fieldElement) {
              break
            }
          }

          if (fieldElement) {
            fieldElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            })

            // Focus the field after scroll completes
            setTimeout(() => {
              // If it's a container (data-field-name), find focusable element inside
              if (fieldElement?.hasAttribute('data-field-name')) {
                const focusable = fieldElement.querySelector(
                  'input:not([disabled]), button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                ) as HTMLElement
                if (focusable) {
                  focusable.focus()
                }
              } else if (fieldElement instanceof HTMLElement) {
                // Direct focus for standard input fields
                if (fieldElement.tagName === 'BUTTON') {
                  fieldElement.click()
                } else {
                  fieldElement.focus()
                }
              }
            }, 300)
          }
        }, 100)
      }
    } else {
      // Otherwise, show toast for each error
      errorObj.errors.forEach((err) => {
        if (err.detail) {
          toastService.error(err.detail)
        }
      })
    }
  } else {
    // Handle Django field-level validation errors: { field_name: [messages] }
    // Example: { old_password: ["Mật khẩu hiện tại không đúng."] }
    // This structure comes directly from response.error when API returns field-level errors
    const djangoFieldErrors = err?.error || err
    if (
      djangoFieldErrors &&
      typeof djangoFieldErrors === 'object' &&
      !Array.isArray(djangoFieldErrors) &&
      !djangoFieldErrors.type &&
      !djangoFieldErrors.errors
    ) {
      const fieldKeys = Object.keys(djangoFieldErrors)
      // Check if it's a Django field-level error object (keys are field names, values are arrays of strings)
      if (fieldKeys.length > 0) {
        const firstField = fieldKeys[0]
        const firstFieldErrors = djangoFieldErrors[firstField]
        if (Array.isArray(firstFieldErrors) && firstFieldErrors.length > 0) {
          // If we have setError, set form errors for each field
          if (setError) {
            let firstErrorAttr: string | null = null

            fieldKeys.forEach((fieldName) => {
              const fieldErrors = djangoFieldErrors[fieldName]
              if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
                const errorMessage =
                  typeof fieldErrors[0] === 'string' ? fieldErrors[0] : String(fieldErrors[0])
                if (fieldMap) {
                  const mapped = fieldMap[fieldName]
                  if (mapped) {
                    setError(mapped, { type: 'validation', message: errorMessage })
                    if (!firstErrorAttr) {
                      firstErrorAttr = mapped
                    }
                  } else if (isFieldRendered(fieldName)) {
                    // Field không có trong map nhưng đang render → inline (không phải whitelist).
                    setError(fieldName, { type: 'validation', message: errorMessage })
                    if (!firstErrorAttr) {
                      firstErrorAttr = fieldName
                    }
                  } else {
                    toastService.error(errorMessage)
                  }
                } else {
                  setError(fieldName, { type: 'validation', message: errorMessage })
                  // Surface as toast when no field renders this attr (see isFieldRendered).
                  if (isFieldRendered(fieldName)) {
                    if (!firstErrorAttr) {
                      firstErrorAttr = fieldName
                    }
                  } else {
                    toastService.error(errorMessage)
                  }
                }
              }
            })

            // Scroll to first error field
            if (firstErrorAttr) {
              setTimeout(() => {
                const selectors = [
                  `[name="${firstErrorAttr}"]`,
                  `[data-field-name="${firstErrorAttr}"]`,
                  `[data-field="${firstErrorAttr}"]`,
                  `[id*="${firstErrorAttr}"]`,
                ]

                let fieldElement: Element | null = null
                for (const selector of selectors) {
                  fieldElement = document.querySelector(selector)
                  if (fieldElement) {
                    break
                  }
                }

                if (fieldElement) {
                  fieldElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest',
                  })

                  setTimeout(() => {
                    if (fieldElement?.hasAttribute('data-field-name')) {
                      const focusable = fieldElement.querySelector(
                        'input:not([disabled]), button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                      ) as HTMLElement
                      if (focusable) {
                        focusable.focus()
                      }
                    } else if (fieldElement instanceof HTMLElement) {
                      if (fieldElement.tagName === 'BUTTON') {
                        fieldElement.click()
                      } else {
                        fieldElement.focus()
                      }
                    }
                  }, 300)
                }
              }, 100)
            }
          } else {
            // No setError, show toast for first error
            const errorMessage =
              typeof firstFieldErrors[0] === 'string'
                ? firstFieldErrors[0]
                : String(firstFieldErrors[0])
            toastService.error(errorMessage)
          }
          return
        }
      }
    }

    // Fallback: surface server-provided message (e.g. { error: { detail, code } } from
    // client_error responses like "evaluation_already_exists") before the generic text
    toastService.error(extractErrorMessage(error, 'Có lỗi xảy ra, vui lòng thử lại sau.'))
  }
}
