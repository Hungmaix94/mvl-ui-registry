import { ColoredValueVariant } from '@/api/schema'
import {
  FeeSupportRequestDocument_status,
  FeeSupportRequestOrigin,
  FeeSupportRequestStatus,
} from '@/constants/api-schema-aliases'

export { FeeSupportRequestDocument_status, FeeSupportRequestOrigin, FeeSupportRequestStatus }

/**
 * CASL subject/action tách từ permission code BE `fee_support.<action>`
 * (JSDoc "Require permission" trong src/api/schema.ts — KHÔNG phải `feesupportrequest.*`).
 */
export const FEE_SUPPORT_PERMISSION_SUBJECT = 'fee_support'

export const FEE_SUPPORT_ACTION = {
  LIST: 'list',
  CREATE: 'create',
  RETRIEVE: 'retrieve',
  PARTIAL_UPDATE: 'partial_update',
  APPROVE: 'approve',
  REJECT: 'reject',
  WITHDRAW: 'withdraw',
  // v3 — tuyến hồ sơ (thủ tục, kế toán duyệt)
  SUPPLEMENT_DOCUMENTS: 'supplement_documents',
  APPROVE_DOCUMENTS: 'approve_documents',
  REJECT_DOCUMENTS: 'reject_documents',
  RELEASE_HOLD_FULL: 'release_hold_full',
} as const

/** purpose truyền cho files/presign + files/confirm (giấy tờ chấp thuận GĐ dự án). */
export const FEE_SUPPORT_ATTACHMENT_PURPOSE = 'fee_support_request_document'

export const FEE_SUPPORT_PENDING_STATUSES: FeeSupportRequestStatus[] = [
  FeeSupportRequestStatus.pending_confirmation,
  FeeSupportRequestStatus.pending_tpkd,
  FeeSupportRequestStatus.pending_gdkd,
  FeeSupportRequestStatus.pending_admin_da,
  FeeSupportRequestStatus.pending_tp_admin,
]

/**
 * Bỏ tick "đề xuất hỗ trợ phí" trên HĐ cọc: phiếu CÒN HỦY ĐƯỢC (nháp + đang chờ
 * các cấp duyệt) → cho hủy qua withdraw rồi bỏ tick.
 */
export const FEE_SUPPORT_CANCELLABLE_STATUSES: FeeSupportRequestStatus[] = [
  FeeSupportRequestStatus.draft,
  ...FEE_SUPPORT_PENDING_STATUSES,
]

/**
 * 86eyqf9m3 — trạng thái web (`origin=web_secretary`) creator còn sửa được: đúng
 * gương whitelist `DRAFT`/`PENDING_TP_ADMIN` của `fee_support_service._authorize_edit`
 * nhánh `web_creator`. `DRAFT` không thực tế xuất hiện (web `submit()` chạy ngay
 * trong `create()`) nhưng giữ cho khớp BE 1-1. Khoá từ `APPROVED` trở đi vì
 * `apply_fee_support` đã chạy.
 */
export const FEE_SUPPORT_WEB_EDITABLE_STATUSES: FeeSupportRequestStatus[] = [
  FeeSupportRequestStatus.draft,
  FeeSupportRequestStatus.pending_tp_admin,
]

/**
 * Phiếu ĐÃ DUYỆT XONG thang KD — gương của `fee_support_gate.APPROVED_STATUSES` bên BE.
 *
 * `approved_pending_deal` BẮT BUỘC nằm trong đây: phiếu neo vào HĐ cọc chưa duyệt thì
 * chưa có giao dịch (giao dịch chỉ sinh lúc kế toán duyệt cọc), nên cấp cuối duyệt chỉ
 * park được ở `approved_pending_deal`. Đòi đúng `approved` là khoá chết cả hai chiều.
 */
export const FEE_SUPPORT_APPROVED_STATUSES: FeeSupportRequestStatus[] = [
  FeeSupportRequestStatus.approved,
  FeeSupportRequestStatus.approved_pending_deal,
]

/** Đã duyệt → CHẶN bỏ tick trên màn HĐ cọc (phải thu hồi phiếu trước). */
export const FEE_SUPPORT_BLOCKING_STATUSES: FeeSupportRequestStatus[] =
  FEE_SUPPORT_APPROVED_STATUSES

