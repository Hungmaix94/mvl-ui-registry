import { useCallback, useMemo } from 'react'

import type { LoadOptionsResult, SelectOption } from '@/components/ui/select/Select'
import type { ReconSelectedDeal } from '@/features/sales/_shared/reconciliation/useReconDealSelect'
import type { F2ReconciliationSheet } from '@/features/sales/f2-reconciliations/types/f2-reconciliation'

function toNullableNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * F2 line-source resolver for the shared {@link ReconSelectedDeal} contract (header chips + MV).
 *
 * Unlike the investor flow — which fetches a project-scoped deal dropdown — every F2 line is LOCKED
 * to its generated căn, and the sheet response already carries each row's `deal` (→ MV via
 * `deals/{deal}/commission-config`) plus the prices. So we build the selected-deal map straight from
 * `sheet.reconciliations` (no network), and the dropdown loaders are no-ops that only resolve the
 * locked code into the (disabled) Select label.
 */
export function useF2ReconLineSources(sheet: F2ReconciliationSheet) {
  const dealByProductInventoryId = useMemo(() => {
    const map = new Map<number, ReconSelectedDeal>()
    for (const r of sheet.reconciliations ?? []) {
      const productInventoryId = r.product_inventory ?? r.product_inventory_detail?.id ?? 0
      if (productInventoryId <= 0) continue
      const unitNumber = r.product_inventory_detail?.unit_number ?? ''
      const code = r.product_inventory_detail?.code ?? ''
      map.set(productInventoryId, {
        productInventoryId,
        // dealId khoá fetch commission-config cho cột "MV ghi nhận" — F2 row mang sẵn `deal`.
        dealId: r.deal ?? 0,
        // Select hiển thị MÃ HĐ (như CĐT), tách khỏi chip mã căn để không trùng giá trị.
        dealCode: r.deal_detail?.code ?? '',
        productCode: code,
        productUnitNumber: unitNumber,
        listedPrice: toNullableNumber(r.listed_price),
        feeCalculationPrice: toNullableNumber(r.fee_calculation_price),
        agencyFeeRate: toNullableNumber(r.pct_commission),
        // F2 sheets are locked (no unit re-select) so shared bonus is never prefilled here.
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
        // Mã HĐ trong ô Select (mirror CĐT); fallback mã căn rồi id nếu thiếu.
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
