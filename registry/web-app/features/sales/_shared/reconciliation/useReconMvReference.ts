import { useMemo } from 'react'

import type { components } from '@/api/schema'
import { useDealCommissionConfigList } from '@/features/sales/deals/services/deal-service'
import type { RateSpec } from '@/utils/rate-spec'
import { EMPTY_MV_REFERENCE } from './recon-empty-reference'

/** `current` config từ envelope `deals/{deal_pk}/commission-config/`. */
export type ReconMvCommissionConfig = components['schemas']['DealCommissionConfig']

/** Giá lấy từ deal (commission-config KHÔNG có giá). */
export interface ReconMvDealPrice {
  listedPrice: number | null
  feeCalculationPrice: number | null
  /**
   * Tổng giảm trừ ĐÃ CHỐT của deal (`deal.total_fee_deduction`, PRE-VAT) — optional vì DealList hiện
   * chưa expose field này (BE branch thêm vào `deal_detail`, chưa deploy). null/absent ⇒ settlement
   * giữ nguyên hành vi cũ (expected khấu trừ = 0).
   */
  deductAgreed?: number | null
}

/** Convert an API decimal string (or number) to a finite number, or `null` when absent/invalid. */
export function toRefNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Số TIỀN cố định tham chiếu (XOR pct/amt): coi `"0"`/rỗng/null là KHÔNG dùng phí cố định ⇒ trả `null`
 * để công thức (agencyCommissionFull/fullAmount) dùng `%` thay vì coi như phí cố định = 0. Commission
 * config thường trả CẢ pct lẫn amt, với amt="0" nghĩa là "không dùng phí cố định".
 */
function toRefAmount(value: string | number | null | undefined): number | null {
  const parsed = toRefNumber(value)
  return parsed != null && parsed !== 0 ? parsed : null
}

/**
 * Lấy `current` config từ kết quả `getDealCommissionConfigList`. OpenAPI khai báo kết quả là MẢNG
 * envelope (`DealCommissionConfigEnvelope[]`) nhưng API thực tế có thể trả MỘT envelope object
 * `{ current, history }` — xử lý CẢ 2 shape (giống DealReconciliationTab/DealLadTab) để không rớt
 * mapping `pct_agency_fee` / `investor_bonus` / `reconciliation_supplementary` + cờ `is_*_include_vat`.
 */
export function extractCurrentCommissionConfig(
  envelope: unknown
): ReconMvCommissionConfig | null | undefined {
  const pickCurrent = (entry: unknown): ReconMvCommissionConfig | null | undefined =>
    entry && typeof entry === 'object' && 'current' in entry
      ? (entry as { current?: ReconMvCommissionConfig | null }).current
      : undefined
  return Array.isArray(envelope) ? pickCurrent(envelope[0]) : pickCurrent(envelope)
}

/**
 * Lấy `original` config (deal-creation, source='creation') từ envelope commission-config. Rate gốc của
 * nó (`pct_agency_fee`) là BASE rate neo outflow. Xử lý cả 2 shape (mảng / object) như current.
 */
export function extractOriginalCommissionConfig(
  envelope: unknown
): ReconMvCommissionConfig | null | undefined {
  const pickOriginal = (entry: unknown): ReconMvCommissionConfig | null | undefined =>
    entry && typeof entry === 'object' && 'original' in entry
      ? (entry as { original?: ReconMvCommissionConfig | null }).original
      : undefined
  return Array.isArray(envelope) ? pickOriginal(envelope[0]) : pickOriginal(envelope)
}

/** Khối tạm ứng thưởng CĐT của deal (envelope key additive `investor_bonus_prepaid`). */
export type DealInvestorBonusPrepaid = components['schemas']['DealInvestorBonusPrepaid']

/**
 * Lấy khối `investor_bonus_prepaid` (tạm ứng thưởng bổ sung CĐT theo deal) từ envelope
 * commission-config — `unrecognised_amount` là số SẼ được cấn khi duyệt đối chiếu kế tiếp,
 * `advances[]` trace từng khoản. Xử lý cả 2 shape (mảng / object) như current/original.
 */
