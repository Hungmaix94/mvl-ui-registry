import { type DateRange } from 'react-day-picker'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { DepositContractApprovalStatus } from '@/constants/api-schema-aliases'

export type DepositContractFilterFormData = {
  search?: string
  /** Chọn nhiều trạng thái → URL `status__in=a,b`. Ô đơn trị cũ đã bỏ khỏi dialog. */
  status__in?: string[] | null
  /** Chọn nhiều trạng thái phê duyệt → URL `approval_status__in=a,b`. */
  approval_status__in?: (DepositContractApprovalStatus | string)[] | null
  project?: number | null
  investor?: number | null
  /** FK id của khách hàng — KHÔNG phải `customer_name`, xem ghi chú ở `STALE_URL_KEYS`. */
  customer?: number | string | null
  /**
   * Ba cấp tổ chức do `OrgCascadeField` quản, và cascade phát ra id dạng **chuỗi** —
   * giữ nguyên chuỗi thay vì ép về số để không phải đổi qua đổi lại ở ranh giới form ↔ URL.
   */
  branch?: string
  block?: string
  department?: string
  /** Khoảng ngày hợp đồng → `contract_date_from` / `contract_date_to` */
  contractDateRange?: DateRange | null
  /**
   * Ngày làm phiếu TTGD → `transaction_sheet_date_from` / `transaction_sheet_date_to`.
   * Bộ lọc ĐỘC LẬP với `contractDateRange`, cộng thêm (AND), không ghi đè.
   */
  transactionSheetDateRange?: DateRange | null
}

/**
 * Ô lọc nhiều giá trị: form giữ mảng, URL giữ chuỗi nối bằng dấu phẩy, API nhận lại mảng.
 *
 * `legacyParam` là tên tham số ĐƠN TRỊ mà BE vẫn còn nhận và link cũ vẫn còn dùng — dashboard
 * 18.7 bắn thẳng `?approval_status=pending_manager`. Đọc URL thì nhận cả hai dạng; ghi URL thì
 * chỉ ghi dạng `__in` và **xoá** dạng đơn trị, nếu không hai tham số cùng lọc một cột sẽ chồng
 * nhau và người dùng không tắt được cái vô hình.
 */
export const DEPOSIT_CONTRACT_MULTI_FILTERS = [
  { formKey: 'status__in', legacyParam: 'status' },
  { formKey: 'approval_status__in', legacyParam: 'approval_status' },
] as const

/** Filter form data kèm các key thô đọc thẳng từ URL (deep-link `pending` / `awaiting_me`). */
export type DepositContractFilterValues = DepositContractFilterFormData & Record<string, unknown>

/**
 * Mỗi khoảng ngày trên form ứng với đúng một cặp query param của API.
 * Danh sách này là nguồn duy nhất cho cả hai chiều URL ↔ form, nên thêm một
 * bộ lọc ngày mới chỉ cần khai báo thêm một dòng ở đây.
 */
export const DEPOSIT_CONTRACT_DATE_RANGE_FILTERS = [
  { formKey: 'contractDateRange', fromParam: 'contract_date_from', toParam: 'contract_date_to' },
  {
    formKey: 'transactionSheetDateRange',
    fromParam: 'transaction_sheet_date_from',
    toParam: 'transaction_sheet_date_to',
  },
] as const

const DATE_RANGE_FORM_KEYS: string[] = DEPOSIT_CONTRACT_DATE_RANGE_FILTERS.map((f) => f.formKey)

const DATE_RANGE_PARAM_KEYS: string[] = DEPOSIT_CONTRACT_DATE_RANGE_FILTERS.flatMap((f) => [
  f.fromParam,
  f.toParam,
])

const isDateRangeKey = (key: string): boolean =>
  DATE_RANGE_FORM_KEYS.includes(key) || DATE_RANGE_PARAM_KEYS.includes(key)

const MULTI_FORM_KEYS: string[] = DEPOSIT_CONTRACT_MULTI_FILTERS.map((f) => f.formKey)

const MULTI_LEGACY_KEYS: string[] = DEPOSIT_CONTRACT_MULTI_FILTERS.map((f) => f.legacyParam)

const isMultiKey = (key: string): boolean =>
  MULTI_FORM_KEYS.includes(key) || MULTI_LEGACY_KEYS.includes(key)

/**
 * Ba cấp tổ chức: form và URL giữ id dạng **chuỗi** (hợp đồng của `OrgCascadeField`), còn API
 * khai `branch/block/department` là **số**. Đổi lại đúng một chỗ ngay trước khi gọi API thay vì
 * để kiểu lệch trôi qua một phép ép `as`.
 */
const ORG_FORM_KEYS = ['branch', 'block', 'department'] as const

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

