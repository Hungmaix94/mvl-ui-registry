import type { components } from '@/api/schema'
import { ReconciliationStatus } from '@/constants/api-schema-aliases'

type InvestorReconciliationHistoryRow = components['schemas']['InvestorReconciliationHistory']

/**
 * Pure money/progress computations for investor reconciliation lines (recon_flows §11).
 *
 * These are PREVIEW computations for unsaved/draft rows. When a row is saved/confirmed, prefer the
 * server-returned authoritative fields (`total_amount`, `retroactive_adjustment_amount`,
 * `payout_ratio_snapshot`, …) over these. Money = VND (no decimals). Percent = number (e.g. 3 = 3%).
 */

/** Non-blocking payment-variance threshold: |actual − expected| > 10.000đ ⇒ warning. */
export const RECON_PAYMENT_VARIANCE_THRESHOLD = 10_000

/** Mức VAT mặc định (%) — VAT luôn áp dụng cho mọi căn đối chiếu CĐT. */
export const INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE = 10

export function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Mức VAT hiệu lực của một căn/kỳ. VAT LUÔN tồn tại trên căn (mặc định 10%); cờ `is_*_include_vat`
 * chỉ nói số NHẬP của từng mục đã gồm VAT hay chưa — KHÔNG quyết định căn có VAT hay không.
 * `vat_rate` null/'' (dữ liệu cũ lưu khi tắt hết cờ, hoặc BE omit) ⇒ mức mặc định; rate 0 TƯỜNG MINH
 * vẫn được tôn trọng (kỳ không VAT).
 */
export function resolveReconVatRate(rate: number | string | null | undefined): number {
  if (rate === null || rate === undefined || rate === '') {
    return INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE
  }
  return toNum(rate)
}

/** VND — luôn là số nguyên (không lẻ xu). */
export function roundReconVnd(value: number): number {
  return Math.round(value)
}

/** Δtiến độ = (đến − từ) / 100. 0 nếu thiếu một trong hai mốc. */
export function progressDelta(fromPct: number | null, toPct: number | null): number {
  if (fromPct == null || toPct == null) return 0
  return (toPct - fromPct) / 100
}

/** Giá + %HH/phí cố định dùng cho tổng phí ĐL đầy đủ (100%). */
export type ReconAgreedTerms = {
  feeCalculationPrice: number
  pctAgencyFee: number | null
  amtAgencyFee: number | null
}

/** Tổng phí HH đại lý cho cả căn (trước khi nhân tiến độ). */
export function agencyCommissionFull(input: ReconAgreedTerms): number {
  if (input.amtAgencyFee != null) return roundReconVnd(input.amtAgencyFee)
  return roundReconVnd((input.feeCalculationPrice * toNum(input.pctAgencyFee)) / 100)
}

const RETRO_PRICE_EPS = 1
const RETRO_FEE_EPS = 1

/**
 * Phần 2 — truy hồi (mockup `deriveV5`):
 * `(Tổng phí ĐL mới − Tổng phí ĐL cũ) × (tỉ lệ đã đối chiếu / 100)` với `priorPct = progress_from_pct`.
 * Chỉ áp dụng khi đổi giá tính phí hoặc đổi %HH/phí cố định so với kỳ tham chiếu.
 */
export function computeRetroactiveAdjustment(input: {
  progressFromPct: number | null
  newTerms: ReconAgreedTerms
  priorTerms: ReconAgreedTerms | null
}): number {
  const priorPct = input.progressFromPct ?? 0
  if (priorPct <= 0 || !input.priorTerms) return 0

  const newTotal = agencyCommissionFull(input.newTerms)
  const oldTotal = agencyCommissionFull(input.priorTerms)

  const priceChanged =
    Math.abs(input.newTerms.feeCalculationPrice - input.priorTerms.feeCalculationPrice) >
    RETRO_PRICE_EPS
  const feeChanged = Math.abs(newTotal - oldTotal) > RETRO_FEE_EPS

  if (!priceChanged && !feeChanged) return 0

  return Math.round(((newTotal - oldTotal) * priorPct) / 100)
}

