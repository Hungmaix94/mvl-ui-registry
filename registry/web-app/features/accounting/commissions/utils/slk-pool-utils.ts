import { LinkedExchangeDeptCommissionStatus, type components } from '@/api/schema'
export type EmployeeOrgDetail = components['schemas']['EmployeeWithDepartmentNested']

/**
 * Normalise an SLK monthly status to the actual `LinkedExchangeDeptCommissionStatus`
 * enum member. The generated enum carries lowercase values but the API returns the BE
 * TextChoices (UPPERCASE: DRAFT/REVIEWED/POSTED) — a schema.ts casing drift that would
 * otherwise make every `status === StatusType.X` comparison fail. Case-insensitive, so
 * it keeps working after a clean `yarn api:update` realigns the enum. Remove once the
 * regenerated schema matches the API casing.
 */
export function normalizeSlkStatus(
  status?: string | null
): LinkedExchangeDeptCommissionStatus | undefined {
  const upper = String(status ?? '').toUpperCase()
  return Object.values(LinkedExchangeDeptCommissionStatus).find((v) => v.toUpperCase() === upper)
}
import type {
  LinkedExchangeMonthlyCommission,
  F2SourcePayoutRow,
  SlkRevenueLine,
  DirectorDealPendingF2,
} from '@/features/accounting/linked-exchange-monthly-commissions/services/linked-exchange-monthly-commission-service'
import { F2Source as F2Source } from '@/constants/api-schema-aliases'

/**
 * One F2-source pool row for the SLK monthly overview: LINKED (single),
 * COMPANY (single), and one per DIRECTOR. `poolKey` is the natural id used in
 * the pool sub-route (`linked` | `company` | `director-<employeeId>`).
 */
export type SlkPoolRow = {
  poolKey: string
  sourceType: F2Source
  directorId: number | null
  /** Display name of the director (director pools only). */
  directorName: string | null
  /** Full org detail of the director (dept/block/branch) for the breadcrumb. */
  directorDetail: EmployeeOrgDetail | null
  /** Tier rate (pct_total %) applied to this period — same across pools. */
  ratePct: number
  /** Track revenue feeding this pool. */
  revenue: number
  /** Pool amount = Σ payout rows of this source/director (0 while a split is pending). */
  poolAmount: number
  /** Expected pool total = revenue × tier rate (pct_total). Known from revenue alone,
   * so it shows even before the split is entered (poolAmount is still 0 then). */
  poolTotal: number
  /** Per-recipient payout rows of this pool (money already computed by BE). */
  payout: F2SourcePayoutRow[]
  /** Ratio state: rule-derived (LINKED), entered, or pending (director w/o split). */
  ratioState: 'by-rule' | 'entered' | 'pending'
}

/**
 * Một phần tử của `summary.pools`, chép lại từ docstring của serializer BE.
 *
 * TODO(schema): BE khai `pools` là `{ [key: string]: unknown }` trần — drf-spectacular không nhìn
 * được vào trong `SerializerMethodField` nếu thiếu `@extend_schema_field`, nên schema KHÔNG sinh
 * `components['schemas']['F2SourcePool']` để import. Bỏ type này và dùng type generated ngay khi
 * BE annotate field đó.
 *
 * `source_type` để `string` chứ không phải `F2Source`: BE từng trả TextChoices viết HOA trong khi
 * enum generated viết thường (chính là drift mà `normalizeSlkStatus` ở trên sinh ra để đỡ), nên
 * mọi chỗ so sánh trong file này đều đang đi qua `String(...)`. Khai thẳng là enum ở đây là hứa
 * một thứ chưa kiểm được.
 */
export type F2SourcePool = {
  pool_key: string
  source_type: string
  director: EmployeeOrgDetail | null
  commission_rate: string | number | null
  revenue: string | number | null
  pool_amount: string | number | null
  pool_total: string | number | null
  payout: F2SourcePayoutRow[]
  ratio_state: SlkPoolRow['ratioState']
}

const num = (value?: string | number | null): number => Number(value || 0)

/**
 * Map `summary.pools` onto the shape the screen renders. A pure rename — **no arithmetic**.
 *
 * It used to derive four of these numbers here: it summed `slk_revenue` per director off the
 * revenue-line list, multiplied `revenue × pct_total` for the pool total, summed `payout[]`
 * for what was paid, and dug the rate out of `applied_rule_snapshot`. That was a second money
 * path outside `f2_source_distribution.distribute()`, the declared single point — the rule is
 * "FE KHÔNG tính tiền client-side". It also meant the biggest figure on the screen existed in
 * no API response at all, so nobody could trace where it came from.
 *
 * The BE now ships every one of them per pool (backend#3161), including for a pool whose split
 * is still pending: `pool_amount` is "0" there but `revenue`/`pool_total` are known, which is
 * what keeps the pending card meaningful.
 */
