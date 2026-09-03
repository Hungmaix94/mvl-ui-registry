import type { ReconMvReference } from './useReconMvReference'

/**
 * Empty MV (hệ thống) reference — every field null, not loading. Lives in a service-free module so
 * pure aggregators (sheet totals, summary stats, settlement) can use it as the per-căn fallback
 * WITHOUT importing `useReconMvReference` (its deal-service import pulls a runtime service chain).
 * `useReconMvReference` re-exports this as `EMPTY_REFERENCE`.
 */
export const EMPTY_MV_REFERENCE: ReconMvReference = {
  listedPrice: null,
  feeCalculationPrice: null,
  pctAgencyFee: null,
  amtAgencyFee: null,
  agencyFeeSpec: null,
  baseAgencyFeeRate: null,
  baseAmtAgencyFee: null,
  isAgencyFeeIncludeVat: null,
  pctInvestorBonus: null,
  amtInvestorBonus: null,
  isInvestorBonusIncludeVat: null,
  amtSharedBonus: null,
  pctSharedBonus: null,
  isSharedBonusIncludeVat: null,
  priorReceivedTotal: null,
  deductAgreed: null,
  isLoading: false,
}