/**
 * `error.extra.code` BE trả khi CHẶN DUYỆT HĐ cọc vì phiếu hỗ trợ phí chưa duyệt
 * (`apps/sales/services/fee_support_gate.py`). Bề mặt API ổn định, không đổi tuỳ tiện.
 */
export const FEE_SUPPORT_GATE_ERROR_CODE = {
  /** Cờ bật nhưng chưa có phiếu nào còn sống → phải TẠO phiếu. */
  MISSING: 'fee_support_proposal_missing',
  /** Có phiếu nhưng chưa qua hết thang duyệt → phải ĐẨY phiếu đi tiếp. */
  NOT_APPROVED: 'fee_support_proposal_not_approved',
  /**
   * Phiếu ĐÃ duyệt xong (qua được cổng) nhưng khi giao dịch thành hình thì không
   * còn khớp — trần D14, sai mode doanh thu, hoặc hoa hồng của sale ở mode khác.
   * Nổ ngay trong transaction kế toán duyệt cọc ⇒ phải thu hồi hoặc sửa phiếu.
   */
  DEFERRED_FAILED: 'fee_support_deferred_validation_failed',
} as const

/** `error.extra` của cổng đề xuất hỗ trợ phí — không có trong schema sinh tự động. */
export type FeeSupportGateExtra = {
  code: string
  blocking_proposals: { code: string; status: string; status_display: string }[]
  /** Chỉ có ở `DEFERRED_FAILED`: các luật cụ thể mà phiếu vi phạm. */
  reasons?: string[]
}

/**
 * D19 — thang duyệt theo nguồn tạo. Mỗi bước chính là một status nên nhãn bước
 * lấy từ app-constant `FeeSupportRequest_Status` (server-driven, không hardcode).
 */
export const FEE_SUPPORT_LADDER_BY_ORIGIN: Record<
  FeeSupportRequestOrigin,
  FeeSupportRequestStatus[]
> = {
  [FeeSupportRequestOrigin.mobile_sale]: [
    FeeSupportRequestStatus.pending_confirmation,
    FeeSupportRequestStatus.pending_tpkd,
    FeeSupportRequestStatus.pending_gdkd,
    FeeSupportRequestStatus.pending_admin_da,
    FeeSupportRequestStatus.pending_tp_admin,
    FeeSupportRequestStatus.approved,
  ],
  [FeeSupportRequestOrigin.web_secretary]: [
    FeeSupportRequestStatus.pending_tp_admin,
    FeeSupportRequestStatus.approved,
  ],
}

/** Màu UI theo status — nhãn tiếng Việt vẫn từ server (useAppConstant). */
export const FEE_SUPPORT_STATUS_VARIANT: Record<FeeSupportRequestStatus, ColoredValueVariant> = {
  [FeeSupportRequestStatus.draft]: ColoredValueVariant.GREY,
  [FeeSupportRequestStatus.pending_confirmation]: ColoredValueVariant.ORANGE,
  [FeeSupportRequestStatus.pending_tpkd]: ColoredValueVariant.ORANGE,
  [FeeSupportRequestStatus.pending_gdkd]: ColoredValueVariant.ORANGE,
  [FeeSupportRequestStatus.pending_admin_da]: ColoredValueVariant.ORANGE,
  [FeeSupportRequestStatus.pending_tp_admin]: ColoredValueVariant.ORANGE,
  [FeeSupportRequestStatus.approved]: ColoredValueVariant.GREEN,
  [FeeSupportRequestStatus.approved_pending_deal]: ColoredValueVariant.ORANGE,
  [FeeSupportRequestStatus.rejected]: ColoredValueVariant.RED,
  [FeeSupportRequestStatus.withdrawn]: ColoredValueVariant.GREY,
}

/**
 * v3 — tuyến hồ sơ (kế toán duyệt THỦ TỤC, độc lập với ladder chủ trương).
 * 4 trạng thái, không có bước sale "nộp"; nhãn tạm local tới khi BE seed
 * app-constant `FeeSupportRequest_DocumentStatus`.
 */
