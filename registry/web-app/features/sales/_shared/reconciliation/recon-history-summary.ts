import type { components } from '@/api/schema'
import { ReconciliationStatus as Status } from '@/constants/api-schema-aliases'

import {
  filterPriorHistoryRows,
  filterStrictlyPriorHistoryRows,
  latestConfirmedAgreedTerms,
  latestConfirmedHistoryRow,
  latestReconciledExtraAgreedFee,
  latestReconciledExtraProgressToPct,
  latestReconciledProgressToPct,
  maxConfirmedProgressToPct,
  resolveReconVatRate,
  toNum,
  type ReconAgreedTerms,
  type ReconExtraAgreedFee,
} from '@/features/sales/_shared/reconciliation/recon-calculations'

type HistoryRow = components['schemas']['InvestorReconciliationHistory']

/** Pure summary of a căn's reconciliation history (everything except the query's `isLoading`). */
export interface ReconHistorySummaryData {
  /**
   * Tổng số dòng lịch sử của căn — đếm TẤT CẢ `allRows`, KỂ CẢ phiếu đang xem/sửa (không bị exclude).
   * Khác với mọi field dưới (đều suy từ `priorRows` ĐÃ exclude phiếu hiện tại) — đừng dùng `count` như
   * "số đợt ĐC trước". Consumer F2/CTV lưu ý điểm bất đối xứng này.
   */
  count: number
  /** Lũy kế = Σ `total_amount_with_vat` các đợt ĐÃ DUYỆT (confirmed) trước. */
  cumulativeAmount: number
  hasHistory: boolean
  latestProgressToPct: number | null
  /**
   * Tiến độ (%) của đối chiếu ĐÃ XÁC NHẬN MỚI NHẤT của căn — header + thanh tóm tắt "Đã ĐC <%>".
   * Tính trên TẤT CẢ kỳ (gồm phiếu đang xem), CHỈ confirmed (bỏ nháp/chờ duyệt). null khi chưa confirmed.
   */
  latestConfirmedProgressToPct: number | null
  /** `base_progress_to_pct` của ĐÚNG kỳ confirmed mới nhất — header "ĐC base <%>" (map thẳng field BE). */
  latestConfirmedBaseProgressToPct: number | null
  latestExtraProgressToPct: number | null
  latestExtraAgreedFee: ReconExtraAgreedFee | null
  /** "Phí ĐL cũ" cho truy hồi — CHỈ kỳ tạo TRƯỚC kỳ này (strictly-prior), không gồm kỳ sau. */
  latestConfirmedAgreedTerms: ReconAgreedTerms | null
  /** "Tỉ lệ đã đối chiếu" cho truy hồi + seed `progress_from` — CHỈ kỳ tạo TRƯỚC kỳ này (strictly-prior). */
  maxConfirmedProgressToPct: number | null
  /**
   * Lũy kế "Giảm trừ khác" (`fee_deduction`) các kỳ ĐÃ DUYỆT (confirmed) KHÁC — loại phiếu đang
   * xem/sửa qua cơ chế exclude sẵn có. CỐ Ý confirmed-only + quy về TRƯỚC VAT (mục nhập gồm VAT thì
   * ÷(1+rate/100)) để khớp `prior_fee_deduction_total`/`prior_fee_deduction_to_sale_total` của BE
   * (PRE-VAT, CONFIRMED non-voided) — KHÁC tổng gồm-VAT của `computeReconSettlement.cumulativeDeduct`.
   */
  confirmedFeeDeductionTotal: number
  /** Lũy kế "Trong đó Sale / F2 phải chịu" (`fee_deduction_to_sale_amount ?? 0`) — cùng basis pre-VAT/confirmed-only như trên. */
  confirmedFeeDeductionToSaleTotal: number
  /**
   * Chế độ tính phí đại lý đã "chốt" của căn theo các kỳ ĐÃ DUYỆT (confirmed) KHÁC:
   * `'pct'` khi các kỳ trước dùng Tỷ lệ % (`pct_agency_fee`), `'amt'` khi dùng Số tiền cố định
   * (`amt_agency_fee`), `null` khi chưa có kỳ nào chốt. BE ép mọi kỳ của cùng một giao dịch dùng
   * cùng một chế độ (`_validate_agency_fee_mode_consistency`), nên lấy chế độ của kỳ confirmed bất
   * kỳ là đủ. FE dùng để cảnh báo sớm khi kỳ đang nhập chọn lệch chế độ (trước khi bị BE chặn lúc xác nhận).
   */
  establishedAgencyFeeMode: 'pct' | 'amt' | null
}

/**
 * Pure derivation of the "Lịch sử đối chiếu" header summary from the raw history rows. Extracted from
 * `useReconHistorySummary` so the math is unit-testable and reusable by the shared engine.
 */