/**
 * Param từng có ô riêng trong dialog lọc, nay đã bỏ. URL/bookmark cũ còn mang chúng thì
 * **không** được gửi lên API nữa — nếu gửi, danh sách bị lọc ngầm bởi một điều kiện mà
 * dialog không còn ô nào hiển thị, và người dùng không có cách nào tắt nó.
 *
 * - `contract_number` (bỏ 17/08/2026): ô Tìm kiếm ngoài đã phủ sẵn giá trị này. Lý do thứ hai
 *   lúc đó — "số phiếu không hiện ở cột nào trong bảng nên không đối chiếu được" — **đã hết hiệu
 *   lực từ 20/08/2026** (CR 86eypf4gk thêm cột "Mã phiếu đặt cọc" vào bảng danh sách). Vẫn giữ
 *   trong danh sách này vì lý do thứ nhất còn nguyên: ô Tìm kiếm khớp `contract_number` đúng 1:1
 *   (đo trên dev: `search=2026-940102` → 1 bản ghi, `contract_number=2026-940102` → 1), nên thêm
 *   lại ô lọc riêng chỉ là nhân đôi một đường đã có.
 * - `customer_name` (bỏ 17/08/2026): đo trên dev cho kết quả **trùng khít** ô Tìm kiếm
 *   (`search=Thiên Minh` → 7 bản ghi, `customer_name=Thiên Minh` → 7). Thay bằng `customer`
 *   (FK id) để chọn đúng một khách hàng thay vì so khớp chuỗi.
 */
export const STALE_URL_KEYS = ['contract_number', 'customer_name'] as const

