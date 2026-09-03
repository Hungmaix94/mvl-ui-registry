import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { extractErrorMessage } from '@/utils/error-utils'

/**
 * True when the API refused with a rule that belongs to no form field.
 *
 * Business gates (stale voucher, locked split, reconciliation mismatch) come back as
 * `non_field_errors`, so `handleApiError` can only toast them — which is not enough for a
 * message telling the accountant which step to do first.
 */
export function isNonFieldError(error: unknown): boolean {
  const err = error as {
    error?: { non_field_errors?: unknown[]; errors?: Array<{ attr?: string }> }
    non_field_errors?: unknown[]
  }
  if (Array.isArray(err?.error?.non_field_errors) || Array.isArray(err?.non_field_errors)) {
    return true
  }
  return (err?.error?.errors ?? []).some((entry) => entry?.attr === 'non_field_errors')
}

/**
 * True when `approve` refused because a tranche took in fee cash and distributed none of it.
 *
 * That is the stale-dial symptom: the period target was pinned before this receipt existed,
 * so the newcomer is sized to 0 and approving would freeze that 0 into payables. Detected on
 * the `allow_unallocated` marker the backend puts in its message, which is also the flag that
 * overrides it — so the check and the fix can never drift apart.
 */
export function isUnallocatedTrancheError(error: unknown): boolean {
  return extractErrorMessage(error).includes('allow_unallocated')
}

/**
 * Show a business rule that BLOCKED an action, as a dialog the user must acknowledge.
 *
 * Money-moving steps (draft a voucher, post it, move a progress dial) hold a snapshot of
 * an earlier step. When that earlier step has changed, the backend refuses and returns a
 * message saying what to do instead — cancel the draft, re-verify the invoice, and so on.
 * A toast fades before that can be read, so these get a dialog: the user has to see why
 * the step stopped and which action comes first.
 */
export function useBlockedActionDialog() {
  const { alert, displayClose } = useDialog()

  const showBlocked = useCallback(
    (error: unknown, options?: { title?: string; hint?: string }) => {
      const message = extractErrorMessage(error)
      alert({
        title: options?.title ?? 'Không thể tiếp tục',
        content: (
          <div className="flex flex-col gap-3 py-1">
            <p className="text-content-dark-1 text-sm">{message}</p>
            {options?.hint && <p className="text-content-dark-3 text-xs">{options.hint}</p>}
          </div>
        ),
        confirmText: 'Đã hiểu',
        onConfirm: () => displayClose(),
      })
    },
    [alert, displayClose]
  )

  return { showBlocked }
}
