/**
 * Map the SA's active TBC (Time-Bound Commission) records — the *current* config — into the LAD
 * `payload_snapshot` shape so Bước 2 can prefill "Giá trị mới" and show the "Hiện hành · Δ" column.
 *
 * TBC decimal fields come back as strings (`pct_agency_fee?: string | null`) → parsed to numbers.
 * Field keys already match LAD's payload (agency_fee / investor_bonus / sale_commission /
 * investor_bonus_to_sale / revenue + the F2 keys + shared-bonus keys `pct_shared_bonus` /
 * `amt_shared_bonus`). All have a TBC-core source after the 2026-06-23 shared_bonus rename.
 */
import type { components } from '@/api/schema'
import { fromRateSpec, toRateSpecPayload } from '@/utils/rate-spec'
import type { LadF2AppliedRate, LadF2Override } from '../../types/lad-types'

type TimeBoundCommission = components['schemas']['TimeBoundCommission']
type TimeBoundCommissionF2 = components['schemas']['TimeBoundCommissionF2']

/** Parse a decimal-string / number into a finite number, else null. */
export function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export type LadCoreConfig = Record<string, number | boolean | null>

/** TBC-core current record → LAD CĐT config (pct/amt + VAT flags that LAD models). */
export function tbcCoreToConfig(record?: TimeBoundCommission | null): LadCoreConfig | null {
  if (!record) return null
  const r = record as Record<string, unknown>
  return {
    pct_agency_fee: numOrNull(r.pct_agency_fee),
    amt_agency_fee: numOrNull(r.amt_agency_fee),
    is_agency_fee_include_vat: (r.is_agency_fee_include_vat as boolean | null) ?? null,
    pct_investor_bonus: numOrNull(r.pct_investor_bonus),
    amt_investor_bonus: numOrNull(r.amt_investor_bonus),
    is_investor_bonus_include_vat: (r.is_investor_bonus_include_vat as boolean | null) ?? null,
    pct_shared_bonus: numOrNull(r.pct_shared_bonus),
    amt_shared_bonus: numOrNull(r.amt_shared_bonus),
    is_shared_bonus_include_vat: (r.is_shared_bonus_include_vat as boolean | null) ?? null,
    pct_sale_commission: numOrNull(r.pct_sale_commission),
    amt_sale_commission: numOrNull(r.amt_sale_commission),
    // Thưởng sale (no-VAT, §2.2). mv_bonus_to_sale + VAT flag đã bỏ khỏi LADPayloadSnapshotRequest.
    pct_investor_bonus_to_sale: numOrNull(r.pct_investor_bonus_to_sale),
    amt_investor_bonus_to_sale: numOrNull(r.amt_investor_bonus_to_sale),
    amt_staff_incentive: numOrNull(r.amt_staff_incentive),
    pct_revenue: numOrNull(r.pct_revenue),
    amt_revenue: numOrNull(r.amt_revenue),
    // Doanh thu KPI Sàn liên kết (dự án tổng đại lý). BẮT BUỘC prefill: payload LAD là
    // full-replace, thiếu key ⇒ áp lô sẽ xoá cơ sở doanh thu SLK của giao dịch.
    pct_kpi_revenue_slk: numOrNull(r.pct_kpi_revenue_slk),
    amt_kpi_revenue_slk: numOrNull(r.amt_kpi_revenue_slk),
  }
}

/** TBC-F2 current record → LAD per-exchange F2 override (`f2_overrides_by_exchange[id]`). */
export function tbcF2ToOverride(record?: TimeBoundCommissionF2 | null): LadF2Override {
  const r = (record ?? {}) as Record<string, unknown>
  // Hoa hồng F2: chuẩn hoá spec hiện hành (nếu TBC-F2 dùng phân số / %) qua adapter để vừa giữ
  // được spec submittable, vừa có cache pct/amt dẫn xuất cho nhánh ₫-trực-tiếp (XOR — chỉ một bên).
  const commission = toRateSpecPayload(
    fromRateSpec(
      record?.f2_commission_spec,
      numOrNull(r.pct_f2_commission),
      numOrNull(r.amt_f2_commission)
    )
  )
  return {
    pct_f2_commission_spec: commission.spec,
    pct_f2_commission: commission.pct,
    amt_f2_commission: commission.amt,
    is_f2_commission_include_vat: (r.is_f2_commission_include_vat as boolean | null) ?? null,
    pct_f2_bonus: numOrNull(r.pct_f2_bonus),
    amt_f2_bonus: numOrNull(r.amt_f2_bonus),
    is_f2_bonus_include_vat: (r.is_f2_bonus_include_vat as boolean | null) ?? null,
    pct_f2_inventory_hold: numOrNull(r.pct_f2_inventory_hold),
  }
}

/** GET /{batch_id}/f2s/ row → LAD per-exchange F2 override (rate đang áp dụng trên GD trong lô). */
export function ladF2AppliedRateToOverride(rate: LadF2AppliedRate): LadF2Override {
  const commission = toRateSpecPayload(
    fromRateSpec(
      rate.pct_f2_commission_spec,
      numOrNull(rate.pct_f2_commission),
      numOrNull(rate.amt_f2_commission)
    )
  )
  return {
    pct_f2_commission_spec: commission.spec,
    pct_f2_commission: commission.pct,
    amt_f2_commission: commission.amt,
    is_f2_commission_include_vat: rate.is_f2_commission_include_vat ?? null,
    pct_f2_bonus: numOrNull(rate.pct_f2_bonus),
    amt_f2_bonus: numOrNull(rate.amt_f2_bonus),
    is_f2_bonus_include_vat: rate.is_f2_bonus_include_vat ?? null,
    pct_f2_inventory_hold: numOrNull(rate.pct_f2_inventory_hold),
  }
}

const hasPositiveRate = (pct?: number | null, amt?: number | null): boolean =>
  (typeof pct === 'number' && pct !== 0) || (typeof amt === 'number' && amt !== 0)

/** True when the applied-rate row carries at least one F2 commission/bonus/hold value. */
export function hasAnyF2OverrideValue(ov: LadF2Override): boolean {
  return (
    ov.pct_f2_commission_spec != null ||
    hasPositiveRate(ov.pct_f2_commission, ov.amt_f2_commission) ||
    hasPositiveRate(ov.pct_f2_bonus, ov.amt_f2_bonus) ||
    hasPositiveRate(ov.pct_f2_inventory_hold, null)
  )
}

/** True when the config carries at least one CĐT rate/amount (used to decide whether to prefill). */
export function hasAnyCoreValue(config: Record<string, unknown> | null | undefined): boolean {
  if (!config) return false
  const keys = [
    'pct_agency_fee',
    'amt_agency_fee',
    'pct_investor_bonus',
    'amt_investor_bonus',
    'pct_shared_bonus',
    'amt_shared_bonus',
    'pct_sale_commission',
    'amt_sale_commission',
    'pct_investor_bonus_to_sale',
    'amt_investor_bonus_to_sale',
    'pct_revenue',
    'amt_revenue',
  ]
  return keys.some((k) => typeof config[k] === 'number')
}
