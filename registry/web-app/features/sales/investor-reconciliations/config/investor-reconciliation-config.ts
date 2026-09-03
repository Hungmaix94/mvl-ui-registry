import {
  INVESTOR_RECON_KIND_CONFIG,
  type ReconKindConfig,
} from '@/features/sales/_shared/reconciliation/recon-kind'

/**
 * Investor (CĐT) reconciliation preset — the `rich` profile, manual create enabled, manual invoice
 * creation enabled, no line-level confirm/void/resync (investor finalizes via sheet-confirm).
 *
 * The canonical preset lives in the shared engine ({@link INVESTOR_RECON_KIND_CONFIG}) so the engine
 * has no upward dependency; this file is the per-domain entry point investor pages import, mirrored by
 * `f2-reconciliation-config.ts` / `ctv-reconciliation-config.ts`.
 */
export const investorReconciliationConfig: ReconKindConfig = INVESTOR_RECON_KIND_CONFIG
