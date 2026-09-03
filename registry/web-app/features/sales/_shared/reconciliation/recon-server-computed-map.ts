import type { components } from '@/api/schema'

import type { ReconServerComputed } from './useReconLineDerived'
import type { ReconCheck } from './recon-server-check'

type InvestorReconciliationLine = components['schemas']['InvestorReconciliation']

/**
 * Dựng map product_inventory_id → các tổng BE-computed của căn, dùng để hiển thị "Số tiền đối chiếu
 * kỳ này" + KPI band (FE không tự tính). Dùng cho Edit (rows từ /lines/) và Detail (rows từ
 * sheet.reconciliations).
 */
export function toReconServerComputedByProductId(
  rows: InvestorReconciliationLine[]
): Record<number, ReconServerComputed> {
  return Object.fromEntries(
    rows
      .filter((row) => Number(row.product_inventory) > 0)
      .map((row) => [
        Number(row.product_inventory),
        {
          period_commission: row.period_commission,
          sub_total_commission: row.sub_total_commission,
          total_amount: row.total_amount,
          vat_amount: row.vat_amount,
          total_amount_with_vat: row.total_amount_with_vat,
          retroactive_adjustment_amount: row.retroactive_adjustment_amount,
          prior_received_total: row.prior_received_total,
          extra_bonus_period_amount: row.extra_bonus_period_amount,
          shared_bonus_to_sale_amount: row.shared_bonus_to_sale_amount,
          shared_bonus_prepaid_amount: row.shared_bonus_prepaid_amount,
          amount_to_collect: row.amount_to_collect,
        } satisfies ReconServerComputed,
      ])
  )
}

/** Dựng map product_inventory_id → recon_check BE (chỉ căn có recon_check). */
export function toReconCheckByProductId(
  rows: InvestorReconciliationLine[]
): Record<number, ReconCheck> {
  return Object.fromEntries(
    rows
      .filter((row) => Number(row.product_inventory) > 0 && row.recon_check)
      .map((row) => [Number(row.product_inventory), row.recon_check as ReconCheck])
  )
}