export const FEE_SUPPORT_DOCUMENT_STATUS_LABEL: Record<FeeSupportRequestDocument_status, string> = {
  [FeeSupportRequestDocument_status.not_required]: 'Không cần hồ sơ',
  [FeeSupportRequestDocument_status.awaiting_docs]: 'Chờ hồ sơ / kế toán duyệt',
  [FeeSupportRequestDocument_status.needs_supplement]: 'Cần bổ sung hồ sơ',
  [FeeSupportRequestDocument_status.docs_approved]: 'Hồ sơ đã duyệt',
}

export const FEE_SUPPORT_DOCUMENT_STATUS_VARIANT: Record<
  FeeSupportRequestDocument_status,
  ColoredValueVariant
> = {
  [FeeSupportRequestDocument_status.not_required]: ColoredValueVariant.GREY,
  [FeeSupportRequestDocument_status.awaiting_docs]: ColoredValueVariant.BLUE,
  [FeeSupportRequestDocument_status.needs_supplement]: ColoredValueVariant.ORANGE,
  [FeeSupportRequestDocument_status.docs_approved]: ColoredValueVariant.GREEN,
}

/**
 * BE GAP: chưa có app-constant `FeeSupportRequest_Origin` nên nhãn nguồn tạo
 * tạm để local — xem docs/fe_changes_fee_support_request_18_8_20260702.md §7.
 * Khi BE bổ sung key, chuyển sang useAppConstant và xoá map này.
 */
export const FEE_SUPPORT_ORIGIN_LABEL: Record<FeeSupportRequestOrigin, string> = {
  [FeeSupportRequestOrigin.mobile_sale]: 'Sale tạo trên App',
  [FeeSupportRequestOrigin.web_secretary]: 'Thư ký KD tạo trên Web',
}

export const FEE_SUPPORT_ORIGIN_VARIANT: Record<FeeSupportRequestOrigin, ColoredValueVariant> = {
  [FeeSupportRequestOrigin.mobile_sale]: ColoredValueVariant.ORANGE,
  [FeeSupportRequestOrigin.web_secretary]: ColoredValueVariant.GREY,
}

/**
 * Sao kê hỗ trợ phí (`calculation` trên detail — BE PR #2756).
 *
 * Nhãn là chữ trình bày thuần FE, không phải enum BE, nên để local map.
 *
 * CR `86eyhjjug` bỏ khối "bóc tách hai chiều" khỏi giao diện ⇒ nhãn của `inflow`
 * (`agency_fee`/`investor_bonus`/`shared_bonus`), `outflow` và `remainder` không
 * còn bề mặt nào render nên đã xoá khỏi đây. Payload BE vẫn trả đủ 4 nhánh — cần
 * dựng lại thì lấy lại từ git history, đừng đoán tên nhãn.
 *
 * Thứ tự khai BÁM thứ tự render, nhưng render là danh sách tường minh trong
 * `buildFeeSupportSummaryRows` — thêm key ở đây KHÔNG tự đẻ ra dòng trên bảng.
 * Mỗi dòng TỔNG đứng ngay sau các thành phần của nó (BE PR #2831 — công thức
 * tường minh của BA):
 * - `sale_total`    = sale_regulated + bonus_regulated  (mức theo QUY ĐỊNH)
 * - `support_total` = support + bonus_support           (phần XIN THÊM, cả 2 kênh)
 * - `sale_net`      = support_total − customer_cut − customer_cut_bonus
 *
 * ⚠️ `sale_total` KHÔNG cộng `support`, và `sale_net` KHÔNG trừ từ `sale_total` —
 * bản #2784 trước đó cộng thừa `support`, đã bị BA bác.
 *
 * CR54 (`86eyqwp4v`, 26/08/2026) đổi nhãn `support` thành "Tổng phí xin hỗ trợ HH
 * sale" và thêm `support_extra` — xem chú thích của `support_extra` bên dưới.
 */