/** Kỳ gần nhất trong lịch sử; nếu chưa có lịch sử thì fallback MV (HĐPP). */
export function resolvePriorAgreedTerms(
  priorFromHistory: ReconAgreedTerms | null,
  mv: {
    feeCalculationPrice: number | null
    pctAgencyFee: number | null
    amtAgencyFee: number | null
  }
): ReconAgreedTerms | null {
  if (priorFromHistory) return priorFromHistory
  if (mv.feeCalculationPrice == null) return null
  return {
    feeCalculationPrice: mv.feeCalculationPrice,
    pctAgencyFee: mv.pctAgencyFee,
    amtAgencyFee: mv.amtAgencyFee,
  }
}

/** HH kỳ này = tổng phí HH × Δtiến độ. */
export function computePeriodCommission(input: {
  feeCalculationPrice: number
  pctAgencyFee: number | null
  amtAgencyFee: number | null
  progressDelta: number
}): number {
  return roundReconVnd(agencyCommissionFull(input) * input.progressDelta)
}

/** Tổng phí tăng thêm cho cả căn (trước khi nhân tiến độ riêng). */
export function extraBonusFull(input: {
  feeCalculationPrice: number
  extraBonusPct: number | null
  extraBonusAmount: number | null
}): number {
  if (input.extraBonusAmount != null) return roundReconVnd(input.extraBonusAmount)
  if (input.extraBonusPct != null) {
    return roundReconVnd((input.feeCalculationPrice * input.extraBonusPct) / 100)
  }
  return 0
}

/** VAT = total × rate/100, làm tròn VND. 0 nếu rate null (VAT tắt). */
export function computeVatAmount(totalAmount: number, vatRate: number | null): number {
  if (vatRate == null) return 0
  return roundReconVnd((totalAmount * vatRate) / 100)
}

/**
 * Quy NET (chưa VAT) NGƯỢC từ số ĐÃ GỒM VAT (mô hình inclusive): các mục đối chiếu được nhập là số
 * đã gồm VAT ⇒ "Phải thu (đã gồm VAT)" = tổng các mục; NET = Phải thu / (1 + rate/100).
 * `vatRate` null ⇒ không có VAT ⇒ giữ nguyên (số nhập = NET).
 */
export function reconNetFromInclusive(
  inclusiveAmount: number,
  vatRate: number | null | undefined
): number {
  if (vatRate == null) return roundReconVnd(inclusiveAmount)
  const factor = 1 + vatRate / 100
  if (factor <= 0) return roundReconVnd(inclusiveAmount)
  return roundReconVnd(inclusiveAmount / factor)
}

/**
 * Cặp (chưa VAT | gồm VAT) cho MỘT số tiền theo cờ include-VAT của mục (mô hình inclusive per-field) —
 * dùng cho hiển thị 2 cột "Chưa VAT | Gồm VAT" ở "Tổng số tiền đối chiếu kỳ này"
 * ({@link file://InvestorReconciliationUnitLedger}):
 * - includeVat=false ⇒ số nhập là số THUẦN ⇒ chưa VAT = amount, gồm VAT = amount × (1 + rate/100);
 * - includeVat=true  ⇒ số nhập ĐÃ gồm VAT ⇒ gồm VAT = amount, chưa VAT = amount / (1 + rate/100).
 * `vatRate` null / factor ≤ 0 ⇒ không quy đổi ⇒ hai giá trị bằng nhau (= amount). Mục giảm trừ truyền
 * `amount` âm. Đối xứng nghịch đảo của {@link reconNetFromInclusive}.
 */
export function reconVatPair(
  amount: number,
  includeVat: boolean,
  vatRate: number | null | undefined
): { noVat: number; vat: number } {
  const factor = vatRate == null ? 1 : 1 + vatRate / 100
  if (vatRate == null || factor <= 0) {
    const v = roundReconVnd(amount)
    return { noVat: v, vat: v }
  }
  if (includeVat) {
    return { noVat: roundReconVnd(amount / factor), vat: roundReconVnd(amount) }
  }
  return { noVat: roundReconVnd(amount), vat: roundReconVnd(amount * factor) }
}

