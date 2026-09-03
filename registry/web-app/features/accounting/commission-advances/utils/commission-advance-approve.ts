import type { components } from '@/api/schema'

type ApprovedAmountItem = components['schemas']['_ApprovedAmountItemRequest']

// One editable row in the approve dialog. `approved_amount` is the number the approver
// typed for that recipient line (defaults to the requested amount).
export type ApproveLineDraft = {
  id: number
  approved_amount: number
}

// Map the amounts an approver confirmed into the `approved_amounts` payload the
// `approve` / `admin-lead-approve` endpoints accept. The typed value is stored by BE as the
// per-recipient `approved_amount`, leaving the original `requested_amount` untouched — which is
// exactly what backend PR #2724 added the field for. Returns [] when there are no lines, so the
// caller can send an empty approve body (approve without revising amounts).
export function buildApprovedAmounts(lines: ApproveLineDraft[]): ApprovedAmountItem[] {
  return lines.map((line) => ({
    recipient_line_id: line.id,
    approved_amount: String(line.approved_amount),
  }))
}

// BE validates every approved amount as `0 < approved <= requested` and 400s otherwise. Mirror
// that here to surface a friendly message before hitting the API. `requestedById` maps a
// recipient-line id to its original requested amount. Returns the first offending line, or
// undefined when every line is valid.
export function findInvalidApprovedAmount(
  lines: ApproveLineDraft[],
  requestedById: Map<number, number>
): ApproveLineDraft | undefined {
  return lines.find((line) => {
    const requested = requestedById.get(line.id) ?? 0
    return line.approved_amount <= 0 || line.approved_amount > requested
  })
}
