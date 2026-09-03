import toastService from '@/services/toast-service'

// TODO: replace with generated schema types after api:update:local sync — the committed
// schema does not yet declare `warnings` on the reconciliation confirm/approve responses.
// Known codes: `prepaid_bonus_pending_declaration`, `investor_bonus_residual_outstanding`
// (the latter also carries `advances: [{advance_id, advance_code, recipient_line_id, amount}]`).
export type ReconciliationWarning = {
  code: string
  detail?: string
}

function isReconciliationWarning(value: unknown): value is ReconciliationWarning {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { code?: unknown }).code === 'string'
  )
}

/**
 * Safely narrow the `warnings` array out of a confirm/approve mutation result.
 * The committed schema does not type this field yet, so callers pass the raw result.
 */
export function extractReconciliationWarnings(result: unknown): ReconciliationWarning[] {
  if (typeof result !== 'object' || result === null) return []
  const warnings = (result as { warnings?: unknown }).warnings
  if (!Array.isArray(warnings)) return []
  return warnings.filter(isReconciliationWarning)
}

/**
 * Shows one warning toast per warning item returned by a reconciliation
 * confirm/approve response — the BE `detail` text verbatim, falling back to `code`.
 */
export function showReconciliationWarnings(result: unknown): void {
  extractReconciliationWarnings(result).forEach((warning, index) => {
    const message = warning.detail || warning.code
    // Stagger stacked toasts so they stay readable (same as toastService.apiError).
    setTimeout(() => toastService.warning(message), 300 * index)
  })
}