/** Một thành phần của "Phải thu" + cờ có-gồm-VAT riêng của nó (mô hình inclusive per-field). */
export type ReconNetComponent = {
  /** Số tiền ĐÃ NHẬP của mục (mục giảm trừ truyền số ÂM). */
  amount: number
  /** `true` ⇒ số nhập đã gồm VAT ⇒ NET = amount / (1 + rate/100); `false` ⇒ không VAT ⇒ NET = amount. */
  includeVat: boolean
}

/**
 * NET (chưa VAT) theo TỪNG MỤC (per-field, mô hình inclusive). Mỗi mục độc lập "gồm VAT" hay không:
 * - mục gồm VAT  ⇒ quy ngược NET = amount / (1 + rate/100);
 * - mục không VAT ⇒ giữ nguyên amount.
 * `vatRate` null ⇒ không có VAT ở mục nào ⇒ NET = Σ amount. Mục giảm trừ truyền `amount` âm.
 * (Phải thu/gồm VAT = Σ amount BẤT BIẾN — không phụ thuộc cờ; chênh lệch chính là tổng VAT.)
 */
export function reconNetPerField(
  components: ReconNetComponent[],
  vatRate: number | null | undefined
): number {
  const sumRaw = components.reduce((s, c) => s + c.amount, 0)
  if (vatRate == null) return roundReconVnd(sumRaw)
  const factor = 1 + vatRate / 100
  if (factor <= 0) return roundReconVnd(sumRaw)
  const net = components.reduce((s, c) => s + (c.includeVat ? c.amount / factor : c.amount), 0)
  return roundReconVnd(net)
}

/**
 * "Phải thu (CĐT trả)" theo cơ sở GỒM VAT theo TỪNG MỤC — nghịch đảo của {@link reconNetPerField}:
 * - mục ĐÃ gồm VAT  ⇒ giữ nguyên amount;
 * - mục CHƯA gồm VAT ⇒ quy LÊN amount × (1 + rate/100) để cùng cơ sở gồm VAT.
 * `vatRate` null ⇒ không có VAT ⇒ Phải thu = Σ amount. Mục giảm trừ truyền `amount` âm. Đẳng thức:
 * reconReceivableInclusive = reconNetPerField × (1 + rate/100) ⇒ VAT = Phải thu − NET.
 */
export function reconReceivableInclusive(
  components: ReconNetComponent[],
  vatRate: number | null | undefined
): number {
  const sumRaw = components.reduce((s, c) => s + c.amount, 0)
  if (vatRate == null) return roundReconVnd(sumRaw)
  const factor = 1 + vatRate / 100
  if (factor <= 0) return roundReconVnd(sumRaw)
  const gross = components.reduce((s, c) => s + (c.includeVat ? c.amount : c.amount * factor), 0)
  return roundReconVnd(gross)
}

export function checkPaymentVariance(
  actual: number | null,
  expected: number
): { variance: number; warn: boolean } {
  if (actual == null) return { variance: 0, warn: false }
  const variance = actual - expected
  return { variance, warn: Math.abs(variance) > RECON_PAYMENT_VARIANCE_THRESHOLD }
}

export type ReconLineComputation = {
  progressDelta: number
  periodCommission: number
  extraBonusFull: number
  extraBonusPeriodAmount: number
  subTotalCommission: number
  totalAmount: number
  vatAmount: number
  totalAmountWithVat: number
  payoutBasis: number
  payoutRatio: number | null
}

