import { useMemo } from 'react'

import { useDealCommissionConfigList } from '@/features/sales/deals/services/deal-service'
import { EMPTY_MV_REFERENCE } from '@/features/sales/_shared/reconciliation/recon-empty-reference'
import {
  extractCurrentCommissionConfig,
  type ReconMvDealPrice,
  type ReconMvReference,
} from '@/features/sales/_shared/reconciliation/useReconMvReference'
import { buildF2Reference } from './f2-mv-reference'

/**
 * MV reference for an F2 line — the "MV ghi nhận" column. The MV-to-F2 rate mapping lives in the
 * service-free {@link buildF2Reference}; this hook only fetches the deal commission-config.
 *
 * F2 MV reference theo `deal_pk` + `exchange_id`. Giá lấy từ `dealPrice`; commission-config không trả
 * giá. `dealId ≤ 0` ⇒ {@link EMPTY_MV_REFERENCE}.
 */
export function useF2ReconMvReference(
  dealId: number | null | undefined,
  exchangeId: number | null | undefined,
  dealPrice?: ReconMvDealPrice | null
): ReconMvReference {
  const id = dealId && dealId > 0 ? dealId : 0

  const { data: envelope, isLoading } = useDealCommissionConfigList(id, { enabled: id > 0 })

  return useMemo<ReconMvReference>(() => {
    if (!id) return EMPTY_MV_REFERENCE
    return buildF2Reference(
      extractCurrentCommissionConfig(envelope),
      exchangeId,
      dealPrice,
      isLoading
    )
  }, [id, exchangeId, envelope, dealPrice, isLoading])
}
