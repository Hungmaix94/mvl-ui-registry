import type {
  ReconMvCommissionConfig,
  ReconMvDealPrice,
  ReconMvReference,
} from '@/features/sales/_shared/reconciliation/useReconMvReference'
import { resolveRateTriple, type RateSpec } from '@/utils/rate-spec'

/**
 * Pure F2 "MV ghi nhận" reference builder — service-free so it is unit-testable WITHOUT pulling the
 * deal-service → api-client import chain into vitest (which crashes on the NotificationService module).
 * The hook ({@link useF2ReconMvReference}) wires this to the deal commission-config query.
 *
 * F2 reconciles MV ↔ Sàn F2, so the recorded rate is the **MV-to-F2 commission** for THIS exchange,
 * NOT the investor agency fee (`pct_agency_fee`, the CĐT-to-MV rate). The MV-to-F2 rates live in
 * `DealCommissionConfig.f2_rates_by_exchange`, a map keyed by exchange id:
 * `{ pct_f2_commission, amt_f2_commission, is_f2_commission_include_vat, pct_f2_bonus, amt_f2_bonus,
 * is_f2_bonus_include_vat, pct_f2_inventory_hold }`. We map it onto the canonical
 * {@link ReconMvReference} so the shared ConfigTable renders it unchanged (pct_f2_commission →
 * pctAgencyFee; pct_f2_bonus/amt_f2_bonus → the Phần-4 bonus reference). `is_f2_commission_include_vat`
 * cascades from `is_agency_fee_include_vat` when null, per the API.
 */

/** Per-exchange F2 rate entry inside `f2_rates_by_exchange` (typed `unknown` in the generated schema). */
interface F2RateEntry {
  pct_f2_commission?: string | null
  amt_f2_commission?: string | null
  /**
   * Exact fraction-of-base F2 commission rate (bộ-3-key XOR với pct/amt). BE để `pct_f2_commission`
   * = null/"0" khi dùng spec/số tiền cố định, nên phải đọc spec này TRƯỚC cache phẳng — nếu không
   * "% Hoa hồng (theo HĐPP)" hiện nhầm 0% (xem schema `LadF2AppliedRate.pct_f2_commission_spec`).
   */
  pct_f2_commission_spec?: RateSpec | null
  is_f2_commission_include_vat?: boolean | null
  pct_f2_bonus?: string | null
  amt_f2_bonus?: string | null
  is_f2_bonus_include_vat?: boolean | null
  pct_f2_inventory_hold?: string | null
}

/** API decimal-string (or number) → finite number, else null. (Local copy to stay service-free.) */
function toRefNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** "0"/empty ⇒ null (no fixed amount) so the % branch stays authoritative — mirrors useReconMvReference. */
function toRefAmount(value: string | number | null | undefined): number | null {
  const parsed = toRefNumber(value)
  return parsed != null && parsed !== 0 ? parsed : null
}

/** Safely narrow the dynamic `f2_rates_by_exchange` map and pick this exchange's entry. */
function getF2RateEntry(
  map: unknown,
  exchangeId: number | null | undefined
): F2RateEntry | undefined {
  if (!map || typeof map !== 'object' || exchangeId == null) return undefined
  const entry = (map as Record<string, unknown>)[String(exchangeId)]
  if (!entry || typeof entry !== 'object') return undefined
  return entry as F2RateEntry
}

export function buildF2Reference(
  config: ReconMvCommissionConfig | null | undefined,
  exchangeId: number | null | undefined,
  dealPrice: ReconMvDealPrice | null | undefined,
  isLoading: boolean
): ReconMvReference {
  const f2 = getF2RateEntry(config?.f2_rates_by_exchange, exchangeId)
  // %HH "MV ghi nhận" = tỷ lệ MV trả cho F2 theo bộ-3-key LOẠI TRỪ NHAU: spec (phân số) | pct phẳng |
  // amt phẳng. `resolveRateTriple` ưu tiên spec (→ % hoặc ₫ dẫn xuất qua display_pct), rồi pct, rồi amt;
  // ép pct/amt "0"/rỗng về null để nhánh spec/số-tiền lên tiếng (BE để pct=0 khi cấu hình phân số).
  const commissionPair = resolveRateTriple(
    f2?.pct_f2_commission_spec,
    toRefNumber(f2?.pct_f2_commission) || null,
    toRefAmount(f2?.amt_f2_commission)
  )
  return {
    listedPrice: dealPrice?.listedPrice ?? null,
    feeCalculationPrice: dealPrice?.feeCalculationPrice ?? null,
    // KHÔNG phải pct_agency_fee (CĐT→MV).
    pctAgencyFee: commissionPair.pct,
    amtAgencyFee: commissionPair.amt,
    // Giữ spec để bề mặt read-only hiển thị đúng công thức phân số ("num/den của base"), không chỉ số dẫn xuất.
    agencyFeeSpec: f2?.pct_f2_commission_spec ?? null,
    // BASE/TỔNG HỢP band là phạm vi CĐT (IR); F2 chưa dùng nên để null.
    baseAgencyFeeRate: null,
    baseAmtAgencyFee: null,
    isAgencyFeeIncludeVat:
      f2?.is_f2_commission_include_vat ?? config?.is_agency_fee_include_vat ?? null,
    // Phần 4 — phí tăng thêm: thưởng MV trả cho F2 theo exchange.
    pctInvestorBonus: toRefNumber(f2?.pct_f2_bonus),
    amtInvestorBonus: toRefAmount(f2?.amt_f2_bonus),
    isInvestorBonusIncludeVat: f2?.is_f2_bonus_include_vat ?? null,
    // F2 không có tham chiếu "Thưởng đại lý" theo exchange trong config ⇒ để trống (không quy định).
    amtSharedBonus: null,
    pctSharedBonus: null,
    isSharedBonusIncludeVat: null,
    priorReceivedTotal: null,
    // Tổng giảm trừ đã chốt là phạm vi deal/CĐT — F2 không dùng ⇒ null (expected khấu trừ = 0).
    deductAgreed: null,
    isLoading,
  }
}
