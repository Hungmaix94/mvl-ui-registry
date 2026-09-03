import { useMemo } from 'react'

import { formatCurrencyVND } from '@/utils/common'
import { CTVReconciliationPeriod_type } from '@/api/schema'
import type { InvestorReconciliationSheetCreateItemValues } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import {
  checkPaymentVariance,
  computeRetroactiveAdjustment,
  deriveReconLine,
  reconNetPerField,
  reconReceivableInclusive,
  resolvePriorAgreedTerms,
  resolveProgressBeforePct,
  toNum,
  type ReconAgreedTerms,
  type ReconLineComputation,
  type ReconLineComputationInput,
  type ReconNetComponent,
} from '@/features/sales/_shared/reconciliation/recon-calculations'

import type { ReconMvReference } from './useReconMvReference'
import { useReconKind } from './ReconKindContext'

/** Drift thresholds for the advisory compare warnings (D15/D16). */
const PRICE_DRIFT_THRESHOLD = 1 // VND
const PCT_DRIFT_THRESHOLD = 0.01 // percentage points

export type ReconLineIssueCode =
  | 'payment_variance_base'
  | 'payment_variance_extra_fee'
  | 'price_drift' // D15
  | 'agency_fee_mismatch' // D16
  | 'adjustment_requires_prior' // D1
  | 'adjustment_has_progress' // D9

/** info = lưu ý (xanh dương), warn = cảnh báo (amber), err = lỗi chặn (đỏ). */
export type ReconLineIssueSeverity = 'err' | 'warn' | 'info'

export interface ReconLineIssue {
  code: ReconLineIssueCode
  severity: ReconLineIssueSeverity
  message: string
}

/**
 * Authoritative server-computed fields off a saved `InvestorReconciliation` row. When present they
 * are preferred over the local preview computation (the row has been saved/confirmed). All optional
 * because draft rows have none.
 */
/** Tiến độ TT / phí tăng thêm đã ĐC (lũy kế) từ lịch sử căn — seed & hiển thị Phần 1/4. */
export type ReconPriorProgress = {
  paymentProgressToPct: number | null
  extraProgressToPct: number | null
  /** MAX progress_to_pct các kỳ ĐÃ confirmed — "tỉ lệ đã đối chiếu" cho truy hồi (Phần 2). */
  maxConfirmedProgressToPct?: number | null
  /** Agreed terms (giá + %HH) của kỳ ĐÃ confirmed gần nhất — "phí ĐL cũ" cho truy hồi (Phần 2). */
  latestConfirmedAgreedTerms?: ReconAgreedTerms | null
}

export interface ReconServerComputed {
  period_commission?: string | number | null
  sub_total_commission?: string | number | null
  total_amount?: string | number | null
  vat_amount?: string | number | null
  total_amount_with_vat?: string | number | null
  retroactive_adjustment_amount?: string | number | null
  payout_ratio_snapshot?: string | number | null
  prior_received_total?: string | number | null
  /** Phí tăng thêm đợt này (BE tính, read-only). `null` ⇒ BE không ghi nhận phí tăng thêm kỳ này = 0. */
  extra_bonus_period_amount?: string | number | null
  /** Σ thưởng đại lý đã chia về Sale/F2 kỳ này (BE tính, read-only) — hiển thị cạnh núm % chia. */
  shared_bonus_to_sale_amount?: string | number | null
  /** CTV (PIT): thuế TNCN khấu trừ kỳ này (BE tính). */
  pit_amount?: string | number | null
  /** CTV (PIT): thực nhận sau thuế TNCN (BE tính = total_amount − pit_amount). */
  total_amount_after_pit?: string | number | null
  /** CTV (PIT): mức thuế TNCN (%) — snapshot BE, mặc định 10. */
  pit_rate?: string | number | null
  /** CĐT: thưởng bổ sung đã tạm ứng được cấn TRỪ kỳ này (BE prefill/recompute, read-only). */
  shared_bonus_prepaid_amount?: string | number | null
  /** CĐT: còn phải thu = total_amount_with_vat − shared_bonus_prepaid_amount (BE tính, read-only). */
  amount_to_collect?: string | number | null
}

