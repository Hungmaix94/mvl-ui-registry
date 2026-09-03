import { useCallback, useMemo } from 'react'

import type { LoadOptionsResult, SelectOption } from '@/components/ui/select/Select'
import type { ReconSelectedDeal } from '@/features/sales/_shared/reconciliation/useReconDealSelect'
import type { CTVReconciliationSheet } from '@/features/sales/ctv-reconciliations/services/ctv-reconciliation-sheet-service'

function toNullableNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * CTV line-source resolver for the shared {@link ReconSelectedDeal} contract (header chips: mã HĐ,
 * mã căn, giá tính phí × tỷ lệ, đã ĐC). Mirrors {@link useF2ReconLineSources}: every CTV line is
 * LOCKED to its generated căn and the sheet response already carries each row's `deal` + prices, so we
 * build the map straight from `sheet.reconciliations` (no network) and the dropdown loaders are no-ops
 * that only resolve the locked code into the (disabled) Select label.
 */
export function useCTVReconLineSources(sheet: CTVReconciliationSheet) {
  const dealByProductInventoryId = useMemo(() => {
    const map = new Map<number, ReconSelectedDeal>()
    for (const r of sheet.reconciliations ?? []) {
      const productInventoryId = r.product_inventory ?? r.product_inventory_detail?.id ?? 0
      if (productInventoryId <= 0) continue
      map.set(productInventoryId, {
        productInventoryId,
        dealId: r.deal ?? 0,
        dealCode: r.deal_detail?.code ?? '',
        productCode: r.product_inventory_detail?.code ?? '',
        productUnitNumber: r.product_inventory_detail?.unit_number ?? '',
        listedPrice: toNullableNumber(r.listed_price),
        feeCalculationPrice: toNullableNumber(r.fee_calculation_price),
        agencyFeeRate: toNullableNumber(r.pct_commission),
        // CTV sheets are locked (no unit re-select) so shared bonus is never prefilled here.
        sharedBonusAmount: null,
        sharedBonusPct: null,
        reconciliationRate: toNullableNumber(r.progress_to_pct),
        // Tổng giảm trừ đã chốt là phạm vi deal/CĐT — F2/CTV không dùng ⇒ null.
        deductAgreed: null,
      })
    }
    return map
  }, [sheet])

  const getSelectedDeal = useCallback(
    (productInventoryId: number | undefined | null): ReconSelectedDeal | undefined =>
      productInventoryId && productInventoryId > 0
        ? dealByProductInventoryId.get(productInventoryId)
        : undefined,
    [dealByProductInventoryId]
  )

  const loadInitialDealOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> =>
      values.map((raw) => {
        const id = Number(raw)
        const deal = dealByProductInventoryId.get(id)
        return {
          value: id,
          label: deal?.dealCode || deal?.productUnitNumber || deal?.productCode || String(id),
        }
      }),
    [dealByProductInventoryId]
  )

  const loadDealOptions = useCallback(
    async (): Promise<LoadOptionsResult<SelectOption>> => ({
      items: [],
      nextPage: null,
      hasNextPage: false,
    }),
    []
  )

  return { getSelectedDeal, loadInitialDealOptions, loadDealOptions }
}
