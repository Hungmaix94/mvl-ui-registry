/**
 * Khoản hoa hồng xúc tiến nhập tay — số tiền thoả thuận ngoài công thức phiếu PBXT.
 *
 * Không gắn dự án, không gắn phiếu phân bổ: khoá tự nhiên chỉ là (nhân sự × kỳ). Tiền vẫn đi
 * vai trò PROMO nên cộng vào mục ĐT&XT của bảng kê, đợt chi khối quản lý và cơ sở thuế TNCN.
 */
export const PROMOTION_MANUAL_ENTRY_SUBJECT = 'promotion_manual_entry'

export const PROMOTION_MANUAL_ENTRY_ACTIONS = {
  CREATE: 'create',
  PARTIAL_UPDATE: 'partial_update',
} as const

/** Không có hành động xoá: huỷ một khoản = sửa số tiền về 0. */
export const PROMOTION_MANUAL_ENTRY_CANCEL_HINT =
  'Huỷ một khoản bằng cách sửa số tiền về 0 — hệ thống không xoá dòng để giữ dấu vết văn bản.'
