import type { components } from '@/api/schema'

import {
  extraBonusFull,
  historyRowExtraPeriodCommission,
  historyRowPeriodCommission,
  isCountableHistoryRow,
  resolveEffectiveProgressToPct,
  resolveReconVatRate,
  toNum,
} from '@/features/sales/_shared/reconciliation/recon-calculations'
import type { ReconMvReference } from './useReconMvReference'
import type { InvestorReconciliationSheetCreateItemValues } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'

type HistoryRow = components['schemas']['InvestorReconciliationHistory']

/**
 * Tolerance below which a delta counts as "khớp" (rounding / minor-cent noise).
 * Intentionally the same value as `RECON_MATCH_BAND_VND` (recon-summary-stats) but a SEPARATE knob:
 * the settlement panel and the summary bar may tune their match tolerance independently.
 */
export const RECON_SETTLEMENT_MATCH_THRESHOLD = 1000

/** Panel state — drives tone + verdict copy. `progress` = chưa đến đợt tất toán (tiến độ < 100%). */
export type ReconSettleState = 'ready' | 'shortfall' | 'over' | 'progress'

export type ReconSettlementRow = {
  label: string
  /** Lũy kế đã / sẽ ĐC (bao gồm kỳ này). */
  actual: number
  /** MV dự kiến nhận (theo HĐPP). */
  expected: number
  /** Khoản giảm trừ — trừ vào Σ tổng (hiển thị vẫn là số dương). */
  negative?: boolean
}

export interface ReconSettlementResult {
  rows: ReconSettlementRow[]
  totalActual: number
  totalExpected: number
  diff: number
  matched: boolean
  isSettlement: boolean
  postPct: number
  state: ReconSettleState
  remainingReceivable: number
  hasExtra: boolean
  bonusOverMv: number
  // Intermediates the panel needs for the "Còn phải thu" formula tooltip.
  cumulativeFee: number
  cumulativeExtra: number
  cumulativeBonus: number
  cumulativeDeduct: number
  expectedBonus: number
  /** Extra-bonus term used in the "Còn phải thu" formula (0 when the line has no extra section). */
  extraActualForFormula: number
}

export interface ReconSettlementInput {
  item: InvestorReconciliationSheetCreateItemValues
  mv: ReconMvReference
  /** Đã filter loại phiếu đang xem/sửa (filterPriorHistoryRows) — các đợt ĐC trước của căn. */
  priorRows: HistoryRow[]
  periodCommission: number
  retroactiveAdjustment: number
  extraBonusPeriodAmount: number
  /**
   * Preset đối chiếu loại phí tăng thêm (F2/simple = false) ⇒ ẩn HOÀN TOÀN dòng "Phí tăng thêm" khỏi
   * bảng + loại khỏi Σ tổng & "Còn phải thu". Default true ⇒ CĐT (rich) bất biến.
   */
  includeExtraBonus?: boolean
  /** Nhãn dòng "thưởng cam kết" theo preset. Default 'Thưởng cam kết HĐPP' (CĐT); F2 ⇒ 'Thưởng cam kết'. */
  supplementaryRowLabel?: string
}

/** Full amount = explicit flat amount, else pct × base, else null when neither is defined. */
function fullAmount(pct: number | null, amt: number | null, base: number): number | null {
  if (amt != null) return amt
  if (pct != null) return (pct / 100) * base
  return null
}

/**
 * Pure settlement computation (mockup `SettlementCheck5`). Extracted from `ReconSettlementCheck` so
 * the cumulative-vs-expected math + state machine are unit-testable. Everything is on the GỒM VAT
 * basis (per-field rate of each kỳ).
 */