export function summarizeReconHistory(
  allRows: HistoryRow[],
  excludeInvestorSheetId?: number | null
): ReconHistorySummaryData {
  // HIỂN THỊ (header "đã ĐC tới đâu" / lũy kế / hasHistory) = MỌI kỳ KHÁC của căn (chỉ loại chính nó):
  // khi xem lại một kỳ cũ vẫn phải phản ánh kỳ tạo sau (căn đã đối chiếu xa hơn).
  const otherRows = filterPriorHistoryRows(allRows, excludeInvestorSheetId)
  // BASELINE TÍNH TRUY HỒI (tỉ lệ đã ĐC + phí ĐL cũ) = CHỈ kỳ tạo TRƯỚC kỳ này — kỳ sau KHÔNG được
  // tính vào, nếu không xem lại kỳ đầu sẽ ra truy hồi ≠ 0 (kỳ sau rò vào baseline). Xem [[bug fix 2026-06-17]].
  const strictlyPriorRows = filterStrictlyPriorHistoryRows(allRows, excludeInvestorSheetId)

  const cumulativeAmount = otherRows.reduce((sum, row) => {
    if (row.status === Status.confirmed) {
      sum = sum + toNum(row.total_amount_with_vat)
    }
    return sum
  }, 0)

  // Lũy kế Giảm trừ khác / Trừ từ lương Sale — CỐ Ý confirmed-only + PRE-VAT (mirror BE `prior_*`):
  // mỗi kỳ nhập gồm VAT thì chia lại (1 + rate/100) theo `vat_rate` của CHÍNH kỳ đó. Khác
  // `computeReconSettlement` (quy GỒM VAT). `fee_deduction_to_sale_amount` null ⇒ 0.
  const confirmedRows = otherRows.filter((row) => row.status === Status.confirmed)
  const toPreVat = (amount: number, row: HistoryRow) =>
    row.is_fee_deduction_include_vat
      ? amount / (1 + resolveReconVatRate(row.vat_rate) / 100)
      : amount
  const confirmedFeeDeductionTotal = confirmedRows.reduce(
    (sum, row) => sum + toPreVat(toNum(row.fee_deduction), row),
    0
  )
  const confirmedFeeDeductionToSaleTotal = confirmedRows.reduce(
    (sum, row) => sum + toPreVat(toNum(row.fee_deduction_to_sale_amount ?? 0), row),
    0
  )

  // Chế độ phí đại lý đã chốt = chế độ của các kỳ ĐÃ DUYỆT KHÁC (loại phiếu đang xem qua `confirmedRows`).
  // Kỳ CANCELLATION không mang phí đại lý (cả pct/amt đều null) nên tự nhiên không set chế độ. BE đảm bảo
  // các kỳ confirmed đồng nhất một chế độ ⇒ chỉ cần phát hiện có kỳ nào dùng pct hay amt.
  const hasAgencyFeeValue = (value: string | null | undefined) => value != null && value !== ''
  const establishedAgencyFeeMode: 'pct' | 'amt' | null = confirmedRows.some((row) =>
    hasAgencyFeeValue(row.pct_agency_fee)
  )
    ? 'pct'
    : confirmedRows.some((row) => hasAgencyFeeValue(row.amt_agency_fee))
      ? 'amt'
      : null

  // "Đã ĐC <%>" + "ĐC base <%>" = kỳ confirmed MỚI NHẤT của CĂN — tính trên TẤT CẢ kỳ (allRows, KHÔNG
  // loại phiếu đang xem) để khi xem kỳ mới nhất vẫn ra đúng tiến độ của chính nó (không lùi về kỳ trước).
  const latestConfirmedRow = latestConfirmedHistoryRow(allRows)
  const latestConfirmedProgressToPct =
    latestConfirmedRow?.progress_to_pct != null && latestConfirmedRow.progress_to_pct !== ''
      ? toNum(latestConfirmedRow.progress_to_pct)
      : null
  const latestConfirmedBaseProgressToPct =
    latestConfirmedRow?.base_progress_to_pct != null &&
    latestConfirmedRow.base_progress_to_pct !== ''
      ? toNum(latestConfirmedRow.base_progress_to_pct)
      : null

  return {
    count: allRows.length,
    cumulativeAmount,
    hasHistory: otherRows.length > 0,
    latestProgressToPct: latestReconciledProgressToPct(otherRows),
    latestConfirmedProgressToPct,
    latestConfirmedBaseProgressToPct,
    latestExtraProgressToPct: latestReconciledExtraProgressToPct(otherRows),
    latestExtraAgreedFee: latestReconciledExtraAgreedFee(otherRows),
    latestConfirmedAgreedTerms: latestConfirmedAgreedTerms(strictlyPriorRows),
    maxConfirmedProgressToPct: maxConfirmedProgressToPct(strictlyPriorRows),
    confirmedFeeDeductionTotal,
    confirmedFeeDeductionToSaleTotal,
    establishedAgencyFeeMode,
  }
}
