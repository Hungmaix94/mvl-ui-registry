/**
 * Giảm trừ đối chiếu đi theo thế chia phí (chốt 05/08).
 *
 * Giảm trừ là khoản đòi lại TRÊN PHÍ, nên mặc định ai nhận bao nhiêu phần phí thì gánh bấy
 * nhiêu phần giảm trừ — nhận hộ 100% phí thì gánh 100% giảm trừ. Đây chỉ là MẶC ĐỊNH: kế
 * toán gõ đè được ở trình sửa, và số gõ tay được giữ nguyên (xem `__ded_touched`).
 *
 * Cùng công thức với `pooled_payout_service._deduction_cuts` bên BE cho đường chia gộp, để
 * hai đường nhận hộ không ra hai kết quả khác nhau trên cùng một tình huống.
 */

/**
 * Chia `target` (ĐỘ LỚN, luôn ≥ 0) theo tỉ lệ tiền phí từng dòng.
 *
 * Trả về mảng độ lớn cộng ĐÚNG bằng `target` — BE validate tổng khớp `allocated`, lệch 1đ
 * là 400 cả payload. Phần dư làm tròn dồn vào dòng gánh phí NHIỀU NHẤT, không dồn vào dòng
 * cuối: dòng cuối có thể là người không nhận đồng phí nào, gán cho họ 1đ giảm trừ vừa sai
 * nghiệp vụ vừa khó giải thích.
 *
 * `null` = không có gì để bám vào (tổng phí bằng 0, ví dụ nhóm chỉ có thưởng, hoặc kỳ này
 * chưa chia phí) — người gọi giữ nguyên thế chia hiện tại thay vì bịa ra một tỉ lệ.
 */
export function deductionMagnitudesFromFee(feeAmounts: number[], target: number): number[] | null {
  if (feeAmounts.length === 0) return null
  const magnitudes = feeAmounts.map((a) => Math.abs(a))
  const feeTotal = magnitudes.reduce((s, a) => s + a, 0)
  if (feeTotal <= 0) return null

  const goal = Math.abs(Math.round(target))
  const driftIdx = magnitudes.indexOf(Math.max(...magnitudes))
  const out = magnitudes.map((a, idx) =>
    idx === driftIdx ? 0 : Math.max(0, Math.round((goal * a) / feeTotal))
  )
  const assigned = out.reduce((s, a) => s + a, 0)
  out[driftIdx] = Math.max(0, goal - assigned)
  return out
}
