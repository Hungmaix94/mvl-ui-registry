import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'

/**
 * Bộ lọc dùng chung cho ba màn đối tác: Quản lý chủ đầu tư, Quản lý sàn liên kết (F2) và
 * Quản lý nguồn sàn (F0).
 *
 * Ba màn gọi ba endpoint khác nhau nhưng backend phơi **cùng một bộ tham số lọc**
 * (SRS 17.1 §5.1 / §5.2), nên phần đọc–ghi URL nằm ở đây thay vì chép ba lần.
 *
 * Tên tham số trên URL cố ý TRÙNG với deep-link của tile "sinh nhật đối tác" trên dashboard
 * (CR STT27 — 86eykqg66): `is_active` và `established_month`. Nhờ vậy click từ dashboard sang
 * là dialog lọc mở ra đã hiện sẵn đúng điều kiện đang áp — thay vì tồn tại hai cách viết URL
 * cho cùng một phép lọc rồi lệch nhau lúc nào không hay.
 *
 * `established_month` (1-12) và `established_day` (1-31) là tên trên URL cho người đọc; API nhận
 * `established_date__month` / `established_date__day`. Việc dịch tên nằm ở `buildApiParamsFromUrl`
 * của từng trang, không phải ở đây.
 *
 * KHÔNG có lọc theo NĂM, và đó là cố ý: ngày thành lập được dùng như ngày kỷ niệm lặp lại hằng
 * năm — giống bộ lọc "Tháng sinh nhật" của màn nhân sự. Ai cần khoảng ngày tuyệt đối thì đó là
 * một range filter khác, backend cũng chưa có.
 */
export type PartnerFilterFormValues = {
  /** Mảng vì đây là nhóm ô tick: tick cả hai — hoặc bỏ trống — đều nghĩa là không ràng buộc. */
  is_active?: string[]
  /**
   * `Date` chứ không phải số tháng, vì ô nhập là `MonthPicker` (`showYear={false}`) — cùng kiểu
   * với "Tháng sinh nhật" ở màn Nhân sự. Phần **năm** trong `Date` này là rác: `showYear={false}`
   * đóng cứng năm hiện tại, còn backend lọc theo tháng bất kể năm. Chỉ đọc `getMonth()`, đừng
   * bao giờ đọc `getFullYear()` của nó.
   */
  established_month?: Date
  /**
   * Ngày trong tháng, 1-31, dạng chuỗi vì đây là giá trị của `Select`.
   *
   * Bỏ trống KHÔNG đồng nghĩa "không lọc gì": nó nghĩa là **cả tháng**. Dialog phải nói rõ điều
   * đó bằng một dòng hint, nếu không người dùng tưởng mình quên chọn.
   */
  established_day?: string
}

export const PARTNER_ESTABLISHED_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => ({
  value: String(index + 1),
  label: String(index + 1),
}))

/** Nhãn bám đúng chữ đang hiện ở cột "Hoạt động" của bảng, đừng đặt tên khác. */
export const PARTNER_ACTIVE_OPTIONS = [
  { value: 'true', label: 'Đang hoạt động' },
  { value: 'false', label: 'Ngừng hoạt động' },
]

export function parsePartnerFiltersFromUrl(searchParams: URLSearchParams): PartnerFilterFormValues {
  const values: PartnerFilterFormValues = {}

  const isActive = searchParams.get('is_active')
  if (isActive === 'true' || isActive === 'false') {
    values.is_active = [isActive]
  }

  const month = parsePositiveInt(searchParams.get('established_month'))
  if (month && month <= 12) {
    // Constructor số (năm, chỉ-số-tháng, ngày) — không phải `new Date(chuỗi)` mà quy ước cấm.
    // Năm ở đây chỉ để dựng được một `Date` hợp lệ cho `MonthPicker`; nó không đi đâu cả.
    values.established_month = new Date(new Date().getFullYear(), month - 1, 1)
  }

  const day = parsePositiveInt(searchParams.get('established_day'))
  if (day && day <= 31) {
    values.established_day = String(day)
  }

  return values
}

/**
 * Số bộ lọc đang bật — hiện trên badge cạnh nút phễu.
 *
 * Tick CẢ HAI trạng thái không được tính là một bộ lọc: nó cho ra đúng tập kết quả như lúc bỏ
 * trống, nên đếm vào là badge nói dối rằng danh sách đang bị thu hẹp.
 */
export function countPartnerFilters(values: PartnerFilterFormValues): number {
  let count = 0
  if (values.is_active?.length === 1) count++
  if (values.established_month) count++
  if (values.established_day) count++
  return count
}

/**
 * Dựng lại toàn bộ query string từ giá trị form.
 *
 * Cố ý bắt đầu từ một `URLSearchParams` RỖNG chứ không sửa tại chỗ: bỏ tick một ô rồi Áp dụng
 * phải làm tham số đó biến mất khỏi URL. Nếu clone `baseParams` rồi chỉ `set` cái đang bật thì
 * điều kiện vừa gỡ vẫn nằm nguyên trên URL và người dùng thấy bộ lọc "gỡ không ra".
 * `search` / `ordering` / `page_size` không thuộc dialog nên được chép lại thủ công.
 */
export function serializePartnerFiltersToUrl(
  values: PartnerFilterFormValues,
  baseParams: URLSearchParams
): URLSearchParams {
  const newParams = new URLSearchParams()
  newParams.set('page', '1')

  const pageSizeFromUrl = parsePositiveInt(baseParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  newParams.set('page_size', String(safePageSize))

  const search = baseParams.get('search')
  if (search) newParams.set('search', search)

  const ordering = baseParams.get('ordering')
  if (ordering) newParams.set('ordering', ordering)

  if (values.is_active?.length === 1) {
    newParams.set('is_active', values.is_active[0])
  }

  if (values.established_month) {
    newParams.set('established_month', String(values.established_month.getMonth() + 1))
  }

  const day = parsePositiveInt(values.established_day ?? null)
  if (day && day <= 31) {
    newParams.set('established_day', String(day))
  }

  return newParams
}