/** Self-contained display contract for a line's preview row + Phần 2 (truy hồi). */
export interface ReconLineDerived {
  progressDelta: number
  periodCommission: number
  extraBonusPeriodAmount: number
  retroactiveAdjustment: number
  subTotalCommission: number
  totalAmount: number
  vatAmount: number
  totalAmountWithVat: number
  /** NET (chưa VAT) tính PER-FIELD: chỉ mục có cờ `is_*_include_vat` mới quy ngược chia (1+rate/100). */
  netAmount: number
  /** "Phải thu (CĐT trả)" cơ sở GỒM VAT per-field: mục chưa gồm VAT ×(1+rate/100) (= netAmount×(1+r)). */
  receivableInclusive: number
  payoutRatio: number | null
  priorReceivedTotal: number | null
  /** Σ thưởng đại lý đã chia về Sale/F2 kỳ này (BE-computed, read-only). `null` khi căn chưa có số BE. */
  sharedBonusToSaleAmount: number | null
  /** CTV (PIT): thuế TNCN khấu trừ kỳ này (BE-computed). VAT mode = 0. */
  pitAmount: number
  /** CTV (PIT): thực nhận sau thuế TNCN (BE-computed). VAT mode = 0. */
  totalAmountAfterPit: number
  /** CTV (PIT): mức thuế TNCN (%) từ BE. VAT mode = 0. */
  pitRate: number
  /** CĐT: tạm ứng thưởng cấn trừ kỳ này (BE-computed). `null` khi chưa có số BE — FE không tự tính. */
  sharedBonusPrepaidAmount: number | null
  /** CĐT: còn phải thu sau cấn tạm ứng (BE-computed). `null` khi chưa có số BE — FE không tự tính. */
  amountToCollect: number | null
  /** True when authoritative server fields were used (saved/confirmed row). */
  isServerComputed: boolean
  issues: ReconLineIssue[]
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function formatVnd(value: number): string {
  return formatCurrencyVND(value, { maximumFractionDigits: 0 })
}

function formatSignedVnd(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatVnd(Math.abs(value))}`
}

/** Prefer a present server value over the local preview number. */
function preferServer(serverValue: string | number | null | undefined, localValue: number): number {
  return serverValue == null ? localValue : toNum(serverValue)
}

/** Effective %HH for the user input: explicit pct, or derived from a fixed amount over the base. */
function effectivePct(pct: number | null, amt: number | null, base: number): number | null {
  if (pct != null) return pct
  if (amt != null && base > 0) return (amt / base) * 100
  return null
}

/**
 * NET (chưa VAT) PER-FIELD cho một dòng form: chỉ mục có cờ `is_*_include_vat` mới quy ngược VAT
 * (chia (1 + vat_rate/100)); mục không cờ giữ nguyên. Truy hồi đi theo cờ %HH (là điều chỉnh phí đại
 * lý — không có cờ riêng). Khấu trừ là mục TRỪ ⇒ truyền số âm. Dùng chung cho config table / header /
 * footer để FE preview nhất quán (BE tính lại per-field khi lưu).
 */
type ReconLineAmounts = {
  periodCommission: number
  retroactiveAdjustment: number
  extraBonusPeriodAmount: number
}

/** Các thành phần "Phải thu" + cờ VAT từng mục — dùng chung cho NET & Phải thu (gồm VAT). */
function reconLineComponents(
  line: InvestorReconciliationSheetCreateItemValues,
  c: ReconLineAmounts
): ReconNetComponent[] {
  return [
    { amount: c.periodCommission, includeVat: !!line.is_agency_fee_include_vat },
    { amount: c.retroactiveAdjustment, includeVat: !!line.is_agency_fee_include_vat },
    { amount: c.extraBonusPeriodAmount, includeVat: !!line.is_extra_bonus_include_vat },
    {
      amount: toNum(line.shared_bonus_period_amount),
      includeVat: !!line.is_shared_bonus_include_vat,
    },
    { amount: -toNum(line.fee_deduction), includeVat: !!line.is_fee_deduction_include_vat },
  ]
}

export function reconLineNetAmount(
  line: InvestorReconciliationSheetCreateItemValues,
  c: ReconLineAmounts
): number {
  return reconNetPerField(reconLineComponents(line, c), line.vat_rate)
}

/**
 * "Phải thu (CĐT trả)" PER-FIELD trên cơ sở GỒM VAT: mục đã gồm VAT giữ nguyên, mục CHƯA gồm VAT
 * ×(1+rate/100). Nghịch đảo của {@link reconLineNetAmount} (= NET × (1+rate/100)). Dùng chung cho
 * config table / lịch sử / footer để "Phải thu" nhất quán cơ sở gồm VAT.
 */
export function reconLineReceivableInclusive(
  line: InvestorReconciliationSheetCreateItemValues,
  c: ReconLineAmounts
): number {
  return reconReceivableInclusive(reconLineComponents(line, c), line.vat_rate)
}

const EMPTY_DERIVED: ReconLineDerived = {
  progressDelta: 0,
  periodCommission: 0,
  extraBonusPeriodAmount: 0,
  retroactiveAdjustment: 0,
  subTotalCommission: 0,
  totalAmount: 0,
  vatAmount: 0,
  totalAmountWithVat: 0,
  netAmount: 0,
  receivableInclusive: 0,
  payoutRatio: null,
  priorReceivedTotal: null,
  sharedBonusToSaleAmount: null,
  pitAmount: 0,
  totalAmountAfterPit: 0,
  pitRate: 0,
  sharedBonusPrepaidAmount: null,
  amountToCollect: null,
  isServerComputed: false,
  issues: [],
}

/**
 * Map a form line to the pure §11 computation input. Shared by the line preview hook, the form
 * footer summary, and the sticky summary bar so the mapping lives in exactly one place.
 */
/** Ưu tiên số BE đã lưu; không thì preview theo công thức truy hồi §11. */
export function resolveRetroactiveAmount(
  line: InvestorReconciliationSheetCreateItemValues,
  options: {
    serverAmount?: string | number | null
    priorProgress?: ReconPriorProgress | null
    mv: ReconMvReference
  }
): number {
  if (options.serverAmount != null && options.serverAmount !== '') {
    return toNum(options.serverAmount)
  }

  // "Phí ĐL cũ" = agreed terms (giá + %HH) của kỳ đối chiếu ĐÃ confirmed gần nhất; fallback HĐPP (MV)
  // khi chưa có kỳ confirmed nào (user chốt 2026-06-09 — đổi từ "luôn HĐPP" sang "kỳ confirmed trước").
  // "Tỉ lệ đã đối chiếu" = MAX progress_to các kỳ ĐÃ confirmed (mức cao nhất đã chốt) — không lấy progress
  // _from kỳ này. → truy hồi = (phí ĐL theo CĐT đề nghị − phí ĐL kỳ trước) × max-tiến-độ-đã-confirmed.
  // Đợt đầu (chưa có kỳ confirmed) ⇒ tiến độ = 0 ⇒ truy hồi = 0 (xem computeRetroactiveAdjustment).
  const priorTerms = resolvePriorAgreedTerms(
    options.priorProgress?.latestConfirmedAgreedTerms ?? null,
    options.mv
  )
  return computeRetroactiveAdjustment({
    progressFromPct: options.priorProgress?.maxConfirmedProgressToPct ?? null,
    newTerms: {
      feeCalculationPrice:
        line.fee_calculation_price ?? options.mv.feeCalculationPrice ?? options.mv.listedPrice ?? 0,
      pctAgencyFee: line.pct_agency_fee,
      amtAgencyFee: line.amt_agency_fee,
    },
    priorTerms,
  })
}

/** Lịch sử căn để căn chỉnh tiến độ + baseline truy hồi (dùng footer / summary bar). */
export type ReconHistoryContext = {
  /** Agreed terms (giá + %HH) của kỳ ĐÃ confirmed gần nhất — "phí ĐL cũ" cho truy hồi. */
  latestConfirmedAgreedTerms: ReconAgreedTerms | null
  latestProgressToPct: number | null
  latestExtraProgressToPct: number | null
  /** MAX progress_to_pct các kỳ ĐÃ confirmed — "tỉ lệ đã đối chiếu" cho truy hồi. */
  maxConfirmedProgressToPct: number | null
}

/**
 * Preview §11 cho một dòng — cùng luồng với `useReconLineDerived` (truy hồi + tiến độ lịch sử).
 * Net = Hoa hồng đợt + Truy hồi + Thưởng − Khấu trừ + Phí tăng thêm.
 */
/**
 * Cờ §11 theo preset đối chiếu. `includeExtraBonus=false` (F2/simple) loại HOÀN TOÀN phí tăng thêm
 * khỏi MỌI công thức (HH đợt không đổi, nhưng subtotal/total/VAT/NET/Phải thu/payout không cộng phí
 * tăng thêm) — "ẩn khỏi UI ⇒ không là phần tử trong công thức". Default `true` ⇒ CĐT (rich) bất biến.
 */
export type ReconComputeOptions = {
  includeExtraBonus?: boolean
  /**
   * Phát cảnh báo "TT thực tế lệch…" (so amt_payment_this_period với HH-đợt). Default `true` = CĐT.
   * F2 (false): `amt_payment_this_period` là khoản giải ngân prefill từ CĐT cha, không cùng thang
   * HH-đợt-F2 ⇒ cảnh báo vô nghĩa, bỏ qua.
   */
  includePayoutRatio?: boolean
}

export function computeReconItemPreview(
  line: InvestorReconciliationSheetCreateItemValues,
  mv: ReconMvReference,
  history?: ReconHistoryContext | null,
  options?: ReconComputeOptions
): { computation: ReconLineComputation; retroactiveAdjustment: number } {
  const priorProgress: ReconPriorProgress | null = history
    ? {
        paymentProgressToPct: history.latestProgressToPct,
        extraProgressToPct: history.latestExtraProgressToPct,
        maxConfirmedProgressToPct: history.maxConfirmedProgressToPct,
        latestConfirmedAgreedTerms: history.latestConfirmedAgreedTerms,
      }
    : null

  const retroactiveAdjustment = resolveRetroactiveAmount(line, {
    priorProgress,
    mv,
  })

  const mvPrice = mv.feeCalculationPrice ?? mv.listedPrice ?? 0
  const computation = deriveReconLine(
    toReconLineComputationInput(line, retroactiveAdjustment, priorProgress, options, mvPrice)
  )

  return { computation, retroactiveAdjustment }
}

export function toReconLineComputationInput(
  line: InvestorReconciliationSheetCreateItemValues,
  retroactiveAdjustment = 0,
  priorProgress?: ReconPriorProgress | null,
  options?: ReconComputeOptions,
  mvPrice?: number | null
): ReconLineComputationInput {
  // Preset loại phí tăng thêm ⇒ null hoá toàn bộ field extra để `extraBonusFull = 0` ⇒
  // `extraBonusPeriodAmount = 0` chảy xuống mọi tổng (subtotal/total/VAT/NET/Phải thu/payout).
  const includeExtraBonus = options?.includeExtraBonus ?? true
  return {
    feeCalculationPrice: line.fee_calculation_price ?? mvPrice ?? 0,
    pctAgencyFee: line.pct_agency_fee,
    amtAgencyFee: line.amt_agency_fee,
    progressFromPct: resolveProgressBeforePct(
      line.progress_from_pct,
      priorProgress?.paymentProgressToPct ?? null
    ),
    progressToPct: line.progress_to_pct,
    sharedBonusPeriodAmount: line.shared_bonus_period_amount,
    feeDeduction: line.fee_deduction,
    extraBonusPct: includeExtraBonus ? line.extra_bonus_pct : null,
    extraBonusAmount: includeExtraBonus ? line.extra_bonus_amount : null,
    extraProgressFromPct: includeExtraBonus
      ? resolveProgressBeforePct(
          line.extra_bonus_progress_from_pct,
          priorProgress?.extraProgressToPct ?? null
        )
      : null,
    extraProgressToPct: includeExtraBonus ? line.extra_bonus_progress_to_pct : null,
    amtPaymentThisPeriod: line.amt_payment_this_period,
    vatRate: line.vat_rate,
    retroactiveAdjustment,
  }
}

/**
 * Pure advisory-issue builder for one reconciliation line.
 *
 * Compares the live form values (and the §11 preview computation `c`) against the MV reference to
 * surface non-blocking warnings: payment variance (Phần 1 / Phần 4, threshold 10.000đ), D15 price
 * drift, and D16 %HH mismatch. D15/D16 are only emitted when the MV reference is present.
 *
 * Shared by {@link useReconLineDerived} (per-line preview) and the sticky summary bar (warning
 * count) so the issue logic lives in exactly one place.
 */
export function computeReconLineIssues(
  line: InvestorReconciliationSheetCreateItemValues,
  c: ReconLineComputation,
  mv: ReconMvReference,
  /** Căn đã có đợt đối chiếu trước chưa. `false` = đã tải lịch sử & rỗng (phát D1); `undefined` = chưa biết (bỏ qua D1). */
  hasPriorHistory?: boolean,
  options?: ReconComputeOptions
): ReconLineIssue[] {
  const includeExtraBonus = options?.includeExtraBonus ?? true
  const includePayoutRatio = options?.includePayoutRatio ?? true
  const issues: ReconLineIssue[] = []

  const isAdjustmentOnly = line.period_type === CTVReconciliationPeriod_type.adjustment_only

  // D1 (err) — Kỳ điều chỉnh thuần chỉ hợp lệ khi căn ĐÃ có đợt trước để truy hồi. Chỉ phát khi đã
  // BIẾT chắc lịch sử rỗng (hasPriorHistory === false), tránh báo nhầm trong lúc còn đang tải.
  if (isAdjustmentOnly && hasPriorHistory === false) {
    issues.push({
      code: 'adjustment_requires_prior',
      severity: 'err',
      message:
        'D1: Chưa có lịch sử đối chiếu — không thể tạo Kỳ điều chỉnh thuần (cần đợt trước để truy hồi)',
    })
  }

  // D9 (info) — Kỳ điều chỉnh thuần mà vẫn tăng tiến độ đợt này → gợi ý đổi sang Kỳ tiến độ kèm điều chỉnh.
  if (isAdjustmentOnly && c.progressDelta > 0) {
    issues.push({
      code: 'adjustment_has_progress',
      severity: 'info',
      message: 'D9: Đã nhập % TT đợt > 0 — cân nhắc đổi sang Kỳ tiến độ kèm điều chỉnh',
    })
  }

  // Phần 1 — actual payment vs computed base commission (advisory, threshold 10.000đ).
  // Bỏ qua khi preset tắt payout (F2): amt_payment_this_period không cùng thang HH-đợt-F2.
  if (includePayoutRatio && line.amt_payment_this_period != null) {
    const variance = checkPaymentVariance(line.amt_payment_this_period, c.periodCommission)
    if (variance.warn) {
      issues.push({
        code: 'payment_variance_base',
        severity: 'warn',
        message: `TT thực tế lệch ${formatSignedVnd(variance.variance)} so với phí ĐL kỳ này dự kiến (${formatVnd(c.periodCommission)})`,
      })
    }
  }

  // Phần 4 — actual extra-fee payment vs computed extra amount. Bỏ qua khi preset loại phí tăng thêm.
  if (includeExtraBonus && line.amt_extra_bonus_payment_this_period != null) {
    const variance = checkPaymentVariance(
      line.amt_extra_bonus_payment_this_period,
      c.extraBonusPeriodAmount
    )
    if (variance.warn) {
      issues.push({
        code: 'payment_variance_extra_fee',
        severity: 'warn',
        message: `Phí tăng thêm thực tế lệch ${formatSignedVnd(variance.variance)} so với dự kiến (${formatVnd(c.extraBonusPeriodAmount)})`,
      })
    }
  }

  // D15 — giá tính phí lệch so với hệ thống (HĐMB / niêm yết).
  const refPrice = mv.feeCalculationPrice ?? mv.listedPrice
  if (
    refPrice != null &&
    line.fee_calculation_price != null &&
    Math.abs(refPrice - line.fee_calculation_price) > PRICE_DRIFT_THRESHOLD
  ) {
    issues.push({
      code: 'price_drift',
      severity: 'warn',
      message: `Giá tính phí lệch ${formatSignedVnd((line.fee_calculation_price ?? 0) - refPrice)} so với hệ thống (${formatVnd(refPrice)})`,
    })
  }

  // D16 — %HH đại lý khác cấu hình HĐPP.
  const linePct = effectivePct(
    line.pct_agency_fee,
    line.amt_agency_fee,
    line.fee_calculation_price ?? refPrice ?? 0
  )
  if (
    mv.pctAgencyFee != null &&
    linePct != null &&
    Math.abs(mv.pctAgencyFee - linePct) > PCT_DRIFT_THRESHOLD
  ) {
    issues.push({
      code: 'agency_fee_mismatch',
      severity: 'warn',
      message: `%HH đại lý (${round2(linePct)}%) khác cấu hình HĐPP (${round2(mv.pctAgencyFee)}%)`,
    })
  }

  return issues
}

/**
 * Pure derivation of a reconciliation line's computed preview + advisory issues.
 *
 * Computation prefers authoritative server fields when the row is saved/confirmed
 * ({@link ReconServerComputed}); otherwise it falls back to the local §11 preview math. The
 * advisory `issues` (payment variance, D15 price drift, D16 %HH mismatch) are always computed from
 * the live form values against the MV reference — they guide the user before saving.
 */
export function useReconLineDerived(
  line: InvestorReconciliationSheetCreateItemValues | undefined,
  mv: ReconMvReference,
  serverComputed?: ReconServerComputed | null,
  /** Truyền từ lịch sử đã load (LineCard) để phát D1. `undefined` khi chưa biết → bỏ qua D1. */
  hasPriorHistory?: boolean,
  /** Tiến độ lũy kế đã ĐC + max-confirmed (từ lịch sử căn) — seed `progress_from` + baseline truy hồi. */
  priorProgress?: ReconPriorProgress | null
): ReconLineDerived {
  // Preset đối chiếu: F2 (simple) loại phí tăng thêm + payout khỏi công thức. Fallback ngoài provider
  // = rich (CĐT) ⇒ cả hai = true ⇒ hành vi cũ bất biến.
  const { extraBonus: includeExtraBonus, payoutRatio: includePayoutRatio } = useReconKind().features
  return useMemo<ReconLineDerived>(() => {
    if (!line) {
      return { ...EMPTY_DERIVED, priorReceivedTotal: mv.priorReceivedTotal }
    }

    const retro = resolveRetroactiveAmount(line, {
      serverAmount: serverComputed?.retroactive_adjustment_amount,
      priorProgress: priorProgress ?? null,
      mv,
    })

    const mvPrice = mv.feeCalculationPrice ?? mv.listedPrice ?? 0
    const input = toReconLineComputationInput(
      line,
      retro,
      priorProgress,
      { includeExtraBonus },
      mvPrice
    )

    const c = deriveReconLine(input)
    const isServerComputed = serverComputed != null && serverComputed.total_amount != null

    const issues = computeReconLineIssues(line, c, mv, hasPriorHistory, {
      includeExtraBonus,
      includePayoutRatio,
    })

    const periodCommission = preferServer(serverComputed?.period_commission, c.periodCommission)
    // Màn đối chiếu CĐT: FE KHÔNG tự tính. Dòng đã có số BE ⇒ lấy thẳng extra_bonus_period_amount của
    // BE (null ⇒ 0, BE không ghi nhận phí tăng thêm kỳ này). Chỉ preview FE-local khi chưa có số BE.
    const extraBonusPeriodAmount = isServerComputed
      ? serverComputed?.extra_bonus_period_amount !== undefined
        ? toNum(serverComputed?.extra_bonus_period_amount)
        : c.extraBonusPeriodAmount
      : c.extraBonusPeriodAmount
    const amounts = {
      periodCommission,
      retroactiveAdjustment: retro,
      extraBonusPeriodAmount,
    }

    return {
      progressDelta: c.progressDelta,
      periodCommission,
      extraBonusPeriodAmount,
      retroactiveAdjustment: retro,
      subTotalCommission: preferServer(serverComputed?.sub_total_commission, c.subTotalCommission),
      totalAmount: preferServer(serverComputed?.total_amount, c.totalAmount),
      vatAmount: preferServer(serverComputed?.vat_amount, c.vatAmount),
      totalAmountWithVat: preferServer(serverComputed?.total_amount_with_vat, c.totalAmountWithVat),
      // NET per-field (CĐT preview) — nhưng KHI có số BE (F2 saved row) thì lấy thẳng `total_amount`
      // của BE: công thức per-field FE KHÔNG khớp cách BE tính tổng cho F2 (xem project_f2_recon_ui_gaps).
      netAmount: preferServer(serverComputed?.total_amount, reconLineNetAmount(line, amounts)),
      // Phải thu (gồm VAT): tương tự — ưu tiên `total_amount_with_vat` của BE khi có.
      receivableInclusive: preferServer(
        serverComputed?.total_amount_with_vat,
        reconLineReceivableInclusive(line, amounts)
      ),
      // BE không trả payout_ratio_snapshot ⇒ KHÔNG tự tính trên dòng đã có số BE (ẩn). Chỉ preview khi nháp.
      payoutRatio: isServerComputed
        ? serverComputed?.payout_ratio_snapshot != null
          ? toNum(serverComputed.payout_ratio_snapshot)
          : null
        : c.payoutRatio,
      priorReceivedTotal:
        serverComputed?.prior_received_total != null
          ? toNum(serverComputed.prior_received_total)
          : mv.priorReceivedTotal,
      // Read-only: chỉ hiển thị khi BE đã trả số (căn đã lưu). FE không tự tính (cần định mức F2/CTV).
      sharedBonusToSaleAmount:
        serverComputed?.shared_bonus_to_sale_amount != null
          ? toNum(serverComputed.shared_bonus_to_sale_amount)
          : null,
      // CTV (PIT): thuế TNCN + thực nhận sau thuế lấy THẲNG từ BE (FE không tự tính). VAT mode ⇒ 0.
      pitAmount: toNum(serverComputed?.pit_amount),
      totalAmountAfterPit: toNum(serverComputed?.total_amount_after_pit),
      pitRate: toNum(serverComputed?.pit_rate),
      // CĐT: tạm ứng thưởng cấn kỳ này + còn phải thu lấy THẲNG từ BE; chưa có số BE ⇒ null (ẩn dòng).
      sharedBonusPrepaidAmount:
        serverComputed?.shared_bonus_prepaid_amount != null
          ? toNum(serverComputed.shared_bonus_prepaid_amount)
          : null,
      amountToCollect:
        serverComputed?.amount_to_collect != null ? toNum(serverComputed.amount_to_collect) : null,
      isServerComputed,
      issues,
    }
  }, [
    line,
    mv,
    serverComputed,
    hasPriorHistory,
    priorProgress,
    includeExtraBonus,
    includePayoutRatio,
  ])
}
