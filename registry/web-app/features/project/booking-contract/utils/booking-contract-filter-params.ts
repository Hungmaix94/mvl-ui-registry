import type { BookingContractFilterFormData } from '../components/BookingContractFilterForm'

/**
 * Các ô ĐƠN TRỊ của dialog "Bộ lọc" màn Hợp đồng đặt chỗ → tên tham số trên URL.
 *
 * Một nguồn sự thật duy nhất, và đó chính là điểm của file này. Trước 86eyqj0hf, `handleApplyFilter`
 * liệt kê tay từng `newParams.set(...)`; hai ô thêm sau (`customer_name` từ 13/05/2026 và
 * `contract_number`) không ai nối dây nên **rơi im lặng** — gõ tên khách rồi bấm Áp dụng thì URL
 * không có gì thay đổi và bảng trả về y nguyên danh sách cũ.
 *
 * Kiểu rơi này không có triệu chứng nào ngoài "bộ lọc không ăn": không lỗi, không cảnh báo, và
 * `yarn type-check` cũng im vì form khai đủ field. Thêm ô mới thì thêm đúng một dòng vào đây.
 *
 * `search` nằm trong danh sách nhưng **không có ô nào trong dialog** — xem chú thích ở
 * `BookingContractFilterForm`. Giữ nó ở đây để "Xoá bộ lọc" xoá luôn ô tìm kiếm ngoài toolbar.
 */
export const BOOKING_CONTRACT_FILTER_KEYS = [
  'search',
  'project',
  'investor',
  'customer',
  'booking_date_from',
  'booking_date_to',
] as const

/**
 * Param từng có ô riêng trong dialog lọc, nay đã bỏ (24/08/2026, học theo màn Hợp đồng cọc).
 *
 * URL/bookmark cũ còn mang chúng thì **không** được gửi lên API nữa — nếu gửi, danh sách bị lọc
 * ngầm bởi một điều kiện mà dialog không còn ô nào hiển thị, và người dùng không có cách nào tắt nó.
 *
 * - `customer_name`: thay bằng `customer` (id) để chọn **đúng một** khách thay vì so khớp chuỗi.
 *   Muốn gõ tên thì dùng ô tìm kiếm ngoài toolbar — `search_fields` của BE đã phủ đủ mọi nguồn tên,
 *   kể cả tên doanh nghiệp (BE PR #3369).
 * - `contract_number`: ô tìm kiếm ngoài đã khớp trường này 1:1 (`search_fields` có
 *   `contract_number`), nên giữ một ô riêng chỉ là nhân đôi đường đã có.
 */
export const STALE_URL_KEYS = ['customer_name', 'contract_number'] as const

/**
 * Ô lọc nhận NHIỀU giá trị: form giữ mảng, URL/API giữ chuỗi `a,b`.
 *
 * `legacyParam` là tham số ĐƠN TRỊ mà BE vẫn nhận và link/bookmark cũ vẫn dùng. Đọc thì nhận cả
 * hai (dạng `__in` thắng), ghi thì luôn **xoá** dạng đơn trị — giữ lại là hai tham số cùng lọc một
 * cột trong khi dialog chỉ tắt được một.
 */
export const BOOKING_CONTRACT_MULTI_FILTERS = [
  { formKey: 'booking_status__in', legacyParam: 'booking_status' },
  { formKey: 'approval_status__in', legacyParam: 'approval_status' },
] as const

/** Filter form data kèm các key thô đọc thẳng từ URL (deep-link `awaiting_me` của dashboard). */
export type BookingContractFilterValues = BookingContractFilterFormData & Record<string, unknown>

type CoveredFilterKey =
  | (typeof BOOKING_CONTRACT_FILTER_KEYS)[number]
  | (typeof BOOKING_CONTRACT_MULTI_FILTERS)[number]['formKey']

/**
 * Chặn đúng bug gốc ở tầng KIỂU: thêm ô vào `BookingContractFilterFormData` mà quên khai vào
 * `BOOKING_CONTRACT_FILTER_KEYS` (hoặc `BOOKING_CONTRACT_MULTI_FILTERS`) thì **`yarn type-check`
 * đỏ ngay**, kèm tên ô còn thiếu.
 *
 * Vì sao cần: `satisfies` chỉ bảo đảm mọi key đã khai là **hợp lệ**, không bảo đảm **đủ**. Và test
 * cũng duyệt chính các hằng này, nên nó không thể tự phát hiện ô bị bỏ quên — hai vế cùng một
 * nguồn thì phép so không chứng minh được gì. Đây là vế duy nhất bắt được lần rơi tiếp theo.
 */
type UnregisteredFilterKey = Exclude<keyof BookingContractFilterFormData, CoveredFilterKey>
const _allFilterKeysAreRegistered: UnregisteredFilterKey extends never
  ? true
  : ['Ô lọc chưa khai trong BOOKING_CONTRACT_FILTER_KEYS:', UnregisteredFilterKey] = true
void _allFilterKeysAreRegistered

/** Rỗng theo nghĩa "người dùng không nhập gì" — `0`/`false` không phải giá trị hợp lệ của ô nào ở đây. */
const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '')

/** Chuỗi `a,b` trên URL → mảng, đã bỏ phần tử rỗng (dấu phẩy thừa) và trùng lặp. */
const parseMultiParam = (raw: string | null): string[] =>
  raw
    ? [
        ...new Set(
          raw
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        ),
      ]
    : []