/** Số nguyên dương từ URL, hoặc `null`. Chặn `?project=abc` biến thành `NaN` rồi bay lên API. */
const parseIdParam = (raw: string | null): number | null => {
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * Như trên nhưng giữ dạng chuỗi, cho ba cấp tổ chức mà `OrgCascadeField` đang dùng.
 * Trả `undefined` (không phải `null`) để khớp đúng `OrgCascadeValues` của cascade.
 */
const parseIdParamAsString = (raw: string | null): string | undefined =>
  parseIdParam(raw) === null ? undefined : (raw as string)

/** Dựng giá trị khởi tạo cho form bộ lọc từ URL hiện tại. */
export const buildFilterValuesFromUrl = (
  searchParams: URLSearchParams
): DepositContractFilterValues => {
  const filterValues: Record<string, unknown> = {
    search: searchParams.get('search') || '',
    // Deep-link from the admin dashboard queue cards: `pending` = every stage
    // (the card's denominator), `awaiting_me` = only the stage the signed-in
    // user may approve (the numerator).
    pending: searchParams.get('pending') === 'true' ? true : null,
    awaiting_me: searchParams.get('awaiting_me') === 'true' ? true : null,
    project: parseIdParam(searchParams.get('project')),
    investor: parseIdParam(searchParams.get('investor')),
    customer: parseIdParam(searchParams.get('customer')),
    branch: parseIdParamAsString(searchParams.get('branch')),
    block: parseIdParamAsString(searchParams.get('block')),
    department: parseIdParamAsString(searchParams.get('department')),
  }

  DEPOSIT_CONTRACT_MULTI_FILTERS.forEach(({ formKey, legacyParam }) => {
    // Dạng `__in` thắng khi có cả hai; thiếu nó thì nhận link cũ một giá trị.
    const fromMulti = parseMultiParam(searchParams.get(formKey))
    const legacy = parseMultiParam(searchParams.get(legacyParam))
    filterValues[formKey] = fromMulti.length ? fromMulti : legacy
  })

  DEPOSIT_CONTRACT_DATE_RANGE_FILTERS.forEach(({ formKey, fromParam, toParam }) => {
    const from = parseDateFromApi(searchParams.get(fromParam))
    const to = parseDateFromApi(searchParams.get(toParam))
    filterValues[formKey] = from || to ? ({ from, to } as DateRange) : null
  })

  return filterValues as DepositContractFilterValues
}

/**
 * Dựng query params gửi lên API từ tập bộ lọc hiện tại.
 *
 * `contractDateRange` là khái niệm của form, API không hiểu — nên nó bị loại khỏi vòng lặp
 * chung và được dịch lại thành cặp `contract_date_from` / `contract_date_to`.
 */
export const buildApiParams = (filters: DepositContractFilterValues): Record<string, unknown> => {
  const params: Record<string, unknown> = {}

  Object.entries(filters).forEach(([key, value]) => {
    if (isDateRangeKey(key) || isMultiKey(key)) return
    if (value === null || value === undefined || value === '') return
    params[key] = (ORG_FORM_KEYS as readonly string[]).includes(key) ? Number(value) : value
  })

  DEPOSIT_CONTRACT_MULTI_FILTERS.forEach(({ formKey }) => {
    // Gửi MẢNG lên API (openapi-fetch tự nối theo `style: form, explode: false` của schema),
    // và bỏ hẳn khi rỗng — `?status__in=` rỗng là thừa, không phải điều kiện lọc.
    const picked = filters[formKey] as string[] | null | undefined
    if (picked?.length) params[formKey] = picked
  })

  DEPOSIT_CONTRACT_DATE_RANGE_FILTERS.forEach(({ formKey, fromParam, toParam }) => {
    const range = filters[formKey] as DateRange | null | undefined
    if (range?.from) params[fromParam] = formatDateToApi(range.from)
    if (range?.to) params[toParam] = formatDateToApi(range.to)
  })

  return params
}

/**
 * Ghi tập bộ lọc vừa chọn lên URL params.
 *
 * Bug đã gặp thật (xem `docs/ai/conventions.md` mục "Filter khoảng ngày"): `initialValues`
 * dựng từ URL nên form ôm luôn key thô `*_from` / `*_to`; vòng lặp chung `set()` lại chúng
 * và thao tác **xoá** khoảng ngày không xoá được param. Ca chọn-khoảng-mới luôn xanh kể cả
 * khi code sai, chỉ ca xoá mới lộ.
 *
 * Thứ **thực sự** chặn bug ở đây là khối `DEPOSIT_CONTRACT_DATE_RANGE_FILTERS` bên dưới:
 * nó set-hoặc-**xoá** cả hai param theo `DateRange`, nên chạy sau là dọn sạch mọi giá trị cũ.
 * `isDateRangeKey` trong vòng lặp chung chỉ là lớp phòng thủ để ý đồ hiện rõ và để việc đảo
 * thứ tự hai khối sau này không âm thầm dựng lại bug — đo bằng break-test 17/08/2026: gỡ
 * riêng guard này thì test vẫn xanh, gỡ nhánh `delete` bên dưới thì 2 test đỏ ngay.
 */
export const applyFilterValuesToParams = (
  previousParams: URLSearchParams,
  formData: DepositContractFilterValues
): URLSearchParams => {
  const params = new URLSearchParams(previousParams)

  Object.entries(formData).forEach(([key, value]) => {
    if (isDateRangeKey(key) || isMultiKey(key)) return
    // ⚠️ Điều kiện là TRUTHY, nên `false` và `0` bị coi là "rỗng" và xoá khỏi URL. Hiện không
    // field nào của dialog này nhận hai giá trị đó nên vẫn đúng. Nhưng khi thêm ô tick
    // (`Checkbox`/`Switch`) thì phải sửa chỗ này trước: `conventions.md` bắt ghi tường minh cả
    // `true` LẪN `false` lên URL, mà nhánh này sẽ nuốt mất `false` và ô tick hoá ra không tắt được.
    if (value) {
      params.set(key, String(value))
    } else {
      params.delete(key)
    }
  })

  DEPOSIT_CONTRACT_MULTI_FILTERS.forEach(({ formKey, legacyParam }) => {
    const picked = formData[formKey] as string[] | null | undefined
    if (picked?.length) params.set(formKey, picked.join(','))
    else params.delete(formKey)
    // Luôn dọn dạng đơn trị: giữ lại là hai tham số cùng lọc một cột, mà dialog chỉ tắt được một.
    params.delete(legacyParam)
  })

  DEPOSIT_CONTRACT_DATE_RANGE_FILTERS.forEach(({ formKey, fromParam, toParam }) => {
    const range = formData[formKey] as DateRange | null | undefined

    if (range?.from) params.set(fromParam, formatDateToApi(range.from))
    else params.delete(fromParam)

    if (range?.to) params.set(toParam, formatDateToApi(range.to))
    else params.delete(toParam)
  })

  STALE_URL_KEYS.forEach((key) => params.delete(key))

  params.set('page', '1')

  return params
}

/**
 * Số bộ lọc đang thực sự bật — dùng cho badge trên nút "Bộ lọc".
 *
 * `search` không tính (đã có ô tìm kiếm riêng ngoài toolbar), `pending` / `awaiting_me` cũng
 * không tính vì chúng đến từ deep-link của dashboard chứ không phải ô nào trong dialog.
 * Một khoảng ngày tính **một** bộ lọc, đúng bằng số ô người dùng nhìn thấy trên dialog.
 * Một ô chọn-nhiều cũng tính **một**, dù đang tick 5 trạng thái — badge đếm số Ô đang bật,
 * không đếm số giá trị; đếm theo giá trị thì badge nhảy lên 5 trong khi dialog chỉ có 1 ô sáng.
 */
export const countActiveFilters = (filters: DepositContractFilterValues): number => {
  let count = 0

  if (filters.project) count++
  if (filters.investor) count++
  if (filters.customer) count++
  if (filters.branch) count++
  if (filters.block) count++
  if (filters.department) count++

  DEPOSIT_CONTRACT_MULTI_FILTERS.forEach(({ formKey }) => {
    const picked = filters[formKey] as string[] | null | undefined
    if (picked?.length) count++
  })

  DEPOSIT_CONTRACT_DATE_RANGE_FILTERS.forEach(({ formKey }) => {
    const range = filters[formKey] as DateRange | null | undefined
    if (range?.from || range?.to) count++
  })

  return count
}