export function computeReconSettlement(input: ReconSettlementInput): ReconSettlementResult {
  const { item, mv, priorRows, periodCommission, retroactiveAdjustment, extraBonusPeriodAmount } =
    input
  const includeExtraBonus = input.includeExtraBonus ?? true
  const supplementaryRowLabel = input.supplementaryRowLabel ?? 'Thưởng cam kết HĐPP'

  const base = toNum(item.fee_calculation_price)
  const mvBase = mv.feeCalculationPrice ?? base

  const postPct = resolveEffectiveProgressToPct(item, priorRows)
  const isSettlement = postPct >= 100
  const countableRows = priorRows.filter(isCountableHistoryRow)

  const itemRate = resolveReconVatRate(item.vat_rate)
  const toInclusive = (amount: number, includeVat: boolean | null | undefined, rate: number) =>
    includeVat ? amount : amount * (1 + rate / 100)

  // Phí đại lý — lũy kế = Σ phí base lịch sử + HH đợt này + truy hồi kỳ này (truy hồi theo cờ %HH).
  const priorBaseFee = countableRows.reduce(
    (sum, row) =>
      sum +
      toInclusive(
        historyRowPeriodCommission(row),
        row.is_agency_fee_include_vat,
        resolveReconVatRate(row.vat_rate)
      ),
    0
  )
  const cumulativeFee =
    priorBaseFee +
    toInclusive(periodCommission + retroactiveAdjustment, item.is_agency_fee_include_vat, itemRate)
  const fullFeeAtLinePct =
    fullAmount(toNum(item.pct_agency_fee) || null, item.amt_agency_fee ?? null, base) ?? 0
  const expectedFee = toInclusive(
    fullAmount(mv.pctAgencyFee, mv.amtAgencyFee, mvBase) ?? fullFeeAtLinePct,
    mv.isAgencyFeeIncludeVat,
    itemRate
  )

  // Phí tăng thêm (Phần 4) — lũy kế = Σ đợt lịch sử + phí tăng thêm đợt này.
  const extraFull = extraBonusFull({
    feeCalculationPrice: base,
    extraBonusPct: item.extra_bonus_pct ?? null,
    extraBonusAmount: item.extra_bonus_amount ?? null,
  })
  const priorExtraFee = countableRows.reduce(
    (sum, row) =>
      sum +
      toInclusive(
        historyRowExtraPeriodCommission(row),
        row.is_extra_bonus_include_vat,
        resolveReconVatRate(row.vat_rate)
      ),
    0
  )
  const cumulativeExtra =
    priorExtraFee + toInclusive(extraBonusPeriodAmount, item.is_extra_bonus_include_vat, itemRate)
  const expectedExtra = toInclusive(
    fullAmount(mv.pctInvestorBonus, mv.amtInvestorBonus, mvBase) ?? extraFull,
    mv.isInvestorBonusIncludeVat,
    itemRate
  )
  // F2 (includeExtraBonus=false): KHÔNG theo dõi phí tăng thêm ⇒ ẩn dòng + loại khỏi Σ tổng & "còn phải thu".
  const hasExtra = includeExtraBonus && (expectedExtra > 0 || cumulativeExtra > 0)

  // Thưởng / Khấu trừ — lũy kế = các đợt trước (history) + kỳ này; đều quy gồm VAT theo cờ từng kỳ.
  // Thưởng tính theo số GHI NHẬN kỳ (shared_bonus_period_amount), không phải tổng thưởng (benchmark).
  const priorBonus = countableRows.reduce(
    (sum, row) =>
      sum +
      toInclusive(
        toNum(row.shared_bonus_period_amount),
        row.is_shared_bonus_include_vat,
        resolveReconVatRate(row.vat_rate)
      ),
    0
  )
  const priorDeduct = countableRows.reduce(
    (sum, row) =>
      sum +
      toInclusive(
        toNum(row.fee_deduction),
        row.is_fee_deduction_include_vat,
        resolveReconVatRate(row.vat_rate)
      ),
    0
  )
  const cumulativeBonus =
    priorBonus +
    toInclusive(toNum(item.shared_bonus_period_amount), item.is_shared_bonus_include_vat, itemRate)
  const cumulativeDeduct =
    priorDeduct +
    toInclusive(toNum(item.fee_deduction), item.is_fee_deduction_include_vat, itemRate)
  const expectedBonus = toInclusive(
    fullAmount(mv.pctSharedBonus, mv.amtSharedBonus, mvBase) ?? 0,
    mv.isSharedBonusIncludeVat,
    itemRate
  )
  // "Khấu trừ" expected = tổng giảm trừ ĐÃ CHỐT của deal (`deal.total_fee_deduction`, PRE-VAT) — quy
  // GỒM VAT như các dòng expected khác (pre-VAT ⇒ includeVat=false ⇒ ×(1+rate/100)). null (deal chưa
  // expose / chưa chốt) ⇒ 0: GIỮ NGUYÊN hành vi cũ.
  const expectedDeduct = toInclusive(mv.deductAgreed ?? 0, false, itemRate)

  const rows: ReconSettlementRow[] = [
    { label: 'Phí đại lý (base × % HH × 100%)', actual: cumulativeFee, expected: expectedFee },
    ...(hasExtra
      ? [
          {
            label: 'Phí tăng thêm (tiến độ riêng × 100%)',
            actual: cumulativeExtra,
            expected: expectedExtra,
          },
        ]
      : []),
    { label: supplementaryRowLabel, actual: cumulativeBonus, expected: expectedBonus },
    { label: 'Khấu trừ', actual: cumulativeDeduct, expected: expectedDeduct, negative: true },
  ]

  const sign = (row: ReconSettlementRow) => (row.negative ? -1 : 1)
  const totalActual = rows.reduce((sum, row) => sum + sign(row) * row.actual, 0)
  const totalExpected = rows.reduce((sum, row) => sum + sign(row) * row.expected, 0)
  const diff = totalActual - totalExpected
  const matched = Math.abs(diff) <= RECON_SETTLEMENT_MATCH_THRESHOLD

  const extraActualForFormula = hasExtra ? cumulativeExtra : 0
  const bonusOverMv = Math.max(cumulativeBonus - expectedBonus, 0)
  const remainingReceivable =
    totalExpected - (cumulativeFee + extraActualForFormula + bonusOverMv - cumulativeDeduct)

  const state: ReconSettleState = !isSettlement
    ? 'progress'
    : matched
      ? 'ready'
      : diff < 0
        ? 'shortfall'
        : 'over'

  return {
    rows,
    totalActual,
    totalExpected,
    diff,
    matched,
    isSettlement,
    postPct,
    state,
    remainingReceivable,
    hasExtra,
    bonusOverMv,
    cumulativeFee,
    cumulativeExtra,
    cumulativeBonus,
    cumulativeDeduct,
    expectedBonus,
    extraActualForFormula,
  }
}