export type ReconLineComputationInput = {
  feeCalculationPrice: number
  pctAgencyFee: number | null
  amtAgencyFee: number | null
  progressFromPct: number | null
  progressToPct: number | null
  /** Thưởng đại lý GHI NHẬN kỳ này (shared_bonus_period_amount) — INFLOW vào sub_total. */
  sharedBonusPeriodAmount: number
  feeDeduction: number
  extraBonusPct: number | null
  extraBonusAmount: number | null
  extraProgressFromPct: number | null
  extraProgressToPct: number | null
  amtPaymentThisPeriod: number | null
  vatRate: number | null
  /** Server-frozen truy hồi; 0 cho bản nháp. */
  retroactiveAdjustment?: number
}

/** Hoa hồng đợt (phí base) của một dòng lịch sử đối chiếu đã lưu. */
export function historyRowPeriodCommission(row: InvestorReconciliationHistoryRow): number {
  const base = toNum(row.fee_calculation_price)
  const pd = progressDelta(
    row.progress_from_pct != null ? toNum(row.progress_from_pct) : null,
    row.progress_to_pct != null ? toNum(row.progress_to_pct) : null
  )
  return computePeriodCommission({
    feeCalculationPrice: base,
    pctAgencyFee: row.pct_agency_fee != null ? toNum(row.pct_agency_fee) : null,
    amtAgencyFee: row.amt_agency_fee != null ? toNum(row.amt_agency_fee) : null,
    progressDelta: pd,
  })
}

/**
 * Dòng lịch sử được TÍNH vào lũy kế "đã / sẽ ĐC": mọi trạng thái TRỪ đã huỷ (voided) — gồm
 * draft/pending ("sẽ ĐC") + confirmed ("đã ĐC"). Đồng bộ với bảng "Lịch sử đối chiếu" inline (vốn
 * hiển thị mọi đợt), tránh trường hợp Phí đại lý/Phí tăng thêm lũy kế = 0 khi các đợt chưa confirmed.
 */
export function isCountableHistoryRow(row: InvestorReconciliationHistoryRow): boolean {
  return row.status !== ReconciliationStatus.voided
}

/** Σ phí base (hoa hồng đợt) các kỳ lịch sử đã/sẽ ĐC (≠ voided) trước kỳ đang nhập. */
export function sumReconciledHistoryBaseFee(rows: InvestorReconciliationHistoryRow[]): number {
  return rows.reduce(
    (sum, row) => (isCountableHistoryRow(row) ? sum + historyRowPeriodCommission(row) : sum),
    0
  )
}

/** Phí tăng thêm đợt của một dòng lịch sử (cùng quy tắc `deriveReconLine`). */
export function historyRowExtraPeriodCommission(row: InvestorReconciliationHistoryRow): number {
  const base = toNum(row.fee_calculation_price)
  const ebFull = extraBonusFull({
    feeCalculationPrice: base,
    extraBonusPct: row.extra_bonus_pct != null ? toNum(row.extra_bonus_pct) : null,
    extraBonusAmount: row.extra_bonus_amount != null ? toNum(row.extra_bonus_amount) : null,
  })
  if (ebFull === 0) return 0

  const hasExtraSchedule =
    row.extra_bonus_progress_from_pct != null && row.extra_bonus_progress_to_pct != null
  const extraDelta = hasExtraSchedule
    ? progressDelta(
        toNum(row.extra_bonus_progress_from_pct),
        toNum(row.extra_bonus_progress_to_pct)
      )
    : progressDelta(
        row.progress_from_pct != null ? toNum(row.progress_from_pct) : null,
        row.progress_to_pct != null ? toNum(row.progress_to_pct) : null
      )
  return ebFull * extraDelta
}

/** Loại các dòng thuộc phiếu đang xem/sửa — tránh lấy tiến độ của chính kỳ hiện tại làm "lịch sử". */
export function filterPriorHistoryRows(
  rows: InvestorReconciliationHistoryRow[],
  excludeInvestorSheetId?: number | null
): InvestorReconciliationHistoryRow[] {
  if (excludeInvestorSheetId == null || excludeInvestorSheetId <= 0) return rows
  return rows.filter((row) => row.investor_sheet !== excludeInvestorSheetId)
}

