import { extractErrorMessage } from '@/utils/error-utils.ts'

/**
 * The create dialog posts one collaborator-contract per split row, not one request
 * carrying a nested array — so a rejected request never comes back with a row index
 * attached, and there is no form field to route a `setError` onto. This turns the
 * settled results of those requests into one deduped, row-labelled message per
 * distinct failure, so every failing row is reported instead of only the first one
 * `Promise.all` used to surface (ClickUp 86eyc1z4v).
 */
export function collectSplitCreateFailureMessages(
  settled: PromiseSettledResult<unknown>[]
): string[] {
  const failures = settled
    .map((outcome, index) => ({ outcome, index }))
    .filter(
      (item): item is { outcome: PromiseRejectedResult; index: number } =>
        item.outcome.status === 'rejected'
    )

  const seen = new Set<string>()
  const messages: string[] = []
  failures.forEach(({ outcome, index }) => {
    const detail = extractErrorMessage(outcome.reason, 'Có lỗi xảy ra, vui lòng thử lại sau.')
    const message = failures.length > 1 ? `Dòng ${index + 1}: ${detail}` : detail
    if (!seen.has(message)) {
      seen.add(message)
      messages.push(message)
    }
  })
  return messages
}

/** First rejected result's reason, to keep rethrowing the original failure after reporting it. */
export function firstSplitCreateFailureReason(settled: PromiseSettledResult<unknown>[]): unknown {
  const rejected = settled.find(
    (outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected'
  )
  return rejected?.reason
}

/**
 * Flatten react-hook-form's error tree into user-facing lines, so a failed client-side
 * validation can be *reported* instead of only recorded (ClickUp 86eypf62k: clicking
 * "Xác nhận" on an incomplete form fired no request and printed nothing, because every
 * error lived under `splits[i].*` — cells that render no message — and the rejection the
 * form threw was dropped by the dialog's confirm button).
 *
 * Row-level messages get the same "Dòng N: …" prefix the API-failure toasts use, so both
 * kinds of failure read the same way to the user.
 */
export function collectValidationMessages(errors: unknown): string[] {
  const seen = new Set<string>()
  const messages: string[] = []

  const push = (message: unknown) => {
    if (typeof message !== 'string') return
    const trimmed = message.trim()
    if (!trimmed || seen.has(trimmed)) return
    seen.add(trimmed)
    messages.push(trimmed)
  }

  const tree = (errors ?? {}) as Record<string, { message?: unknown; root?: { message?: unknown } }>

  Object.entries(tree).forEach(([field, fieldError]) => {
    if (field === 'splits') return
    push(fieldError?.message)
  })

  const splits = tree.splits as unknown
  if (Array.isArray(splits)) {
    splits.forEach((rowError, index) => {
      if (!rowError) return
      Object.values(rowError as Record<string, { message?: unknown }>).forEach((cellError) => {
        const message = cellError?.message
        if (typeof message === 'string' && message.trim()) {
          push(`Dòng ${index + 1}: ${message.trim()}`)
        }
      })
    })
    return messages
  }

  // Array-level issue (vd `min(1)`): RHF treats it as a single node, not a per-row list.
  push(tree.splits?.message ?? tree.splits?.root?.message)
  return messages
}
