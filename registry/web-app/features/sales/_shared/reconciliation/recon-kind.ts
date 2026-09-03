/**
 * Reconciliation "kind" preset — the config-driven seam that lets ONE engine render the three
 * reconciliation clusters (investor / F2 / CTV) without per-domain screen sets.
 *
 * The engine UI/logic only ever sees the canonical (investor-superset) form model; a `ReconKindConfig`
 * preset toggles section visibility, relabels copy, and gates features. Per-domain payload adapters
 * (field renames, counterparty swap) live next to each preset, not here.
 *
 * - `rich`   → investor (CĐT): agency fee + retro + supplementary + deduction + extra-bonus + per-field VAT.
 * - `simple` → F2 / CTV: a single commission line + one VAT flag + this-period payment.
 */

/** Section/column richness. Controls which Phần the config & history tables render. */
export type ReconProfile = 'rich' | 'simple'

/**
 * Thuế áp cho phiếu đối chiếu:
 * - `vat`: CĐT + F2 — phần "Số tiền đối chiếu" hiện NET + Tiền VAT + Phải thu (gồm VAT).
 * - `pit`: CTV — CTV là cá nhân nên KHÔNG có VAT; thay bằng khấu trừ thuế TNCN: Tổng tiền (trước thuế)
 *   + Thuế TNCN + Thực nhận sau thuế (số lấy thẳng từ BE `pit_amount` / `total_amount_after_pit`).
 */
export type ReconTaxMode = 'vat' | 'pit'

export type ReconKind = 'investor' | 'f2' | 'ctv'

/** Line-level workflow actions. Investor finalizes via sheet-confirm only; F2/CTV add per-line ops. */
export interface ReconLineActionConfig {
  confirm: boolean
  void: boolean
  /** Re-generate the line from the parent investor reconciliation shares. */
  resync: boolean
}

export interface ReconFeatureConfig {
  /** "Kiểm tra tất toán" settlement panel (rich only). */
  settlementCheck: boolean
  /** Manual "Tạo HĐ Tạm ứng/Quyết toán" button. F2/CTV: false — BE auto-creates on confirm. */
  createInvoice: boolean
  /** Excel import of detail lines. */
  importExcel: boolean
  /** Period-type selector (normal / adjustment / settlement …). */
  periodType: boolean
  /**
   * Phần 4 "Phí tăng thêm (tiến độ độc lập)" — band cấu hình + dòng tổng kết "Phí tăng thêm đợt này"
   * + segment thu gọn + nút bật "Tùy chọn". F2: false (đối chiếu F2 không theo dõi phí tăng thêm).
   */
  extraBonus: boolean
  /**
   * Hai dòng phân bổ cho Sale: "· Trong đó chia cho Sale" / "· Trong đó Sale / F2 phải chịu". Chỉ rich
   * (CĐT). F2: false — simple profile không có field *_to_sale (xem chú thích f2-reconciliation-config).
   */
  saleSplit: boolean
  /**
   * "Tỷ lệ chi trả" + cảnh báo "TT thực tế lệch…" — so `amt_payment_this_period` với HH-đợt dự kiến.
   * Chỉ có nghĩa cho CĐT (CĐT trả MV đúng phần HH). F2: false — `amt_payment_this_period` của F2 là
   * khoản MV giải ngân cho Sàn, prefill từ phiếu CĐT cha (thang rate khác) nên đem so với HH-đợt-F2 ra
   * tỷ lệ vô nghĩa (xem `project_f2_recon_ui_gaps`). Tắt ⇒ ẩn dòng "Tỷ lệ chi trả" + bỏ cảnh báo variance.
   */
  payoutRatio: boolean
}

/**
 * Per-domain preset consumed by the shared reconciliation engine. Kept lean (only what the shared UI
 * branches on today); services/routes/permissions are wired at the page layer when each domain is built.
 */
