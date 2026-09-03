export type PricingSourceData = {
  investor_reconciled?: {
    latest_ref_code?: string | null
    pct_agency_fee?: string | number | null
    amt_agency_fee?: string | number | null
    agency_fee_amount?: string | number | null
    bonus?: string | number | null
    amt_extra_bonus?: string | number | null
    deduction?: string | number | null
    total_fee_deduction?: string | number | null
    total_amount?: string | number | null
  } | null
  mv_config?: Record<string, any> | null
  amt_agency_fee?: string | number | null
  agency_fee_amount?: string | number | null
  amt_extra_bonus?: string | number | null
  amt_investor_bonus?: string | number | null
  total_fee_deduction?: string | number | null
  total_amount?: string | number | null
}

export type ResolvedInvestorAmounts = {
  hasReconciliation: boolean
  bonus: number
  deduction: number
  agencyFee: number
  totalAmount: number
}

/**
 * First candidate that is actually present wins — an explicit `0` is a real value and
 * must not fall through to the next fallback. Non-numeric payloads resolve to 0 so a
 * malformed field can never leak `NaN` into a money total.
 */
function firstAmount(...candidates: (string | number | null | undefined)[]): number {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === '') continue
    const num = parseFloat(String(candidate))
    return Number.isFinite(num) ? num : 0
  }
  return 0
}

export function resolveInvestorBonusAndDeduction(
  pricing?: PricingSourceData | null
): ResolvedInvestorAmounts {
  const reconciled = pricing?.investor_reconciled
  const hasReconciliation = Boolean(reconciled?.latest_ref_code)

  if (hasReconciliation && reconciled) {
    return {
      hasReconciliation: true,
      bonus: firstAmount(reconciled.bonus, reconciled.amt_extra_bonus),
      deduction: firstAmount(reconciled.deduction, reconciled.total_fee_deduction),
      agencyFee: firstAmount(reconciled.agency_fee_amount, reconciled.amt_agency_fee),
      totalAmount: firstAmount(reconciled.total_amount),
    }
  }

  const mvConfig = pricing?.mv_config
  return {
    hasReconciliation: false,
    bonus: firstAmount(
      pricing?.amt_investor_bonus,
      pricing?.amt_extra_bonus,
      mvConfig?.amt_extra_bonus,
      mvConfig?.amt_investor_bonus
    ),
    deduction: firstAmount(pricing?.total_fee_deduction, mvConfig?.total_fee_deduction),
    agencyFee: firstAmount(
      pricing?.agency_fee_amount,
      pricing?.amt_agency_fee,
      mvConfig?.agency_fee_amount
    ),
    totalAmount: firstAmount(pricing?.total_amount, mvConfig?.total_amount),
  }
}
