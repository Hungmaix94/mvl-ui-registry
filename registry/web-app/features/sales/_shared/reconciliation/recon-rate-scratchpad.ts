import { roundReconVnd, toNum, type ReconAgreedTerms } from './recon-calculations'

/**
 * GAP 4c — ô TỶ LỆ là GIẤY NHÁP, không phải nguồn số thứ hai.
 *
 * Bảng kê của chủ đầu tư nêu một SỐ TIỀN. Nhập tiến độ kỳ này bằng TỶ LỆ không tái tạo được con số
 * đó, vì mỗi CĐT làm tròn ở một CHỖ khác nhau trong chuỗi tính. Đo trên 297 dòng thật của kỳ
 * 202607, cột tỷ lệ dùng được **0 lần**. Nhưng người nhập vẫn nghĩ bằng "50%".
 *
 * Nên: giữ ô tỷ lệ, hiện SỐ TIỀN mà tỷ lệ đó quy ra ngay cạnh ô số tiền để đối chiếu với bảng kê.
 * Lệch thì chép thẳng số của CĐT vào ô SỐ TIỀN. Tuyệt đối KHÔNG đẩy tỷ lệ thành nguồn số.
 *
 * Nhập bằng SỐ TIỀN **không** làm mất phần trăm tròn trịa: BE suy tiến độ ngược từ số tiền rồi
 * lượng tử hoá về 2 chữ số thập phân, nên 52.162.619 vẫn lưu thành 50,00%. Đừng cảnh báo ngược lại.
 *
 * ⚠️ VÌ SAO KHÔNG DÙNG {@link computePeriodCommission} — dù nó trông đúng việc
 * ------------------------------------------------------------------------
 * Giấy nháp này chỉ có giá trị nếu nó nói ĐÚNG con số BE sẽ tính. Mà `computePeriodCommission`
 * gọi `agencyCommissionFull`, và hàm đó **làm tròn phí trọn căn TRƯỚC** khi nhân tiến độ:
 *
 *     FE  : round( round(giá × %HH) × tiến độ )
 *     BE  : round(       giá × %HH  × tiến độ )      ← InvestorReconciliation._period_commission_exact
 *
 * BE cố ý KHÔNG làm tròn toán hạng, và docstring của `_agency_commission_exact` nêu đúng hậu quả
 * nếu làm: *"the totals must not consume a rounded operand, or the half-dong it gained is scaled by
 * the progress and can flip the next rounding"* — kèm ca thật (staging IR pk=146). Đó chính xác là
 * chuyện xảy ra với Chamora HĐ 830, cấu hình THẬT của nó là 5% trên 1.896.822.490,35:
 *
 *     phí trọn căn chính xác = 94.841.124,5175
 *     BE  : 94.841.124,5175 × 50%          = 47.420.562,25875 → 47.420.562   ← số BE lưu
 *     FE  : round(94.841.124,5175) × 50%   = 47.420.562,5     → 47.420.563   ← lệch 1đ
 *
 * Dùng lại helper sẵn có ở đây sẽ khiến giấy nháp hiện một con số rồi BE tính ra con số khác — hỏng
 * đúng việc nó sinh ra để làm. Nên nó tự nhân theo quy tắc của BE: giữ chính xác đến cuối, làm tròn
 * MỘT lần. Đây không phải phép tính mới, mà là **cùng một phép tính, đúng thứ tự làm tròn**.
 *
 * (`agencyCommissionFull` vẫn giữ nguyên cho các chỗ hiển thị khác — sửa nó là một thay đổi khác,
 * rộng hơn nhiều, và không thuộc phạm vi ô giấy nháp này.)
 */

export type RateScratchpadInput = ReconAgreedTerms & {
  /** Tiến độ đối chiếu đợt này, tính bằng PHẦN TRĂM (vd `50` cho 50%). */
  pctPeriodCommission: number | null | undefined
}

/** Phí trọn căn ở dạng CHÍNH XÁC — không làm tròn, đúng `_agency_commission_exact` của BE. */
function agencyCommissionFullExact(input: ReconAgreedTerms): number {
  if (input.amtAgencyFee != null) return input.amtAgencyFee
  return (input.feeCalculationPrice * toNum(input.pctAgencyFee)) / 100
}

/**
 * Số tiền mà tỷ lệ đang nhập quy ra. `null` khi chưa nhập tỷ lệ (không có gì để đối chiếu) — KHÔNG
 * trả 0, vì "0 đ" trông như một kết quả đã tính và người đọc sẽ tưởng phí trọn căn bằng 0.
 */
export function rateScratchpadAmount(input: RateScratchpadInput): number | null {
  const pct = input.pctPeriodCommission
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return null
  return roundReconVnd((agencyCommissionFullExact(input) * pct) / 100)
}
