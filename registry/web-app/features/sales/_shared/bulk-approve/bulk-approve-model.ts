// Mô hình dùng chung cho luồng "Duyệt nhiều" (CR STT35 — ClickUp 86eykqg7t) của ba màn
// HĐ đặt cọc / HĐ đặt chỗ / Hoàn tiền đặt chỗ. Cả ba gọi cùng một hình dạng API
// (`POST .../bulk-approve/`) nên type và nhãn bàn duyệt nằm chung một chỗ.
import type { components } from '@/api/schema'
import { BulkApproveStepValue } from '@/constants/api-schema-aliases'

export type BulkApproveResult = components['schemas']['BulkApproveResult']
export type BulkApproveApproved = components['schemas']['BulkApproveApproved']
export type BulkApproveSkipped = components['schemas']['BulkApproveSkipped']
export type BulkApproveItemRequest = components['schemas']['BulkApproveItemRequestRequest']

/**
 * Ba bàn duyệt trong thang duyệt của sales.
 *
 * Giá trị lấy TỪ enum sinh ra bởi OpenAPI, không gõ tay chuỗi. Mỗi giá trị kiêm ba vai ở BE
 * (`BulkApproveStep` trong `apps/sales/constants.py`): tên action của endpoint duyệt lẻ, hậu tố
 * quyền `<entity>.<step>` kiểm cho từng bản ghi, và giá trị trả về ở `approved[].step`. Trước
 * đây ba chuỗi này gõ tay ở đây, nên gõ sai một ký tự vẫn biên dịch được và chỉ lộ lúc chạy —
 * dưới dạng bản ghi bị BE từ chối. Map dưới đây chỉ đổi tên khoá sang UPPER_SNAKE cho dễ đọc ở
 * call site; kiểu và giá trị vẫn là của schema.
 */
export const BULK_APPROVE_STEP = {
  ADMIN: BulkApproveStepValue.approve,
  ADMIN_LEAD: BulkApproveStepValue.admin_lead_approve,
  ACCOUNTANT: BulkApproveStepValue.accountant_approve,
} as const

export type BulkApproveStep = (typeof BULK_APPROVE_STEP)[keyof typeof BULK_APPROVE_STEP]

/**
 * Chốt chặn biên dịch: `Object.values` trả về `BulkApproveStepValue[]`, chỉ gán được vào
 * `BulkApproveStep[]` khi map phía trên phủ ĐỦ enum của BE. BE thêm một bàn duyệt mới mà quên
 * bổ sung vào map → dòng này lỗi ngay, thay vì bàn đó âm thầm không bao giờ tích chọn được.
 */
export const BULK_APPROVE_STEPS: readonly BulkApproveStep[] = Object.values(BulkApproveStepValue)

/** Nhãn tiếng Việt của bàn duyệt — hiện trên chip từng dòng trong dialog xác nhận. */
export const BULK_APPROVE_STEP_LABEL: Record<BulkApproveStep, string> = {
  [BULK_APPROVE_STEP.ADMIN]: 'Admin',
  [BULK_APPROVE_STEP.ADMIN_LEAD]: 'Trưởng nhóm Admin',
  [BULK_APPROVE_STEP.ACCOUNTANT]: 'Kế toán',
}

/**
 * Màu theo bàn duyệt. Một lần bấm "Duyệt nhiều" có thể chạy nhiều bàn khác nhau, nên mỗi
 * dòng cần đọc được bàn của nó *mà không phải đọc chữ* — đó là việc của dải màu bên trái.
 */
export const BULK_APPROVE_STEP_TONE: Record<BulkApproveStep, { rail: string; chip: string }> = {
  [BULK_APPROVE_STEP.ADMIN]: {
    rail: 'bg-data-blue-default',
    chip: 'bg-data-blue-disabled text-data-blue-default',
  },
  [BULK_APPROVE_STEP.ADMIN_LEAD]: {
    rail: 'bg-data-purple-default',
    chip: 'bg-data-purple-disabled text-data-purple-default',
  },
  [BULK_APPROVE_STEP.ACCOUNTANT]: {
    rail: 'bg-data-orange-default',
    chip: 'bg-data-orange-disabled text-data-orange-default',
  },
}

/**
 * Trần số bản ghi một lượt. Trùng `BulkApproveRequestSerializer.MAX_ITEMS` ở BE.
 *
 * FE chặn trước thay vì để BE trả 400: lựa chọn tích luỹ qua nhiều trang nên vượt trần là
 * chuyện xảy ra được, và một lỗi 400 sau khi đã gõ xong ghi chú cho 200 dòng là mất công.
 */
export const BULK_APPROVE_MAX_ITEMS = 200

/** Một bản ghi đã tích chọn, đủ để nhận diện trong dialog xác nhận. */
export type BulkApproveCandidate = {
  id: number
  code: string
  /** Dòng phụ nhận diện bản ghi (khách hàng · căn · số tiền) — mỗi màn tự quyết nội dung. */
  subject: string
  step: BulkApproveStep
}

/** Một dòng trong dialog kết quả: dữ liệu BE trả về, ghép lại mã đã biết từ lúc chọn. */
export type BulkApproveResultRow = {
  id: number
  code: string
  subject: string
  /** Chỉ có ở nhóm "đã duyệt". */
  step?: BulkApproveStep
  /** Chỉ có ở nhóm "bỏ qua". */
  reason?: string
}

export type BulkApproveOutcome = {
  approvedRows: BulkApproveResultRow[]
  skippedRows: BulkApproveResultRow[]
}

/**
 * Ghép kết quả BE với thông tin hiển thị đã thu được lúc tích chọn.
 *
 * BE chỉ trả `{id, code, step|reason}` và không trả dòng nhận diện, nên `subject` luôn lấy từ
 * `candidates`. Với `code`: BE là nguồn chuẩn khi có giá trị, nhưng nó trả RỖNG cho bản ghi
 * không đọc được (đã bị xoá, hoặc ngoài phạm vi dự án của người bấm) — lúc đó lùi về mã người
 * dùng vừa nhìn thấy trên bảng, thay vì hiện `#id` bắt họ tự tra lại.
 */
export function buildBulkApproveOutcome(
  result: BulkApproveResult,
  candidates: readonly BulkApproveCandidate[]
): BulkApproveOutcome {
  const byId = new Map(candidates.map((c) => [c.id, c]))
  const resolve = (id: number, codeFromApi: string) => {
    const known = byId.get(id)
    return {
      id,
      code: codeFromApi || known?.code || `#${id}`,
      subject: known?.subject ?? '',
    }
  }

  return {
    approvedRows: (result.approved ?? []).map((row) => ({
      ...resolve(row.id, row.code),
      step: row.step,
    })),
    skippedRows: (result.skipped ?? []).map((row) => ({
      ...resolve(row.id, row.code),
      reason: row.reason,
    })),
  }
}
