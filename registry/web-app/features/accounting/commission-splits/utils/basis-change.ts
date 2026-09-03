import type { components } from '@/api/schema'

/**
 * CR STT34 (`86eyf8grj`) — giá tính phí kỳ này lệch so với kỳ thanh toán liền kề trước.
 *
 * BE (`_batch_basis_history_map`) đã resolve giá đang hiệu lực của TỪNG kỳ rồi mới trừ, nên FE
 * chỉ được đọc `basis_delta`. TUYỆT ĐỐI KHÔNG tự tính `basis - previous_basis`: cột `basis` là
 * `Deal.fee_calculation_price` — cache của bản đối chiếu confirm mới nhất, dùng chung cho MỌI kỳ
 * của deal — nên phép trừ đó sẽ làm mọi dòng lịch sử sáng cảnh báo sau một lần đổi giá, thay vì
 * đúng một kỳ có thay đổi.
 */
export type BasisChange = {
  direction: 'increase' | 'decrease'
  /** Độ lớn thay đổi, luôn dương — con số in trên huy hiệu. */
  amount: number
  /** Giá tính phí đang hiệu lực ở kỳ liền kề trước. */
  previous: number
  /** Giá tính phí đang hiệu lực ở kỳ này (= previous + delta). */
  current: number
}

/**
 * Chỉ hai field này quyết định cảnh báo. Khai bằng `Pick` để cả hai màn danh sách truyền row
 * thẳng vào được — `CommissionSplitListRow` và `DealPeriodWorksheetListRow` đều là superset của
 * cùng một schema row.
 */
export type BasisChangeSource = Pick<
  components['schemas']['DealPeriodWorksheetListRow'],
  'previous_basis' | 'basis_delta'
>

/** `null` = không cảnh báo: kỳ đầu tiên, giá không đổi, hoặc payload không đọc được. */
export function resolveBasisChange(row: BasisChangeSource): BasisChange | null {
  // Chốt `null` TRƯỚC khi ép kiểu: `Number(null)` ra 0 nên kỳ đầu tiên (BE trả null) sẽ bị đọc
  // nhầm thành "giá kỳ trước = 0" và cảnh báo giảm cả tỷ đồng.
  if (row.previous_basis == null || row.basis_delta == null) return null

  const previous = Number(row.previous_basis)
  const delta = Number(row.basis_delta)
  // `Number(undefined)` ra NaN mà `NaN !== 0` là true — thiếu chốt hữu hạn thì payload cũ (chưa
  // có hai field) hiện cảnh báo sai trên MỌI dòng.
  if (!Number.isFinite(previous) || !Number.isFinite(delta) || delta === 0) return null

  return {
    direction: delta > 0 ? 'increase' : 'decrease',
    amount: Math.abs(delta),
    previous,
    current: previous + delta,
  }
}
