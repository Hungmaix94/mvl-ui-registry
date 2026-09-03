import type { ProjectPromotionDistribution } from '@/features/accounting/promotion-distributions/services/promotion-distribution-service'

/**
 * Doanh thu (gross promotion revenue) = Tiền hàng × Tỷ lệ doanh thu / 100.
 * Equivalent to `revenue_base + marketing_cost`. API fields are decimal strings.
 */
export function computeRevenue(
  record: Pick<
    ProjectPromotionDistribution,
    'total_fee_calculation_price' | 'snapshot_pct_promotion_revenue'
  >
): number {
  const fee = Number(record.total_fee_calculation_price ?? 0)
  const pct = Number(record.snapshot_pct_promotion_revenue ?? 0)
  return (fee * pct) / 100
}

/**
 * Hoa hồng Phòng = tổng thành tiền của tất cả người/phòng nhận.
 *
 * Recipients live in `department_allocations` (each pool's `amount` is the
 * post-payout total, already covering its split lines) plus any direct employee
 * `lines` not tied to a pool. Summing pool amounts + direct lines avoids double
 * counting split members (which also appear inside a pool's `lines`).
 */
export function computeDeptCommission(
  record: Pick<ProjectPromotionDistribution, 'lines' | 'department_allocations'>
): number {
  const poolTotal = (record.department_allocations ?? []).reduce(
    (sum, alloc) => sum + Number(alloc.amount ?? 0),
    0
  )
  const directTotal = (record.lines ?? [])
    .filter((line) => line.department_allocation == null)
    .reduce((sum, line) => sum + Number(line.amount ?? 0), 0)
  return poolTotal + directTotal
}