/** Số nguyên dương từ URL, hoặc `undefined`. Chặn `?project=abc` biến thành `NaN` rồi bay lên API. */
const parseIdParam = (raw: string | null): number | undefined => {
  if (!raw) return undefined
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

/** Dựng giá trị khởi tạo cho form bộ lọc từ URL hiện tại. */
export const buildBookingContractFilterValuesFromUrl = (
  searchParams: URLSearchParams
): BookingContractFilterValues => {
  const values: Record<string, unknown> = {
    search: searchParams.get('search') || '',
    project: parseIdParam(searchParams.get('project')),
    investor: parseIdParam(searchParams.get('investor')),
    customer: parseIdParam(searchParams.get('customer')),
    booking_date_from: searchParams.get('booking_date_from') || undefined,
    booking_date_to: searchParams.get('booking_date_to') || undefined,
  }

  // Deep-link từ thẻ hàng đợi trên dashboard admin — chỉ bậc duyệt mà người đăng nhập được xử lý.
  const awaitingMe = searchParams.get('awaiting_me')
  if (awaitingMe === 'true' || awaitingMe === 'false') values.awaiting_me = awaitingMe === 'true'

  BOOKING_CONTRACT_MULTI_FILTERS.forEach(({ formKey, legacyParam }) => {
    // Dạng `__in` thắng khi có cả hai; thiếu nó thì nhận link cũ một giá trị.
    const fromMulti = parseMultiParam(searchParams.get(formKey))
    const legacy = parseMultiParam(searchParams.get(legacyParam))
    values[formKey] = fromMulti.length ? fromMulti : legacy
  })

  return values as BookingContractFilterValues
}

/**
 * Dựng query params gửi lên API.
 *
 * Mảng phải nối lại thành `a,b`: `BaseInFilter` của django-filter đọc chuỗi ngăn bởi dấu phẩy, còn
 * để nguyên mảng thì client serialize thành tham số lặp (`booking_status__in=a&booking_status__in=b`)
 * và BE chỉ nhận giá trị cuối.
 */
export const buildBookingContractApiParams = (
  filters: BookingContractFilterValues
): Record<string, unknown> => {
  const params: Record<string, unknown> = {}

  Object.entries(filters).forEach(([key, value]) => {
    if (BOOKING_CONTRACT_MULTI_FILTERS.some((f) => f.formKey === key)) return
    if (isEmpty(value)) return
    params[key] = value
  })

  BOOKING_CONTRACT_MULTI_FILTERS.forEach(({ formKey, legacyParam }) => {
    const picked = filters[formKey] as string[] | undefined
    if (picked?.length) params[formKey] = picked.join(',')
    // Dạng đơn trị đã được gộp vào mảng lúc đọc URL; gửi kèm là lọc hai lần cùng một cột.
    delete params[legacyParam]
  })

  // Link cũ còn mang ô đã bỏ thì KHÔNG gửi lên API — xem `STALE_URL_KEYS`.
  STALE_URL_KEYS.forEach((key) => delete params[key])

  return params
}

/**
 * Ghi tập bộ lọc vừa chọn lên URL params.
 *
 * Cố ý dựng `URLSearchParams` RỖNG chứ không kế thừa params cũ: đó là hành vi sẵn có của màn này
 * (bấm Áp dụng là bỏ luôn deep-link `awaiting_me` và `page_size` đang đặt). Giữ nguyên để bản sửa
 * chỉ chữa đúng chỗ rơi tham số, không kéo theo thay đổi hành vi nào khác.
 */
export const buildBookingContractFilterParams = (
  formData: BookingContractFilterFormData
): URLSearchParams => {
  const params = new URLSearchParams()
  params.set('page', '1')

  BOOKING_CONTRACT_FILTER_KEYS.forEach((key) => {
    const value = formData[key]
    if (isEmpty(value)) return
    params.set(key, String(value))
  })

  BOOKING_CONTRACT_MULTI_FILTERS.forEach(({ formKey, legacyParam }) => {
    const picked = formData[formKey]
    if (picked?.length) params.set(formKey, picked.join(','))
    else params.delete(formKey)
    // Luôn dọn dạng đơn trị: giữ lại là hai tham số cùng lọc một cột, mà dialog chỉ tắt được một.
    params.delete(legacyParam)
  })

  // Ô đã bỏ khỏi dialog: dọn khỏi URL luôn, không để link cũ lọc ngầm.
  STALE_URL_KEYS.forEach((key) => params.delete(key))

  return params
}

/**
 * Số bộ lọc đang thực sự bật — dùng cho badge trên nút "Bộ lọc".
 *
 * `search` không tính (đã có ô tìm kiếm riêng ngoài toolbar); `awaiting_me` cũng không tính vì nó
 * đến từ deep-link của dashboard chứ không phải ô nào trong dialog. Một khoảng ngày tính **một** bộ
 * lọc, và một nhóm ô tick cũng tính **một** dù đang tick 5 trạng thái — badge đếm số Ô đang bật,
 * không đếm số giá trị.
 */
export const countActiveBookingContractFilters = (
  filters: Partial<BookingContractFilterValues>
): number => {
  let count = 0

  if (!isEmpty(filters.project)) count++
  if (!isEmpty(filters.investor)) count++
  if (!isEmpty(filters.customer)) count++
  if (!isEmpty(filters.booking_date_from) || !isEmpty(filters.booking_date_to)) count++

  BOOKING_CONTRACT_MULTI_FILTERS.forEach(({ formKey }) => {
    if ((filters[formKey] as string[] | undefined)?.length) count++
  })

  return count
}