export const FEE_SUPPORT_CALC_REQUEST_LABEL = {
  sale_regulated: 'Phí sale quy định',
  bonus_regulated: 'Thưởng sale',
  sale_total: 'Tổng phí nhận',
  support: 'Tổng phí xin hỗ trợ HH sale',
  /**
   * CR54 — dòng FE TỰ TÍNH: `support − sale_regulated`. BE không trả dòng này.
   *
   * ⚠️ Công thức là nguyên văn CR và nó CHỎI với nghiệp vụ đang chạy: FSD 18.8
   * §3.4.1 chốt `support` đã là khoản xin THÊM (không bao gồm phí sale quy định),
   * nên phép trừ ra số ÂM với phiếu xin ít hơn mức quy định — 3/6 phiếu trên dev
   * ngày 26/08/2026. Đã nêu với user và user chốt làm đúng CR, chờ BA xác nhận lại.
   * Trước khi "sửa cho hết âm", đọc lại ghi chú này và hỏi BA — số âm là dữ kiện,
   * không phải lỗi hiển thị.
   */
  support_extra: 'Phí xin thêm',
  bonus_support: 'Xin hỗ trợ thưởng',
  support_total: 'Phí xin hỗ trợ',
  customer_cut: 'Trong đó cắt khách (hoa hồng)',
  /**
   * Cắt khách phần THƯỞNG (BE 2026-08-26). Khoét ra từ `bonus_regulated` — mức
   * thưởng quy định đang hiệu lực — chứ KHÔNG phải từ `bonus_support`, vì nghiệp
   * vụ không cho xin hỗ trợ thưởng (xem FEE_SUPPORT_BONUS_REQUEST_ENABLED).
   * Người duyệt đối chiếu: `bonus_regulated − customer_cut_bonus` = sale còn giữ.
   */
  customer_cut_bonus: 'Trong đó cắt khách (thưởng)',
  sale_net: 'Sale thực hưởng',
} as const

/**
 * Nghiệp vụ 2026-08-26: KHÔNG cho xin hỗ trợ thưởng, chỉ cho cắt khách phần
 * thưởng. Ô "Xin hỗ trợ thưởng" bị ẩn khỏi mọi form và payload luôn gửi `null`.
 *
 * ⚠️ Gửi `null`, KHÔNG gửi `0`: BE phân biệt hai kênh bằng `is not None`, nên `0`
 * nghĩa là "xin 0%" (một mức hợp lệ, ghi đè mức quy định về 0) — khác hẳn "không xin".
 *
 * BE vẫn nhận `support_bonus_*` và vẫn tính đúng nếu có: neo cắt khách tự động
 * chuyển sang `support_bonus` khi phiếu có xin. Nên bật lại chỉ cần đổi cờ này,
 * không đụng gì tới logic tính tiền hai đầu.
 */
export const FEE_SUPPORT_BONUS_REQUEST_ENABLED = false

/** `source` của sao kê. */
export const FEE_SUPPORT_CALC_SOURCE = {
  DEAL_CONFIG: 'deal_config',
  TBC_PROVISIONAL: 'tbc_provisional',
} as const

/** `warnings[].code` BE phát ra (BE PR #2756 — `fee_support_calculation.py`). */
export const FEE_SUPPORT_CALC_WARNING_CODE = {
  /** Giá tính phí ≤ 0 → BE trả mọi dòng null, FE ẩn hẳn các khối số. */
  NO_FEE_PRICE: 'no_fee_price',
  NO_CONFIG: 'no_config',
  OTHER_ACTIVE_SUPPORT: 'other_active_support',
  NEGATIVE_REMAINDER: 'negative_remainder',
} as const

/** `warnings[].code` → câu hiển thị. */
export const FEE_SUPPORT_CALC_WARNING_MESSAGE: Record<string, string> = {
  [FEE_SUPPORT_CALC_WARNING_CODE.NO_FEE_PRICE]:
    'Giao dịch chưa có giá tính phí nên chưa lập được sao kê.',
  [FEE_SUPPORT_CALC_WARNING_CODE.NO_CONFIG]:
    'Giao dịch chưa có cấu hình hoa hồng nên không lấy được khoản nhận từ CĐT.',
  [FEE_SUPPORT_CALC_WARNING_CODE.OTHER_ACTIVE_SUPPORT]:
    'Giao dịch còn phiếu hỗ trợ khác đang hiệu lực — sao kê này chỉ trừ phiếu đang xem.',
  [FEE_SUPPORT_CALC_WARNING_CODE.NEGATIVE_REMAINDER]:
    'Sau khi hỗ trợ, phần còn lại của công ty bị âm.',
}