/**
 * "Lịch sử TRƯỚC kỳ này" cho phần TÍNH TOÁN (truy hồi + lũy kế): loại phiếu đang xem/sửa VÀ mọi kỳ tạo
 * SAU nó. Khác {@link filterPriorHistoryRows} (chỉ loại CHÍNH phiếu — dùng cho ledger hiển thị mọi kỳ).
 *
 * Lý do: khi XEM/SỬA một kỳ cũ, history endpoint trả CẢ kỳ tạo sau. Nếu chỉ loại chính nó, kỳ sau sẽ
 * rò vào "tỉ lệ đã đối chiếu" (maxConfirmedProgressToPct) + "phí ĐL cũ" → truy hồi sai (≠ số BE đã chốt).
 * Mốc thứ tự = `id` dòng (per-căn, auto-increment ⇒ đồng biến thứ tự tạo). Phiếu hiện tại chưa nằm trong
 * lịch sử (lúc tạo mới) ⇒ mọi kỳ hiện hữu đều là "trước" (suy biến về {@link filterPriorHistoryRows}).
 */
export function filterStrictlyPriorHistoryRows(
  rows: InvestorReconciliationHistoryRow[],
  currentInvestorSheetId?: number | null
): InvestorReconciliationHistoryRow[] {
  if (currentInvestorSheetId == null || currentInvestorSheetId <= 0) return rows
  const currentRow = rows.find((row) => row.investor_sheet === currentInvestorSheetId)
  if (!currentRow) return rows.filter((row) => row.investor_sheet !== currentInvestorSheetId)
  return rows.filter((row) => row.id < currentRow.id)
}

/**
 * `progress_to_pct` lũy kế mới nhất trong các kỳ đã/sẽ ĐC (≠ voided; API sort mới → cũ).
 * Bao gồm draft/pending để seed `progress_from` (tỉ lệ đã đối chiếu trước) + baseline truy hồi kể cả khi
 * đợt trước chưa confirmed — đồng nhất với cột lũy kế (xem {@link isCountableHistoryRow}).
 */
export function latestReconciledProgressToPct(
  rows: InvestorReconciliationHistoryRow[]
): number | null {
  for (const row of rows) {
    if (isCountableHistoryRow(row) && row.progress_to_pct != null && row.progress_to_pct !== '') {
      return toNum(row.progress_to_pct)
    }
  }
  return null
}

/**
 * Đối chiếu ĐÃ XÁC NHẬN (confirmed) MỚI NHẤT của căn — rows sort mới→cũ ⇒ lấy confirmed đầu tiên.
 * Dùng cho header "Đã ĐC <%>" + "ĐC base <%>": cả hai LUÔN phản ánh kỳ confirmed mới nhất của CĂN
 * (KHÔNG loại phiếu đang xem; bản nháp/chờ duyệt KHÔNG tính). `null` khi chưa có kỳ confirmed nào.
 */
export function latestConfirmedHistoryRow(
  rows: InvestorReconciliationHistoryRow[]
): InvestorReconciliationHistoryRow | null {
  for (const row of rows) {
    if (row.status === ReconciliationStatus.confirmed) {
      return row
    }
  }
  return null
}

/**
 * MAX `progress_to_pct` trong các kỳ ĐÃ XÁC NHẬN (confirmed) — dùng làm "Tỉ lệ đã đối chiếu" (mức cao
 * nhất đã chốt) cho công thức "Số tiền điều chỉnh truy hồi". Nhiều kỳ confirmed ⇒ lấy mức tiến độ cao nhất.
 * `null` khi chưa có kỳ confirmed nào ⇒ truy hồi = 0 (đợt đầu, chưa có gì đã đối chiếu).
 */
export function maxConfirmedProgressToPct(rows: InvestorReconciliationHistoryRow[]): number | null {
  let max: number | null = null
  for (const row of rows) {
    if (
      row.status === ReconciliationStatus.confirmed &&
      row.progress_to_pct != null &&
      row.progress_to_pct !== ''
    ) {
      const value = toNum(row.progress_to_pct)
      if (max == null || value > max) max = value
    }
  }
  return max
}

