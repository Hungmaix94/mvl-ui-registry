import { formatMoney, formatPercent } from '@/utils/common'

/**
 * Định dạng dùng chung cho sao kê hỗ trợ phí.
 *
 * Tách ra một chỗ vì cột % và cột tiền phải khớp nhau TUYỆT ĐỐI: cùng một dòng mà
 * cột % hiện `-` còn cột tiền hiện `—` thì người duyệt sẽ tưởng là hai loại "rỗng"
 * khác nhau. `formatMoney` trả em-dash `—` cho giá trị rỗng, còn `formatPercent`
 * trả gạch ngang thường `-`, nên phải quy về một ký tự.
 */
export const CALC_DASH = '—'

/** Số tiền BE trả dạng chuỗi decimal; rỗng/không hợp lệ → `—`. */
export const formatCalcMoney = formatMoney

/** % hiệu dụng BE trả dạng chuỗi decimal (`"2.73"`); rỗng/không hợp lệ → `—`. */
export function formatCalcPercent(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return CALC_DASH
  const formatted = formatPercent(value)
  // formatPercent tự trả '-' khi parse hỏng — đồng bộ về em-dash cho khớp cột tiền.
  return formatted === '-' ? CALC_DASH : formatted
}

/**
 * "Có tiền không" — số của BE là CHUỖI decimal nên `"0"` vẫn truthy; mọi guard
 * phải so sánh bằng số chứ không dùng truthiness.
 */
export function isNonZeroDecimal(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && Number(value) !== 0
}

/** `"25000000"` → 25000000; rỗng / không parse được → `null` (KHÁC 0). */
function toDecimalNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Số chữ số thập phân của chuỗi decimal BE trả (`"0.25"` → 2, `"25000000"` → 0). */
function decimalPlaces(value: string | null | undefined): number {
  if (!value) return 0
  const [, fraction] = value.split('.')
  return fraction?.length ?? 0
}

/**
 * Cộng hai chuỗi decimal của BE và trả về chuỗi decimal.
 *
 * ⚠️ Một trong hai NGOẠI LỆ của luật "FE không tính lại tiền" (xem thêm
 * {@link subtractDecimals}): FSD 18.8 §3.4.1 chốt rằng "Thưởng MV nhận" giữ 2 dòng
 * `investor_bonus` + `shared_bonus` ở BE để không mất khả năng bóc tách, và **FE
 * gộp khi hiển thị**. Đừng mở rộng hàm này sang các dòng khác — mọi dòng còn lại
 * BE đã trả sẵn số tổng.
 *
 * `null` = KHÔNG có nguồn rate, khác hẳn 0đ (xem `isNonZeroDecimal`):
 * - cả hai `null` → `null` để ô vẫn hiện `—`;
 * - chỉ một bên có số → lấy đúng số đó, KHÔNG coi bên kia là 0 rồi cộng vào.
 *
 * Giữ nguyên số chữ số thập phân lớn nhất của hai vế để `0.25 + 0.40` ra `"0.65"`
 * chứ không phải `"0.6500000000000001"` (dư số nhị phân của float).
 */
export function sumDecimals(
  left: string | null | undefined,
  right: string | null | undefined
): string | null {
  const a = toDecimalNumber(left)
  const b = toDecimalNumber(right)
  if (a === null && b === null) return null
  return ((a ?? 0) + (b ?? 0)).toFixed(Math.max(decimalPlaces(left), decimalPlaces(right)))
}

/**
 * Trừ hai chuỗi decimal của BE và trả về chuỗi decimal.
 *
 * ⚠️ Ngoại lệ THỨ HAI của luật "FE không tính lại tiền", do CR54 (`86eyqwp4v`) chốt:
 * dòng "Phí xin thêm" = `support − sale_regulated`. BE chưa trả sẵn dòng này, và BA
 * yêu cầu hiện nó ở màn chi tiết. Đừng mở rộng sang dòng khác.
 *
 * ⚠️ **Kết quả ÂM là bình thường và KHÔNG được nuốt về 0.** Theo FSD 18.8 §3.4.1
 * `support` là khoản xin THÊM, không bao gồm phí sale quy định, nên phiếu xin ít hơn
 * mức quy định sẽ ra số âm — đo trên dev 26/08/2026 là 3/6 phiếu. Đây là điểm chỏi
 * giữa CR và nghiệp vụ đang chạy đã báo cho BA; nếu sau này BA đổi ý thì sửa ở chỗ
 * gọi, đừng kẹp `Math.max(0, …)` vào đây để "cho đẹp" — che số âm là giấu mất đúng
 * cái mà BA cần nhìn thấy để chốt lại.
 *
 * KHÁC {@link sumDecimals} ở cách xử null: phép trừ cần ĐỦ CẢ HAI VẾ mới có nghĩa.
 * `null` = không có nguồn rate (khác hẳn 0đ), nên thiếu bất kỳ vế nào → `null` để ô
 * hiện `—`. Coi vế thiếu là 0 rồi trừ sẽ đẻ ra số bịa (vd phiếu chỉ xin thưởng,
 * `support = null`, sẽ ra `−197tr` như thể sale đang trả lại tiền).
 *
 * Giữ số chữ số thập phân lớn nhất của hai vế, cùng lý do float như `sumDecimals`.
 */
export function subtractDecimals(
  left: string | null | undefined,
  right: string | null | undefined
): string | null {
  const a = toDecimalNumber(left)
  const b = toDecimalNumber(right)
  if (a === null || b === null) return null
  return (a - b).toFixed(Math.max(decimalPlaces(left), decimalPlaces(right)))
}
