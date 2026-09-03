/**
 * Reading the revenue behind one pool contribution.
 *
 * A source is a single row whose `Gốc tính` is this period's own revenue plus whatever a
 * settled period never recognised — so `Gốc tính × Tỷ lệ` is the amount beside it, and the
 * carried part is named period by period underneath.
 *
 * This replaces the old pair of rows (the period's own contribution plus a separate "bù kỳ
 * trước" line), where the second row's basis and rate described a different figure from the
 * amount in its own cell.
 */

// TODO(schema): drop this shim once BE deploy + `yarn api:update` ship revenue_breakdown on
// DepartmentCommissionContributionDetail.
export type CarriedRevenue = {
  /** BE period key, `"2026-07"`. */
  period: string
  /** Signed decimal-as-string: positive arrived late, negative was over-recognised. */
  amount: string
}

export type RevenueBreakdown = {
  own?: string | null
  carried?: CarriedRevenue[] | null
  total?: string | null
}

export function readRevenueBreakdown(detail: unknown): RevenueBreakdown | null {
  const breakdown = (detail as { revenue_breakdown?: RevenueBreakdown } | null | undefined)
    ?.revenue_breakdown
  return breakdown ?? null
}

/** `"2026-07"` (BE period key) -> `"07/2026"`. Not a date, so date-utils does not apply. */
export function formatPeriodKey(value: string): string {
  const [year, month] = value.split('-')
  return year && month ? `${month}/${year}` : value
}

export type RevenueLine = {
  /** Vietnamese label: "kỳ này" or "bù kỳ 07/2026". */
  label: string
  amount: number
}

/**
 * The lines to show under `Gốc tính`, or null when there is nothing to explain.
 *
 * Returns null when nothing was carried: a source whose basis is entirely its own period
 * needs no breakdown, and printing "kỳ này" alone would be noise on every row.
 */
export function revenueLines(detail: unknown): RevenueLine[] | null {
  const breakdown = readRevenueBreakdown(detail)
  if (!breakdown?.carried?.length) return null

  const own = Number(breakdown.own ?? 0)
  if (Number.isNaN(own)) return null

  const carried = breakdown.carried
    .map((entry) => ({
      label: `bù kỳ ${formatPeriodKey(entry.period)}`,
      amount: Number(entry.amount),
    }))
    .filter((line) => !Number.isNaN(line.amount))

  return [{ label: 'kỳ này', amount: own }, ...carried]
}
