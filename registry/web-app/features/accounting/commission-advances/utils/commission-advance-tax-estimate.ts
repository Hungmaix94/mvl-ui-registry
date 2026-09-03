import { isEmployeeShare } from '@/features/accounting/commission-advances/types/commission-advance-types'

/**
 * Thuế suất tạm tính (20.17) — công cụ ƯỚC TÍNH thực nhận sau thuế cho người duyệt.
 *
 * Số ra từ đây KHÔNG bao giờ được gửi lên BE, KHÔNG được lưu, và KHÔNG được dùng làm
 * trần chặn cứng. Trần tạm ứng thật là `advanceCapForShare` (rule BE: nhân viên 100% share,
 * CTV 90%, tối đa 100M/dòng) — nó cố tình KHÔNG phụ thuộc thuế suất. Bản cũ từng lấy
 * `gross × (1 − thuế)` làm trần và lệch hẳn khỏi BE; đừng dựng lại ràng buộc đó.
 * Thuế TNCN thật được tính lại khi tổng kết hoa hồng tháng, và số đã tạm ứng bị trừ vào
 * thu nhập SAU THUẾ của kỳ tổng kết.
 */
export const DEFAULT_TAX_ESTIMATE_RATE = 10

/** Bốn mức thuế BA chốt cho ô chọn thuế suất tạm tính. */
export const TAX_ESTIMATE_RATES = [0, 10, 20, 35] as const

/** Options cho `Select` thuế suất ở form Tạo/Sửa (ô nằm trong ô bảng nên vẫn là dropdown). */
export const TAX_ESTIMATE_RATE_OPTIONS = TAX_ESTIMATE_RATES.map((rate) => ({
  value: String(rate),
  label: `${rate}%`,
}))

export const MIN_TAX_ESTIMATE_RATE = 0
export const MAX_TAX_ESTIMATE_RATE = 100

/** Bước cộng/trừ nhanh của hai nút ±5% cạnh ô nhập thuế suất ở dialog duyệt. */
export const TAX_ESTIMATE_RATE_STEP = 5

/**
 * Ép thuế suất về khoảng hợp lệ [0, 100].
 * Giá trị không phải số (ô bị xoá trắng, người dùng dán chữ) → về mức mặc định thay vì `NaN`,
 * vì `NaN` sẽ lan xuống mọi con số thực nhận và màn hình hiện `NaN VNĐ`.
 */
export function clampTaxRate(rate: number | undefined | null): number {
  if (rate === undefined || rate === null || !Number.isFinite(rate)) {
    return DEFAULT_TAX_ESTIMATE_RATE
  }
  return Math.min(MAX_TAX_ESTIMATE_RATE, Math.max(MIN_TAX_ESTIMATE_RATE, rate))
}

/** Cộng/trừ nhanh thuế suất, luôn kẹp lại trong [0, 100]. */
export function stepTaxRate(current: number | undefined | null, delta: number): number {
  return clampTaxRate(clampTaxRate(current) + delta)
}

/** Dòng thụ hưởng — chỉ hai field cần để khớp với bảng chia. */
export type RecipientRef = {
  recipient_employee?: number | null
  recipient_collaborator?: number | null
}

/** Share trong bảng chia — chỉ phần shape mà việc khớp + lấy tiền gốc cần tới. */
export type CommissionShareLike = {
  employee?: { id?: number | null } | null
  collaborator?: { id?: number | null } | null
  calculated_amount?: string | number | null
  recipient_kind?: string | null
}

/**
 * Khớp một dòng thụ hưởng với share của nó trong bảng chia.
 *
 * Dòng nhân viên phải qua `isEmployeeShare` để loại share CTV có chứa nhân viên nguồn —
 * bỏ điều kiện đó là dòng nhân viên ăn nhầm tiền gốc của dòng CTV.
 */
export function findShareForRecipient(
  shares: readonly CommissionShareLike[] | undefined | null,
  line: RecipientRef | undefined | null
): CommissionShareLike | undefined {
  if (!shares || !line) return undefined
  return shares.find(
    (share) =>
      (!!line.recipient_employee &&
        share.employee?.id === line.recipient_employee &&
        isEmployeeShare(share)) ||
      (!!line.recipient_collaborator && share.collaborator?.id === line.recipient_collaborator)
  )
}

/**
 * Tiền hoa hồng gốc (trước thuế) của một dòng thụ hưởng.
 * `undefined` = chưa biết (deal chưa có bảng chia, hoặc dòng thêm tay không khớp share nào)
 * — phía hiển thị phải ra `—`, KHÔNG được ra `0`, vì 0 đọc như "không được nhận đồng nào".
 */
export function grossShareForRecipient(
  shares: readonly CommissionShareLike[] | undefined | null,
  line: RecipientRef | undefined | null
): number | undefined {
  const share = findShareForRecipient(shares, line)
  if (!share) return undefined
  const gross = Number(share.calculated_amount ?? 0)
  return Number.isFinite(gross) ? gross : undefined
}

