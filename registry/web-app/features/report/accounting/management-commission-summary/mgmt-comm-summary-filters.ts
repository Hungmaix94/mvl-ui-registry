import { parsePositiveInt } from '@/utils/common'
import { MonthlySummaryStatus } from '@/constants/api-schema-aliases'
import type { GetCommPayrollsParams } from '@/features/accounting/comm-payroll/services/comm-payroll-service'

/**
 * Bộ lọc trong dialog của màn "20.14 HHQL bảng Tổng"
 * (`/accounting/report/management-commission-summary`), CR ClickUp 86eyqgf5k.
 *
 * Giá trị giữ dạng CHUỖI vì đó là thứ `OrgCascadeField` phát ra và cũng là thứ nằm trên URL —
 * quy đổi sang số đúng một lần, ở :func:`buildMgmtCommSummaryApiParams`, để chỉ có một chỗ
 * phải sửa nếu BE đổi kiểu.
 *
 * `year`/`month` KHÔNG có ở đây: chúng là trục bắt buộc chọn ở `AccountingPeriodSelect` trên
 * toolbar, không phải bộ lọc tuỳ chọn — nên cũng không được tính vào badge.
 */
export type MgmtCommSummaryFilterFormData = {
  branch?: string
  block?: string
  department?: string
  position?: string
  /**
   * Trạng thái là bộ lọc NHIỀU giá trị — nhóm ô tick, không phải Select một giá trị.
   *
   * Số lựa chọn ít và cố định (4 trạng thái) nên bày sẵn hết ra màn: người dùng thấy ngay còn
   * gì chưa tick mà không phải mở popover ra dò (`docs/ai/conventions.md`, chốt 2026-08-18).
   * BE nhận qua `status__in` (danh sách ngăn bởi dấu phẩy).
   */
  status__in?: string[]
}

/**
 * Mọi tham số lọc dialog này sở hữu, khai MỘT lần.
 *
 * Ghi URL, đếm badge và dựng tham số API đều đọc danh sách này, nên không thể có chuyện một bộ
 * lọc được-áp-nhưng-không-đếm (hoặc đếm-mà-không-gửi).
 */
export const MGMT_COMM_SUMMARY_FILTER_PARAMS = [
  'branch',
  'block',
  'department',
  'position',
  'status__in',
] as const satisfies readonly (keyof MgmtCommSummaryFilterFormData)[]

/**
 * Giá trị "rỗng" của form — phải liệt kê ĐỦ mọi field.
 *
 * `reset()` của RHF chỉ ghi đè key có mặt ở đây; key thiếu giữ nguyên giá trị cũ và "Xoá bộ
 * lọc" hoá ra xoá không hết.
 */
export const MGMT_COMM_SUMMARY_EMPTY_FILTERS: MgmtCommSummaryFilterFormData = {
  branch: undefined,
  block: undefined,
  department: undefined,
  position: undefined,
  status__in: [],
}

/**
 * Tên param của ô tìm kiếm trên URL.
 *
 * Cố ý KHÁC tên tham số API (`search`): URL dùng `q` cho khớp màn "HH theo tháng — Quản lý" mà
 * CR yêu cầu làm tương tự, còn BE nhận `search`. Quy đổi nằm ở
 * :func:`buildMgmtCommSummaryApiParams`.
 */
export const MGMT_COMM_SUMMARY_SEARCH_PARAM = 'q'

/** Đọc bộ lọc từ URL để seed lại dialog khi mở. */
export function parseMgmtCommSummaryFilters(
  params: URLSearchParams
): MgmtCommSummaryFilterFormData {
  const read = (key: string) => params.get(key) || undefined
  const statuses = params.get('status__in')
  return {
    branch: read('branch'),
    block: read('block'),
    department: read('department'),
    position: read('position'),
    // Giữ THỨ TỰ theo `options` chứ không theo thứ tự người bấm — xem `buildMgmtCommSummaryFilterParams`.
    status__in: statuses ? statuses.split(',').filter(Boolean) : [],
  }
}