export function buildSlkPoolRows(summary: LinkedExchangeMonthlyCommission): SlkPoolRow[] {
  // Ép về contract BE tài liệu hoá tại ĐÚNG MỘT chỗ này (xem TODO(schema) ở `F2SourcePool`),
  // thay vì rải `as unknown as` xuống từng field bên dưới như trước.
  const pools = (summary.pools ?? []) as unknown as F2SourcePool[]
  return pools.map((pool) => ({
    poolKey: pool.pool_key,
    sourceType: pool.source_type as F2Source,
    directorId: pool.director?.id ?? null,
    directorName: pool.director?.fullname ?? null,
    directorDetail: pool.director ?? null,
    ratePct: num(pool.commission_rate),
    revenue: num(pool.revenue),
    poolAmount: num(pool.pool_amount),
    poolTotal: num(pool.pool_total),
    payout: pool.payout,
    ratioState: pool.ratio_state,
  }))
}

/** Director ids that have DIRECTOR revenue but no entered split (block confirm). */
export function pendingDirectorPools(rows: SlkPoolRow[]): SlkPoolRow[] {
  return rows.filter((r) => r.sourceType === F2Source.director && r.ratioState === 'pending')
}

/**
 * Deals the backend deliberately kept OUT of this period's SLK revenue: director-sourced,
 * cash already collected (a POSTED receipt in the period), but their F2 reconciliation is
 * not CONFIRMED yet — `_compute_revenue_lines` only counts CONFIRMED F2 rows.
 *
 * These advisory rows are the ONLY explanation the accountant gets for "a transaction is
 * missing from this pool", so every screen showing pool revenue must surface them. Absent
 * from list responses (the BE skips the field there), hence the array guard.
 */
export function pendingF2Deals(summary: LinkedExchangeMonthlyCommission): DirectorDealPendingF2[] {
  const rows = summary.director_deals_pending_f2
  return Array.isArray(rows) ? rows : []
}

/**
 * The pending-F2 rows belonging to one pool. Only DIRECTOR pools can carry any — the BE
 * advisory covers director-sourced deals exclusively (LINKED/COMPANY tracks aggregate
 * revenue without a per-director owner).
 */
export function pendingF2ForPool(
  summary: LinkedExchangeMonthlyCommission,
  pool: { sourceType: F2Source; directorId: number | null } | null
): DirectorDealPendingF2[] {
  if (!pool || String(pool.sourceType) !== String(F2Source.director) || pool.directorId == null) {
    return []
  }
  return pendingF2Deals(summary).filter((row) => (row.director_id ?? null) === pool.directorId)
}

/** Parse a pool sub-route key back into (source_type, directorId). */
export function parsePoolKey(
  poolKey: string
): { sourceType: F2Source; directorId: number | null } | null {
  if (poolKey === 'linked') return { sourceType: F2Source.linked, directorId: null }
  if (poolKey === 'company') return { sourceType: F2Source.company, directorId: null }
  if (poolKey.startsWith('director-')) {
    const raw = poolKey.slice('director-'.length)
    const id = Number(raw)
    // Require a real positive employee id — reject '' (Number('')===0) and 0.
    if (raw !== '' && Number.isInteger(id) && id > 0) {
      return { sourceType: F2Source.director, directorId: id }
    }
  }
  return null
}

/**
 * The revenue lines feeding one pool — the transactions behind its "Doanh thu nguồn SLK kỳ này".
 *
 * Uses the SAME (source, director) predicate `buildSlkPoolRows` groups by, so the table
 * this feeds always sums to the pool figure shown above it. `f2_source` is compared as a
 * string on purpose: the pool key and the revenue line spell the F2 source with two
 * different generated enums that carry identical underlying values.
 */
export function linesForPool(
  lines: SlkRevenueLine[],
  pool: { sourceType: F2Source; directorId: number | null } | null
): SlkRevenueLine[] {
  if (!pool) return []
  return lines.filter(
    (line) =>
      String(line.f2_source) === String(pool.sourceType) &&
      (line.f2_source_director ?? null) === pool.directorId
  )
}