export interface ReconKindConfig {
  kind: ReconKind
  /** Counterparty shown in column headers and section copy: 'CĐT' | 'Sàn F2' | 'CTV'. */
  counterpartyLabel: string
  /**
   * Header cột "bên đề nghị" của ConfigTable (cột trái, đối diện "MV ghi nhận") — phía ĐỐI TÁC gửi
   * số liệu đối chiếu. Đối chiếu CĐT ⇒ 'CĐT đề nghị'; đối chiếu F2 ⇒ 'F2 đề nghị' (Sàn F2, KHÔNG phải
   * CĐT). Tách riêng khỏi `counterpartyLabel` vì header cột F2 dùng nhãn ngắn 'F2', không 'Sàn F2'.
   */
  proposalColumnLabel: string
  /**
   * Bên CHI TRẢ khoản đối chiếu — dùng cho nhãn "Phải thu ({payerLabel} trả)" (ConfigTable) + dòng
   * giải ngân "{payerLabel} trả {số}" (Lịch sử). Đối chiếu CĐT ⇒ 'CĐT' (CĐT trả MV); đối chiếu F2 ⇒
   * 'MV' (MV giải ngân cho Sàn F2). KHÁC `counterpartyLabel` ('Sàn F2') vì bên trả của F2 là MV,
   * không phải đối tác nhận tiền.
   */
  payerLabel: string
  /**
   * Bên DỰ KIẾN NHẬN khoản hoa hồng — dùng cho cột/nhãn "{beneficiaryLabel} dự kiến nhận" (bảng tất
   * toán + thanh tổng). Đối chiếu CĐT ⇒ 'MV' (MV nhận HH từ CĐT); đối chiếu F2 ⇒ 'F2' (Sàn F2 nhận HH
   * từ MV). KHÁC `payerLabel`: bên nhận ngược với bên trả (CĐT: trả=CĐT/nhận=MV; F2: trả=MV/nhận=F2).
   */
  beneficiaryLabel: string
  /**
   * Nhãn dòng "thưởng cam kết" trong bảng tất toán. CĐT ⇒ 'Thưởng cam kết HĐPP' (theo hợp đồng phân
   * phối); F2 ⇒ 'Thưởng cam kết' (HĐPP là khái niệm của CĐT, không áp cho F2).
   */
  supplementaryRowLabel: string
  profile: ReconProfile
  /**
   * Mô hình thuế của phiếu. CĐT/F2 ⇒ `vat`; CTV ⇒ `pit` (khấu trừ thuế TNCN, không VAT). Engine
   * rẽ nhánh section "Số tiền đối chiếu kỳ này" + tổng kết phiếu theo cờ này.
   */
  taxMode: ReconTaxMode
  /** Investor: true (manual create). F2/CTV: false — generated from parent shares. */
  allowCreate: boolean
  lineActions: ReconLineActionConfig
  features: ReconFeatureConfig
}

/** Convenience guards so components read intent, not raw profile strings. */
export const isRichProfile = (config: ReconKindConfig): boolean => config.profile === 'rich'
export const isSimpleProfile = (config: ReconKindConfig): boolean => config.profile === 'simple'

/**
 * Investor (CĐT) preset — the rich profile. Also the engine's safe fallback so any leaf rendered
 * outside a `ReconKindProvider` behaves exactly like the original investor-only screens.
 *
 * Defined here (not in the investor feature) so the shared engine has no upward dependency; the
 * investor feature re-exports it for locality. F2/CTV presets mirror this shape with `simple` profile.
 */
export const INVESTOR_RECON_KIND_CONFIG: ReconKindConfig = {
  kind: 'investor',
  counterpartyLabel: 'CĐT',
  proposalColumnLabel: 'CĐT đề nghị',
  payerLabel: 'CĐT',
  beneficiaryLabel: 'MV',
  supplementaryRowLabel: 'Thưởng cam kết HĐPP',
  profile: 'rich',
  taxMode: 'vat',
  allowCreate: true,
  lineActions: { confirm: false, void: false, resync: false },
  features: {
    settlementCheck: true,
    createInvoice: true,
    importExcel: true,
    periodType: true,
    extraBonus: true,
    saleSplit: true,
    payoutRatio: true,
  },
}
