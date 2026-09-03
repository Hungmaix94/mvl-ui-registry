import type { ReconKindConfig } from '@/features/sales/_shared/reconciliation/recon-kind'

/**
 * CTV (Cộng tác viên) reconciliation preset — the `simple` profile, NGHIỆP VỤ Y HỆT F2.
 *
 * CTV sheets are generated from the parent investor reconciliation shares (no manual create). The
 * screen is VIEW-ONLY (sheet confirmed as a whole via "Phê duyệt" on the detail page) and renders the
 * canonical card tree as a single value column "MV ghi nhận" (số map thẳng từ BE — KHÔNG tính FE).
 *
 * Differences from F2 are data-driven, not config: CTV BE returns no per-field VAT flags (adapter
 * defaults them false) and has no per-căn history endpoint (card omits the inline "Lịch sử đối chiếu").
 */
export const ctvReconciliationConfig: ReconKindConfig = {
  kind: 'ctv',
  counterpartyLabel: 'CTV',
  // Header cột giá trị: simple profile (valueOnly) đổi nhãn thành "MV ghi nhận"; chuỗi này chỉ là nội bộ.
  proposalColumnLabel: 'CTV đề nghị',
  // Bên chi trả = 'MV' (MV giải ngân cho CTV) ⇒ "Phải thu (MV trả)".
  payerLabel: 'MV',
  // Bên dự kiến nhận = 'CTV' (CTV nhận HH từ MV).
  beneficiaryLabel: 'CTV',
  // HĐPP là khái niệm của CĐT ⇒ CTV chỉ ghi "Thưởng cam kết".
  supplementaryRowLabel: 'Thưởng cam kết',
  profile: 'simple',
  // CTV là cá nhân ⇒ khấu trừ thuế TNCN (PIT) thay vì VAT: section "Số tiền đối chiếu" + tổng kết
  // phiếu hiện Tổng tiền (trước thuế) / Thuế TNCN / Thực nhận sau thuế (số BE), bỏ mọi nhãn VAT.
  taxMode: 'pit',
  allowCreate: false,
  lineActions: { confirm: false, void: false, resync: false },
  features: {
    settlementCheck: false, // CTV chỉ xem & map số BE — không có "Kiểm tra điều kiện tất toán".
    createInvoice: false, // BE auto-creates advance/settlement invoice on confirm
    importExcel: false, // generated from shares, not imported
    periodType: false, // CTV has no period_type selector
    extraBonus: false, // bỏ phần "Phí tăng thêm" — CTV không theo dõi phí tăng thêm
    saleSplit: false, // ẩn "Trong đó chia cho/trừ từ lương Sale" — simple profile không có *_to_sale
    payoutRatio: false, // ẩn "Tỷ lệ chi trả" + cảnh báo variance
  },
}
