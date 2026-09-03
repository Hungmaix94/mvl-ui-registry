import type { ReconKindConfig } from '@/features/sales/_shared/reconciliation/recon-kind'

/**
 * F2 (Sàn F2) reconciliation preset — the `simple` profile.
 *
 * F2 sheets are generated from the parent investor reconciliation shares, so there is NO manual
 * create and NO manual invoice button (BE auto-creates the advance/settlement invoice on confirm).
 * Instead F2 exposes line-level confirm / void / resync-from-shares. The simple profile renders a
 * single commission line (no progress, period-type, per-field VAT, A' price or *_to_sale fields).
 */
export const f2ReconciliationConfig: ReconKindConfig = {
  kind: 'f2',
  counterpartyLabel: 'Sàn F2',
  // Header cột trái = 'F2 đề nghị' (Sàn F2 gửi số liệu), KHÔNG phải 'CĐT đề nghị' như đối chiếu CĐT.
  proposalColumnLabel: 'F2 đề nghị',
  // Bên chi trả = 'MV' (MV giải ngân cho Sàn F2) ⇒ "Phải thu (MV trả)" / "MV trả {số}", không "CĐT".
  payerLabel: 'MV',
  // Bên dự kiến nhận = 'F2' (Sàn F2 nhận HH từ MV) ⇒ "F2 dự kiến nhận", không "MV dự kiến nhận".
  beneficiaryLabel: 'F2',
  // HĐPP là khái niệm của CĐT ⇒ F2 chỉ ghi "Thưởng cam kết".
  supplementaryRowLabel: 'Thưởng cam kết',
  profile: 'simple',
  taxMode: 'vat', // F2: MV ↔ Sàn vẫn theo VAT (gồm VAT) — KHÔNG dùng PIT như CTV.
  allowCreate: false,
  // BE hỗ trợ confirm/void/resync cấp dòng, nhưng UI v1 KHÔNG hiện action cấp dòng (chốt 2026-06-15):
  // F2 duyệt CẢ PHIẾU qua nút "Phê duyệt" ở trang chi tiết, y hệt CĐT. Mở lại khi cần thao tác từng dòng.
  lineActions: { confirm: false, void: false, resync: false },
  features: {
    settlementCheck: false, // 2026-06-25 (ngài chốt): đối chiếu F2 KHÔNG có "Kiểm tra điều kiện tất toán" — F2 chỉ xem & map số BE, không đối chiếu tất toán.
    createInvoice: false, // BE auto-creates advance/settlement invoice on confirm
    importExcel: false, // generated from shares, not imported
    periodType: false, // F2 has no period_type
    extraBonus: false, // bỏ phần "Phí tăng thêm" — F2 không theo dõi phí tăng thêm
    saleSplit: false, // ẩn "Trong đó chia cho/trừ từ lương Sale" — simple profile không có *_to_sale
    payoutRatio: false, // ẩn "Tỷ lệ chi trả" + cảnh báo variance — amt_payment_this_period F2 prefill từ CĐT cha, không cùng thang HH-F2
  },
}
