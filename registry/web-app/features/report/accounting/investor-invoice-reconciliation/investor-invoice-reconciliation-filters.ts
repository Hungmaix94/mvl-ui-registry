/**
 * Đọc/ghi ô lọc `has_remaining` của báo cáo 20.16 "Đối chiếu chi tiết căn" (CR 86eyhhgdv).
 *
 * Tách riêng vì cùng một giá trị được đọc ở BA nơi — params gửi API (list + `/summary/` +
 * export), giá trị seed lại vào dialog, và badge đếm bộ lọc. Ba nơi tự parse riêng là cách
 * badge bắt đầu nói khác những gì bảng đang hiện.
 */

/**
 * Tên param trên URL. Cả nơi ĐỌC lẫn nơi GHI đều phải đi qua hằng này — module tách ra chính
 * là để một mình nó sở hữu chữ `has_remaining`; để trang tự gõ lại chuỗi thô thì đổi tên param
 * ở đây sẽ chỉ sửa được nửa đường đi và badge sẽ đếm khác thứ bảng đang hiện.
 */
export const HAS_REMAINING_PARAM = 'has_remaining'

/** Ghi lên URL bằng đúng chữ BE nhận, để URL copy từ tab Network dán lại vẫn chạy. */
export const HAS_REMAINING_ON = 'true'

/**
 * BE coi `true`/`1` (sau `.strip().lower()`) là BẬT, mọi giá trị khác là TẮT — nhận cả hai
 * ở đây để một URL gõ tay `?has_remaining=1` không hiển thị ngược với dữ liệu API trả về.
 */
const HAS_REMAINING_ON_VALUES = new Set([HAS_REMAINING_ON, '1'])

/**
 * `has_remaining` VẮNG trên URL nghĩa là TẮT — mặc định của bộ lọc.
 *
 * Ngược với `has_debt` của báo cáo công nợ theo dự án (vắng = BẬT): so sánh ở đây là CHẶT
 * (`> 0`) nên bật lên sẽ giấu luôn dòng ÂM — căn đã xuất hoá đơn vượt doanh thu đối chiếu.
 * Đó là bất thường kế toán cần thấy, nên phải do người dùng chủ động bật.
 */
export function parseHasRemaining(params: URLSearchParams): boolean {
  return HAS_REMAINING_ON_VALUES.has((params.get(HAS_REMAINING_PARAM) ?? '').trim().toLowerCase())
}
