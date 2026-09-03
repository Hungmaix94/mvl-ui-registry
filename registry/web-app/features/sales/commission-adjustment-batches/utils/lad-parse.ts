/**
 * BE serializes Decimal fields as strings (DRF default), so the preview `before`/`after` maps and
 * list aggregates mix numbers, decimal-strings ("6.00") and nulls — coerce defensively everywhere
 * a loosely-typed map value is read.
 */
export function toNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}