/** Dòng thụ hưởng nhìn từ phía tiền — hai field quyết định phiếu này đang lấy bao nhiêu HH. */
export type AdvanceAmountRef = {
  requested_amount?: string | number | null
  approved_amount?: string | number | null
}

/**
 * Số tiền phiếu này đang lấy khỏi hoa hồng của người thụ hưởng.
 *
 * Đã duyệt thì lấy số DUYỆT (kể cả duyệt 0đ — đó là một quyết định, không phải "chưa duyệt"),
 * chưa duyệt thì lấy số ĐỀ XUẤT. Số không đọc được → 0, để không đẩy `NaN` xuống cột "HH còn lại".
 */
export function advanceAmountForLine(line: AdvanceAmountRef | undefined | null): number {
  if (!line) return 0
  const raw = line.approved_amount ?? line.requested_amount
  if (raw === undefined || raw === null || raw === '') return 0
  const amount = Number(raw)
  return Number.isFinite(amount) ? amount : 0
}

/**
 * "HH còn lại" = HH cả căn − số tiền phiếu này lấy.
 *
 * `undefined` = chưa biết HH cả căn (phiếu không gắn deal, hoặc dòng thêm tay không khớp share
 * nào) ⇒ hiển thị `—`, KHÔNG ra `0` — cùng quy ước với `grossShareForRecipient`.
 *
 * Cố tình KHÔNG kẹp về 0 khi âm: ứng vượt hoa hồng chính là thứ màn này sinh ra để kế toán
 * nhìn thấy; kẹp về 0 là giấu đúng cái cần cảnh báo.
 */
export function remainingGross(
  gross: number | undefined | null,
  advanceAmount: number
): number | undefined {
  if (gross === undefined || gross === null || !Number.isFinite(gross)) return undefined
  return gross - advanceAmount
}

/**
 * Dòng TỔNG CỘNG cho hai cột "HH cả căn" / "HH còn lại".
 *
 * **Chỉ ra số khi MỌI dòng đều tra được bảng chia.** Còn một dòng chưa tra được là cả hai ô ra
 * `undefined` ⇒ hiển thị '—'. Cố tình không cộng "phần tra được": dòng TỔNG CỘNG trong màn kế
 * toán là con số người ta cộng chéo với các cột bên cạnh, mà tổng chạy trên tập con thì
 * `HH cả căn − Số tiền duyệt` (cộng đủ mọi dòng) sẽ KHÁC `HH còn lại` — sai lệch im lặng, không
 * có gì trên màn báo là số đó đang thiếu dòng. `—` thì đọc ra ngay là chưa đủ dữ liệu.
 *
 * Dòng nào tra được vẫn hiện số của nó ở cột tương ứng; chỉ ô tổng mới nghiêm ngặt.
 */
export function sumRecipientGrossTotals(
  rows: readonly { gross: number | undefined; advanceAmount: number }[] | undefined | null
): { gross: number | undefined; remaining: number | undefined } {
  const list = rows ?? []
  if (list.length === 0 || list.some((row) => row.gross === undefined)) {
    return { gross: undefined, remaining: undefined }
  }
  let gross = 0
  let remaining = 0
  for (const row of list) {
    gross += row.gross as number
    remaining += (row.gross as number) - row.advanceAmount
  }
  return { gross, remaining }
}

/**
 * Ước tính thực nhận sau thuế của MỘT khoản tiền trước thuế = `floor(amount × (1 − thuế suất))`.
 *
 * Dùng cho hai đại lượng khác nhau, cố ý chung một hàm để chúng không bao giờ lệch nhau:
 * - `amount` = **số tiền duyệt** ⇒ "người này thực nhận bao nhiêu nếu duyệt ngần này"
 * - `amount` = **tiền hoa hồng gốc** ⇒ "tối đa có thể ứng sau thuế"
 *
 * Làm tròn xuống để con số hiện ra không bao giờ hứa nhiều hơn thực nhận.
 * Trả `undefined` khi chưa biết khoản tiền đó.
 */
export function estimateNetAfterTax(
  amount: number | undefined | null,
  taxRatePct: number
): number | undefined {
  if (amount === undefined || amount === null || !Number.isFinite(amount)) {
    return undefined
  }
  return Math.floor(amount * (1 - clampTaxRate(taxRatePct) / 100))
}

/**
 * Số tiền duyệt có vượt phần người thụ hưởng thực nhận sau thuế không.
 * Chưa biết thực nhận ⇒ `false`: không bịa cảnh báo khi không có cơ sở so sánh.
 */
export function isApprovedOverEstimatedNet(
  approvedAmount: number,
  estimatedNet: number | undefined
): boolean {
  if (estimatedNet === undefined) return false
  return approvedAmount > estimatedNet
}