export function extractInvestorBonusPrepaid(envelope: unknown): DealInvestorBonusPrepaid | null {
  const pick = (entry: unknown): DealInvestorBonusPrepaid | null =>
    entry && typeof entry === 'object' && 'investor_bonus_prepaid' in entry
      ? ((entry as { investor_bonus_prepaid?: DealInvestorBonusPrepaid | null })
          .investor_bonus_prepaid ?? null)
      : null
  return Array.isArray(envelope) ? pick(envelope[0]) : pick(envelope)
}

/**
 * MV (hệ thống) reference cho MỘT căn, lấy từ **deal commission config**
 * (`deals/{deal_pk}/commission-config/` → `envelope.current`).
 *
 * Drives the read-only "MV ghi nhận" column of the ConfigTable; the delta shown to the user is
 * `reference − user input`. Every field is nullable: when the config has no value the compare row
 * degrades to "— (không quy định)" instead of throwing.
 *
 * Nguồn (DealCommissionConfig + giá từ deal):
 * - giá: `deal.listed_price`, `deal.fee_calculation_price` (giá theo HĐMB) — truyền vào qua `dealPrice`
 * - `config.{pct,amt}_agency_fee` (%HH theo HĐPP) + cờ `is_agency_fee_include_vat`
 * - `config.{pct,amt}_investor_bonus` (Phần 4 — Tổng phí tăng thêm) + cờ `is_investor_bonus_include_vat`
 * - `config.{pct,amt}_shared_bonus` (Phần 3 — Thưởng đại lý) + cờ `is_shared_bonus_include_vat`
 */
export interface ReconMvReference {
  /** Giá niêm yết (từ deal). */
  listedPrice: number | null
  /** Giá tính phí theo HĐMB (từ deal) — reference Phần 0 "Giá tính phí" (D15 price drift). */
  feeCalculationPrice: number | null
  /** %HH đại lý theo cấu hình HĐPP hiện hành (TỔNG HỢP / target / inflow) (D16 mismatch). */
  pctAgencyFee: number | null
  /** Tiền HH đại lý theo cấu hình. */
  amtAgencyFee: number | null
  /**
   * RateSpec HH đại lý khi cấu hình dạng PHÂN SỐ (F2: `pct_f2_commission_spec`). Có để bề mặt read-only
   * GIỮ công thức "num/den của base" khi hiển thị (`formatRateSpecFraction`) thay vì chỉ hiện % đã tính
   * — `pctAgencyFee`/`amtAgencyFee` là giá trị dẫn xuất kèm theo. null cho CĐT (không dùng spec ở đây).
   */
  agencyFeeSpec?: RateSpec | null
  /**
   * %HH đại lý GỐC (BASE) — `pct_agency_fee` của config creation (`envelope.original`), neo outflow
   * Sale/F2/CTV. Khác `pctAgencyFee` (current/target) khi CĐT điều chỉnh phí qua LAD/đối chiếu.
   * Dùng cho dải BASE / TỔNG HỢP trên card v6. null khi deal legacy không có config creation.
   */
  baseAgencyFeeRate: number | null
  /** Tiền HH đại lý GỐC (BASE) theo config creation. */
  baseAmtAgencyFee: number | null
  /** Cờ: HH đại lý theo cấu hình đã gồm VAT? (null = không xác định ⇒ không hiển thị nhãn) */
  isAgencyFeeIncludeVat: boolean | null
  /** % thưởng CĐT theo cấu hình (Phần 4 — Tổng phí tăng thêm reference). */
  pctInvestorBonus: number | null
  /** Tiền thưởng CĐT theo cấu hình (Phần 4 reference). */
  amtInvestorBonus: number | null
  /** Cờ: thưởng CĐT theo cấu hình đã gồm VAT? */
  isInvestorBonusIncludeVat: boolean | null
  /** Tiền thưởng đại lý chia sẻ theo cấu hình (Phần 3 — Thưởng đại lý reference). */
  amtSharedBonus: number | null
  /** % thưởng đại lý chia sẻ theo cấu hình (XOR với amt). */
  pctSharedBonus: number | null
  /** Cờ: thưởng đại lý theo cấu hình đã gồm VAT? */
  isSharedBonusIncludeVat: boolean | null
  /**
   * Lũy kế đã nhận / đã đối chiếu các đợt trước.
   *
   * TODO(Phase H — settlement check): populate from the recon row's server `prior_received_total`
   * plus `useProductInventoryInvestorReconciliationHistory` once the D18/D19 shortfall semantics are
   * confirmed with BE. Left `null` for now so settlement rows degrade gracefully.
   */
  priorReceivedTotal: number | null
  /**
   * Tổng giảm trừ ĐÃ CHỐT của deal (`deal.total_fee_deduction`, PRE-VAT) — expected cho dòng "Khấu
   * trừ" của settlement check. null (deal chưa expose / chưa chốt) ⇒ expected = 0 (hành vi cũ).
   */
  deductAgreed: number | null
  isLoading: boolean
}

