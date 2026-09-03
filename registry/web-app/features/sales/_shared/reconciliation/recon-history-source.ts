import { getDealService } from '@/features/sales/deals/services/deal-service'
import type { InvestorReconciliationHistory } from '@/services/realestate-service'

import type { ReconKind } from './recon-kind'
import { mapF2HistoryRowToCanonical } from './recon-f2-history-adapter'
import { mapCtvHistoryRowToCanonical } from './recon-ctv-history-adapter'

/** Canonical history row the whole engine consumes (investor superset). */
export type ReconCanonicalHistoryRow = InvestorReconciliationHistory

const STALE_TIME = 1000 * 60 * 5

/**
 * Minimal contract every consumer reads — `{ results }` of CANONICAL rows. `results` is optional so
 * the investor branch can return the raw service response verbatim (same cache value under the SAME
 * query key — no shape divergence). Consumers all read `data?.results ?? []`.
 */
export interface ReconHistoryResult {
  results?: ReconCanonicalHistoryRow[]
}

/** React Query descriptor usable by both `useQuery` and `useQueries`. */
export interface ReconHistoryQuery {
  queryKey: readonly unknown[]
  queryFn: () => Promise<ReconHistoryResult>
  staleTime: number
  enabled: boolean
}

/**
 * Build the kind-aware React Query descriptor that returns CANONICAL reconciliation-history rows for
 * a DEAL (`dealId`). Scoping by deal (not by căn / `product_inventory_id`) is deliberate: a unit can
 * be re-transacted after a cancelled deposit, and the per-căn endpoints would surface the OLD deal's
 * reconciliations. The deal-scoped endpoints return only the current deal's history.
 *
 * F2 và CTV hit their own endpoints and adapt rows to the canonical shape; investor returns the rows
 * as-is. All shared consumers (summary header, sheet totals, inline ledger) route through this single
 * factory, so for a given (kind, dealId) they share one query key + one query fn → React Query dedupes
 * to a single request and every consumer reads identically-shaped canonical rows.
 */
export function buildReconHistoryQuery(kind: ReconKind, dealId: number): ReconHistoryQuery {
  const id = dealId
  const enabled = Number.isFinite(id) && id > 0

  if (kind === 'f2') {
    return {
      queryKey: ['sales', 'deals', id, 'f2-reconciliation-history'],
      queryFn: async () => {
        const data = await getDealService().getDealF2ReconciliationHistory(id)
        return { results: (data?.results ?? []).map(mapF2HistoryRowToCanonical) }
      },
      staleTime: STALE_TIME,
      enabled,
    }
  }

  if (kind === 'ctv') {
    return {
      queryKey: ['sales', 'deals', id, 'ctv-reconciliation-history'],
      queryFn: async () => {
        const data = await getDealService().getDealCTVReconciliationHistory(id)
        return { results: (data?.results ?? []).map(mapCtvHistoryRowToCanonical) }
      },
      staleTime: STALE_TIME,
      enabled,
    }
  }

  return {
    queryKey: ['sales', 'deals', id, 'investor-reconciliation-history'],
    // Investor rows are already canonical → return the raw service response verbatim.
    queryFn: () => getDealService().getDealInvestorReconciliationHistory(id),
    staleTime: STALE_TIME,
    enabled,
  }
}