/**
 * Ghi lựa chọn của dialog lên URL và luôn quay về trang 1.
 *
 * Field bị bỏ trống phải **xoá param**, không ghi chuỗi rỗng: cascade reset cấp con khi cấp cha
 * đổi, và một `department=` còn sót lại sẽ tiếp tục lọc danh sách về rỗng trong khi dialog hiện
 * ô đó trắng trơn.
 *
 * Reset trang là bắt buộc: lọc còn 1 dòng trong lúc đang đứng ở trang 3 sẽ ra bảng trắng.
 */
export function buildMgmtCommSummaryFilterParams(
  current: URLSearchParams,
  values: MgmtCommSummaryFilterFormData
): URLSearchParams {
  const next = new URLSearchParams(current)

  MGMT_COMM_SUMMARY_FILTER_PARAMS.forEach((key) => {
    const value = values[key]
    // Mảng rỗng cũng là "không lọc" — `String([])` ra chuỗi rỗng, ghi lên URL thành
    // `status__in=` và BE sẽ lọc theo một danh sách rỗng ⇒ bảng trắng mà dialog không tick ô nào.
    const isEmpty =
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && !value.length)
    if (isEmpty) next.delete(key)
    else next.set(key, Array.isArray(value) ? value.join(',') : String(value))
  })

  next.set('page', '1')
  return next
}

/** Ghi từ khoá tìm kiếm lên URL, cũng quay về trang 1. */
export function buildMgmtCommSummarySearchParams(
  current: URLSearchParams,
  keyword: string
): URLSearchParams {
  const next = new URLSearchParams(current)
  if (keyword) next.set(MGMT_COMM_SUMMARY_SEARCH_PARAM, keyword)
  else next.delete(MGMT_COMM_SUMMARY_SEARCH_PARAM)
  next.set('page', '1')
  return next
}

/**
 * Số bộ lọc đang bật, cho badge cạnh nút "Bộ lọc".
 *
 * Đếm theo Ô TRONG DIALOG, nên **không** tính kỳ (`year`/`month`, chọn ở toolbar) và **không**
 * tính ô tìm kiếm (`q`, có ô riêng nhìn thấy được). Badge phải khớp đúng thứ người dùng thấy
 * khi mở dialog ra, nếu không họ mở ra rồi đếm không đủ.
 */
export function countMgmtCommSummaryFilters(params: URLSearchParams): number {
  return MGMT_COMM_SUMMARY_FILTER_PARAMS.filter((key) => !!params.get(key)).length
}

/**
 * URL → tham số gửi `GET /api/accounting/comm-payroll/{role}/`.
 *
 * Kiểu trả về ghim vào chính `GetCommPayrollsParams` sinh từ OpenAPI, nên nếu BE đổi tên một
 * tham số thì `yarn type-check` đỏ ngay tại đây thay vì để bộ lọc âm thầm mất tác dụng — đúng
 * hiện trạng trước CR này, khi FE gửi gì BE cũng nhận 200 rồi bỏ qua.
 *
 * Giá trị không phải id dương bị bỏ hẳn: `?department=abc` thả qua `Number()` sẽ thành `NaN`
 * rồi đi vào query string là `department=NaN`, và BE trả 400 cho cả trang.
 */
export function buildMgmtCommSummaryApiParams(
  params: URLSearchParams
): Pick<
  GetCommPayrollsParams,
  'branch' | 'block' | 'department' | 'position' | 'status__in' | 'search'
> {
  const keyword = params.get(MGMT_COMM_SUMMARY_SEARCH_PARAM)
  // Chỉ gửi giá trị NẰM TRONG enum của BE. `?status__in=DRAFT,bogus` gửi thẳng lên sẽ ăn 400 và
  // cả bảng trắng — trong khi thứ sai chỉ là một chữ trên thanh địa chỉ.
  const statuses = (params.get('status__in') ?? '').split(',').filter(isMonthlySummaryStatus)

  return {
    branch: parsePositiveInt(params.get('branch')) ?? undefined,
    block: parsePositiveInt(params.get('block')) ?? undefined,
    department: parsePositiveInt(params.get('department')) ?? undefined,
    position: parsePositiveInt(params.get('position')) ?? undefined,
    status__in: statuses.length ? statuses : undefined,
    search: keyword || undefined,
  }
}

function isMonthlySummaryStatus(value: string): value is MonthlySummaryStatus {
  return !!value && (Object.values(MonthlySummaryStatus) as string[]).includes(value)
}
