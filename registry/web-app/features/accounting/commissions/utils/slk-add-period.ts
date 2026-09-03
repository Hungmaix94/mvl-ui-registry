/**
 * "Thêm kỳ" button state on the SLK monthly screen's empty state.
 *
 * A period's statement is NOT created by opening the screen: it only exists after
 * `POST .../linked-exchange-monthly-commissions/compute/` runs (manually, or via the
 * celery-beat job on the 1st of each month). Until then the screen shows its empty
 * state and `CommSlkMonthlyDetail` — which holds the only other compute button — never
 * renders, so the accountant has no way in. This button closes that gap.
 */
export type SlkAddPeriodState = {
  /** Render the button at all (hidden, not disabled — a button that always 403s is worse). */
  visible: boolean
  /** Rendered but not clickable yet (period existence still being checked). */
  disabled: boolean
}

export type SlkAddPeriodInput = {
  /** Holds `linkedexchangemonthlycommission.compute` (or is a superuser). */
  canCompute: boolean
  /** Period currently applied on the list filter (from the URL). */
  month: number | null | undefined
  year: number | null | undefined
  /** The existence probe is still in flight. */
  isProbing: boolean
  /** The filtered period already has a statement row. */
  periodExists: boolean
}

/**
 * Hidden when the user cannot compute, when no period is applied yet, or when the
 * period already exists — recomputing an existing statement belongs on its detail
 * screen, which knows the status (compute is refused once REVIEWED/POSTED).
 */
export function resolveSlkAddPeriodState({
  canCompute,
  month,
  year,
  isProbing,
  periodExists,
}: SlkAddPeriodInput): SlkAddPeriodState {
  if (!canCompute || !month || !year || periodExists) {
    return { visible: false, disabled: false }
  }
  return { visible: true, disabled: isProbing }
}

/** `7`, `2026` → `07/2026`. */
export function formatSlkPeriodLabel(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${year}`
}
