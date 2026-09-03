/**
 * Normalises the body of `GET /linked-exchange-monthly-commissions/{id}/revenue-lines/`.
 *
 * The contract is split-brained and this module is where that is handled once, loudly:
 * the generated schema declares `PaginatedLinkedExchangeRevenueLineList`
 * (`{ count, next, previous, results }`), but the backend actually serves a **bare array**
 * (measured 2026-08-14 against period 07/2026, summary 33 — 4 lines, no `count`, no `next`).
 *
 * Why this matters enough to have its own module: the SLK monthly screen derives each
 * director pool's revenue by summing `slk_revenue` over these lines. A dropped line is not
 * a rendering glitch — it is a money figure that reads lower than reality with no error,
 * no empty state, and nothing on screen to hint at it. So an unrecognised body must fail
 * loudly rather than degrade into `[]`, and a truncated page must fail rather than be
 * summed as if it were the whole period.
 */

/** The paginated envelope the schema promises — kept minimal, only what we must inspect. */
type PaginatedEnvelope = {
  results: unknown[]
  next?: string | null
}

function isPaginatedEnvelope(payload: unknown): payload is PaginatedEnvelope {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    Array.isArray((payload as { results?: unknown }).results)
  )
}

/**
 * Returns every revenue line in the response, or throws.
 *
 * An empty period is legitimate and returns `[]`; only an unreadable body or a body we
 * can prove is incomplete throws.
 */
export function unwrapSlkRevenueLines<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]

  if (isPaginatedEnvelope(payload)) {
    if (payload.next) {
      throw new Error(
        'revenue-lines: the backend paginated the response and more pages remain. ' +
          'Summing only this page would understate every director pool — raise page_size ' +
          'or fetch the remaining pages before reading these lines.'
      )
    }
    return payload.results as T[]
  }

  throw new Error(
    `revenue-lines: unrecognised response body (${payload === null ? 'null' : typeof payload}). ` +
      'Refusing to report an empty period, which would silently zero out the SLK pools.'
  )
}