/**
 * Giá tính phí + %HH ("agreed terms") của kỳ đối chiếu ĐÃ XÁC NHẬN (confirmed) gần nhất — dùng làm
 * "phí ĐL cũ" cho công thức truy hồi. Rows sort mới→cũ ⇒ lấy kỳ confirmed ĐẦU TIÊN gặp. `null` khi
 * chưa có kỳ confirmed nào ⇒ caller fallback HĐPP (MV) — nhưng đợt đầu truy hồi vẫn = 0 vì tiến độ = 0.
 */
export function latestConfirmedAgreedTerms(
  rows: InvestorReconciliationHistoryRow[]
): ReconAgreedTerms | null {
  for (const row of rows) {
    if (
      row.status === ReconciliationStatus.confirmed &&
      row.fee_calculation_price != null &&
      row.fee_calculation_price !== ''
    ) {
      return {
        feeCalculationPrice: toNum(row.fee_calculation_price),
        pctAgencyFee: row.pct_agency_fee != null ? toNum(row.pct_agency_fee) : null,
        amtAgencyFee: row.amt_agency_fee != null ? toNum(row.amt_agency_fee) : null,
      }
    }
  }
  return null
}

/** `extra_bonus_progress_to_pct` lũy kế mới nhất trong các kỳ đã/sẽ ĐC (≠ voided). */
export function latestReconciledExtraProgressToPct(
  rows: InvestorReconciliationHistoryRow[]
): number | null {
  for (const row of rows) {
    if (
      isCountableHistoryRow(row) &&
      row.extra_bonus_progress_to_pct != null &&
      row.extra_bonus_progress_to_pct !== ''
    ) {
      return toNum(row.extra_bonus_progress_to_pct)
    }
  }
  return null
}

/** "Phí tăng thêm thỏa thuận" (trọn gói) — số ₫ HOẶC % cùng cờ VAT — mang sang đợt sau. */
export type ReconExtraAgreedFee = {
  extraBonusPct: number | null
  extraBonusAmount: number | null
  isExtraBonusIncludeVat: boolean
}

/**
 * Phí tăng thêm thỏa thuận (trọn gói) của kỳ ĐÃ XÁC NHẬN (confirmed) gần nhất có nhập phí tăng thêm —
 * dùng seed "Tổng phí tăng thêm (thỏa thuận)" cho đợt mới (cam kết trọn gói của căn, mang sang đợt
 * sau, vẫn cho sửa). Rows sort mới→cũ ⇒ lấy kỳ confirmed ĐẦU TIÊN có `extra_bonus_amount` hoặc
 * `extra_bonus_pct`. `null` khi chưa kỳ confirmed nào nhập phí tăng thêm ⇒ caller giữ trống (= dùng
 * số MV ghi nhận).
 */
export function latestReconciledExtraAgreedFee(
  rows: InvestorReconciliationHistoryRow[]
): ReconExtraAgreedFee | null {
  for (const row of rows) {
    if (row.status !== ReconciliationStatus.confirmed) {
      continue
    }
    const hasAmount = row.extra_bonus_amount != null && row.extra_bonus_amount !== ''
    const hasPct = row.extra_bonus_pct != null && row.extra_bonus_pct !== ''
    if (hasAmount || hasPct) {
      return {
        extraBonusAmount: hasAmount ? toNum(row.extra_bonus_amount) : null,
        extraBonusPct: hasPct ? toNum(row.extra_bonus_pct) : null,
        isExtraBonusIncludeVat: !!row.is_extra_bonus_include_vat,
      }
    }
  }
  return null
}

/**
 * Tiến độ "trước đối chiếu" / `progress_from` cho tính HH.
 * Đã có giá trị form (kể cả 0) → dùng đúng giá trị đã lưu; chỉ fallback lịch sử khi chưa nhập.
 */
