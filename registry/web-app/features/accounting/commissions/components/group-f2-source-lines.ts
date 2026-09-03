import type { LinkedExchangeRevenueLineF2_source } from '@/api/schema'

export type F2SourceSection<T> = {
  source: LinkedExchangeRevenueLineF2_source
  lines: T[]
}

/**
 * Groups revenue lines by their `f2_source` into fixed-order sections — one per entry
 * in `order`, emitted even when empty so every known source always gets its own table.
 *
 * `f2_source` is trusted to be a valid enum value (the backend's single source of truth);
 * lines are keyed directly by it, so this stays pure and trivially unit-testable. Human
 * labels are resolved by the caller via `useAppConstant`.
 */
export function groupLinesByF2Source<T extends { f2_source: LinkedExchangeRevenueLineF2_source }>(
  lines: T[],
  order: LinkedExchangeRevenueLineF2_source[]
): F2SourceSection<T>[] {
  const bySource = new Map<LinkedExchangeRevenueLineF2_source, T[]>()
  for (const line of lines) {
    const bucket = bySource.get(line.f2_source)
    if (bucket) bucket.push(line)
    else bySource.set(line.f2_source, [line])
  }

  return order.map((source) => ({
    source,
    lines: bySource.get(source) ?? [],
  }))
}