/** Re-exported from the service-free module so pure aggregators can share the same empty reference. */
export const EMPTY_REFERENCE: ReconMvReference = EMPTY_MV_REFERENCE

/**
 * Pure assembler: map the deal commission config (+ deal price) into a {@link ReconMvReference}.
 * Shared by the single-id hook below and the batched {@link useReconMvReferences} hook so the field
 * mapping lives in exactly one place.
 *
 * `priorReceivedTotal` is intentionally `null` (Phase H — see the interface doc).
 */
export function buildReference(
  config: ReconMvCommissionConfig | null | undefined,
  dealPrice: ReconMvDealPrice | null | undefined,
  isLoading: boolean,
  originalConfig?: ReconMvCommissionConfig | null
): ReconMvReference {
  return {
    listedPrice: dealPrice?.listedPrice ?? null,
    feeCalculationPrice: dealPrice?.feeCalculationPrice ?? null,
    pctAgencyFee: toRefNumber(config?.pct_agency_fee),
    amtAgencyFee: toRefAmount(config?.amt_agency_fee),
    baseAgencyFeeRate: toRefNumber(originalConfig?.pct_agency_fee),
    baseAmtAgencyFee: toRefAmount(originalConfig?.amt_agency_fee),
    isAgencyFeeIncludeVat: config?.is_agency_fee_include_vat ?? null,
    pctInvestorBonus: toRefNumber(config?.pct_investor_bonus),
    amtInvestorBonus: toRefAmount(config?.amt_investor_bonus),
    isInvestorBonusIncludeVat: config?.is_investor_bonus_include_vat ?? null,
    amtSharedBonus: toRefAmount(config?.amt_shared_bonus),
    pctSharedBonus: toRefNumber(config?.pct_shared_bonus),
    isSharedBonusIncludeVat: config?.is_shared_bonus_include_vat ?? null,
    priorReceivedTotal: null,
    deductAgreed: dealPrice?.deductAgreed ?? null,
    isLoading,
  }
}

/**
 * MV reference cho một căn theo `deal_pk`. Giá lấy từ `dealPrice` (deal đã chọn) vì commission-config
 * không trả giá. `dealId ≤ 0` (chưa resolve được deal) ⇒ {@link EMPTY_REFERENCE}.
 */
export function useReconMvReference(
  dealId: number | null | undefined,
  dealPrice?: ReconMvDealPrice | null
): ReconMvReference {
  const id = dealId && dealId > 0 ? dealId : 0

  const { data: envelope, isLoading } = useDealCommissionConfigList(id, { enabled: id > 0 })

  return useMemo<ReconMvReference>(() => {
    if (!id) return EMPTY_REFERENCE
    return buildReference(
      extractCurrentCommissionConfig(envelope),
      dealPrice,
      isLoading,
      extractOriginalCommissionConfig(envelope)
    )
  }, [id, envelope, dealPrice, isLoading])
}
