import { formatCurrencyVND, formatNumber } from '@/utils'

/**
 * Shared colored-delta presentation for the LAD detail view (config snapshot + impact tables).
 * Convention: positive Δ = green, negative Δ = red, zero / unchanged = neutral grey.
 */
export function deltaClass(v: number): string {
  if (v > 0) return 'text-data-green-default'
  if (v < 0) return 'text-data-red-default'
  return 'text-content-dark-3'
}

interface DeltaProps {
  value: number | null | undefined
  className?: string
}

/** Money delta in VND, e.g. "+10.000.000 đ" / "-35.000.000 đ". Null → "—". */
export function DeltaMoney({ value, className }: DeltaProps) {
  if (value == null) return <span className="text-content-dark-3">—</span>
  const sign = value > 0 ? '+' : ''
  return (
    <span className={`font-semibold ${deltaClass(value)} ${className ?? ''}`}>
      {`${sign}${formatCurrencyVND(value)} đ`}
    </span>
  )
}

/** Percentage-point delta, e.g. "-1.00 pp". Null → "—". */
export function DeltaPp({ value, className }: DeltaProps) {
  if (value == null) return <span className="text-content-dark-3">—</span>
  const sign = value > 0 ? '+' : ''
  return (
    <span className={`font-semibold ${deltaClass(value)} ${className ?? ''}`}>
      {`${sign}${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pp`}
    </span>
  )
}
