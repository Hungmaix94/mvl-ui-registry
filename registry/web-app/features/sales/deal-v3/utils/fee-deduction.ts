import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

const COMMISSION_PCT_TYPES = APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES

export type FeeDeductionSource =
  | {
      amount?: string | number | null
      percentage?: string | number | null
    }
  | null
  | undefined

export type FeeDeductionCell = {
  /** Absolute money magnitude to render after the leading minus sign. */
  amountMagnitude: number
  /** Positive percentage to show in parentheses, or null when absent / not positive. */
  pct: number | null
  /** True when the cell carries anything worth rendering (amount ≠ 0 or a positive pct). */
  hasValue: boolean
}

// Reconciliation fee-deduction cell. The backend now sends the amount as a signed-NEGATIVE
// CommissionShare cell keyed by recipient side, with the legacy `matchedRow.deduction` object as
// fallback. Resolve to a render-ready magnitude + a sign-agnostic `hasValue` so the cell shows
// correctly regardless of the amount's sign (a negative amount must still count as "has value").
export function resolveFeeDeductionCell(
  signedCell: FeeDeductionSource,
  legacyCell: FeeDeductionSource
): FeeDeductionCell {
  const rawAmount = signedCell?.amount ?? legacyCell?.amount ?? 0
  const parsedAmount = Number(rawAmount)
  const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0

  const rawPct = signedCell?.percentage ?? legacyCell?.percentage
  const parsedPct = rawPct == null ? Number.NaN : Number(rawPct)
  const pct = Number.isFinite(parsedPct) && parsedPct > 0 ? parsedPct : null

  return {
    amountMagnitude: Math.abs(amount),
    pct,
    hasValue: amount !== 0 || pct != null,
  }
}

type FeeDeductionRow =
  | {
      commissions?: Record<string, FeeDeductionSource> | null
      deduction?: FeeDeductionSource
    }
  | null
  | undefined

// Pick the signed fee-deduction cell for the recipient side (F2 vs sale/F1) and resolve it,
// falling back to the legacy `deduction` object.
export function getFeeDeductionCell(row: FeeDeductionRow, isF2: boolean): FeeDeductionCell {
  const key = isF2
    ? COMMISSION_PCT_TYPES.F2_FEE_DEDUCTION.pct
    : COMMISSION_PCT_TYPES.F1_FEE_DEDUCTION.pct
  return resolveFeeDeductionCell(row?.commissions?.[key], row?.deduction)
}
