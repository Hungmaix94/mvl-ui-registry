import { parsePositiveInt } from '@/utils/common'

/** Ô lọc nằm trong dialog của báo cáo 20.16: "Dự án" và ô tick trên cột "Cuối kỳ". */
export type ProjectReceivableFilterValues = {
  project: number | null
  /** SRS 20.16 §2.2 — mặc định BẬT: báo cáo chỉ hiện dự án còn nợ cuối kỳ. */
  hasDebt: boolean
}

/**
 * Trạng thái ô tick luôn được ghi TƯỜNG MINH lên URL: `has_debt=true` hoặc `has_debt=false`.
 *
 * Bản trước ghi theo kiểu "vắng param = BẬT, `has_debt=0` = TẮT" — đọc URL không đoán nổi bộ
 * lọc đang bật hay tắt, và `0` thì lệch hẳn so với `true`/`false` mà request gửi lên BE. Ghi
 * đúng hai giá trị BE nhận là URL trên thanh địa chỉ và query string trong tab Network khớp
 * nhau từng chữ.
 *
 * `has_debt` VẮNG vẫn hiểu là BẬT, vì đó là trạng thái mở màn trước khi người dùng bấm "Áp
 * dụng" lần nào (SRS 20.16 §2.2) và là mặc định cho link cũ chưa có param.
 *
 * `'0'` vẫn được nhận là TẮT để link cũ đã chia sẻ không âm thầm bật lọc lên.
 */
export const HAS_DEBT_PARAM = 'has_debt'
const HAS_DEBT_ON = 'true'
const HAS_DEBT_OFF = 'false'
const HAS_DEBT_OFF_VALUES = new Set([HAS_DEBT_OFF, '0'])

/**
 * Đọc bộ lọc từ URL, bỏ mọi giá trị không phải id dương.
 *
 * URL gõ tay (`?project=abc`) thả thẳng qua `Number()` sẽ thành `NaN` rồi đi vào query string
 * là `project=NaN`. Làm sạch ngay tại đây để ba nơi cùng đọc MỘT nguồn: params gửi API, giá trị
 * seed lại vào dialog, và badge đếm.
 */
export function parseProjectReceivableFilters(
  params: URLSearchParams
): ProjectReceivableFilterValues {
  return {
    project: parsePositiveInt(params.get('project')) ?? null,
    // `.trim().toLowerCase()` để `?has_debt=False` (viết hoa — đúng dạng Django hay dùng) không
    // bị đọc thành BẬT: BE hạ chữ trước khi so, nên không chuẩn hoá ở đây là màn hình hiện ô
    // tick ngược hẳn với ý người gõ URL.
    hasDebt: !HAS_DEBT_OFF_VALUES.has((params.get(HAS_DEBT_PARAM) ?? '').trim().toLowerCase()),
  }
}

/**
 * Ghi bộ lọc lên URL và luôn quay về trang 1.
 *
 * Reset trang là bắt buộc chứ không phải cho gọn: bảng phân trang client-side trên toàn mảng
 * `by_project`, nên lọc còn 1 dòng trong lúc đang đứng ở trang 2 sẽ ra màn hình trắng.
 */
export function buildProjectReceivableFilterParams(
  current: URLSearchParams,
  values: ProjectReceivableFilterValues
): URLSearchParams {
  const next = new URLSearchParams(current)

  if (values.project === null) next.delete('project')
  else next.set('project', String(values.project))

  next.set(HAS_DEBT_PARAM, values.hasDebt ? HAS_DEBT_ON : HAS_DEBT_OFF)

  next.set('page', '1')
  return next
}

/**
 * Số tiêu chí đang bật, để hiện badge cạnh nút "Bộ lọc".
 *
 * Đếm theo Ô TRONG DIALOG chứ không theo số query param của trang: `year`/`month` chọn ở chip
 * Kỳ trên toolbar nên không được tính — badge phải khớp đúng những gì người dùng thấy khi mở
 * dialog ra, nếu không họ mở ra rồi đếm không đủ.
 *
 * `has_debt` tính khi BẬT, nên badge mở màn đã là 1: nó đang thật sự cắt bớt dòng, người dùng
 * cần thấy ngay danh sách không phải toàn bộ dự án. Đếm lúc TẮT thì badge sẽ khoe "đang lọc"
 * đúng vào lúc báo cáo hiện nhiều nhất — ngược hẳn ý nghĩa.
 */
export function countActiveProjectReceivableFilters(params: URLSearchParams): number {
  const values = parseProjectReceivableFilters(params)
  return (values.project !== null ? 1 : 0) + (values.hasDebt ? 1 : 0)
}