export function resolveProgressBeforePct(
  fromPct: number | string | null | undefined,
  priorCumulativePct: number | null
): number {
  if (fromPct != null && fromPct !== '') {
    return Math.min(100, Math.max(0, toNum(fromPct)))
  }
  if (priorCumulativePct != null) {
    return Math.min(100, Math.max(0, priorCumulativePct))
  }
  return 0
}

/**
 * Tiến độ TT lũy kế sau kỳ (0–100) — dùng settlement / chip "còn % tiến độ".
 * `progress_to_pct` là mốc tuyệt đối (không phải delta). Khi chưa nhập `to`, fallback `from`
 * (đã seed từ lịch sử) rồi tới kỳ confirmed gần nhất — tránh hiển thị "còn 100%" khi đã ĐC trước.
 */
export function resolveEffectiveProgressToPct(
  item: { progress_from_pct?: number | string | null; progress_to_pct?: number | string | null },
  priorRows: InvestorReconciliationHistoryRow[]
): number {
  if (item.progress_to_pct != null && item.progress_to_pct !== '') {
    return Math.min(100, Math.max(0, toNum(item.progress_to_pct)))
  }
  if (item.progress_from_pct != null && item.progress_from_pct !== '') {
    return Math.min(100, Math.max(0, toNum(item.progress_from_pct)))
  }
  const prior = latestReconciledProgressToPct(priorRows)
  return prior != null ? Math.min(100, Math.max(0, prior)) : 0
}

/** Σ phí tăng thêm các kỳ lịch sử đã/sẽ ĐC (≠ voided) trước kỳ đang nhập. */
export function sumReconciledHistoryExtraFee(rows: InvestorReconciliationHistoryRow[]): number {
  return rows.reduce(
    (sum, row) => (isCountableHistoryRow(row) ? sum + historyRowExtraPeriodCommission(row) : sum),
    0
  )
}

export function deriveReconLine(input: ReconLineComputationInput): ReconLineComputation {
  const pd = progressDelta(input.progressFromPct, input.progressToPct)
  const periodCommission = computePeriodCommission({
    feeCalculationPrice: input.feeCalculationPrice,
    pctAgencyFee: input.pctAgencyFee,
    amtAgencyFee: input.amtAgencyFee,
    progressDelta: pd,
  })

  const ebFull = extraBonusFull({
    feeCalculationPrice: input.feeCalculationPrice,
    extraBonusPct: input.extraBonusPct,
    extraBonusAmount: input.extraBonusAmount,
  })
  // Independent schedule when both extra-bonus bounds present; otherwise mirror base progress.
  const hasExtraSchedule = input.extraProgressFromPct != null && input.extraProgressToPct != null
  const extraDelta = hasExtraSchedule
    ? progressDelta(input.extraProgressFromPct, input.extraProgressToPct)
    : pd
  // No extra bonus configured ⇒ 0 explicitly (don't ride the base progress delta with stale bounds).
  const extraBonusPeriodAmount = ebFull === 0 ? 0 : roundReconVnd(ebFull * extraDelta)

  const retro = input.retroactiveAdjustment ?? 0
  const subTotalCommission = roundReconVnd(
    periodCommission + retro + input.sharedBonusPeriodAmount + extraBonusPeriodAmount
  )
  const totalAmount = roundReconVnd(subTotalCommission - input.feeDeduction)
  const vatAmount = computeVatAmount(totalAmount, input.vatRate)
  const totalAmountWithVat = totalAmount + vatAmount

  const payoutBasis = roundReconVnd(
    periodCommission + extraBonusPeriodAmount + retro - input.feeDeduction
  )
  const payoutRatio =
    payoutBasis !== 0 && input.amtPaymentThisPeriod != null
      ? (input.amtPaymentThisPeriod - input.sharedBonusPeriodAmount) / payoutBasis
      : null

  return {
    progressDelta: pd,
    periodCommission,
    extraBonusFull: ebFull,
    extraBonusPeriodAmount,
    subTotalCommission,
    totalAmount,
    vatAmount,
    totalAmountWithVat,
    payoutBasis,
    payoutRatio,
  }
}
