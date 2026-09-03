import { type DateRange } from 'react-day-picker'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { TransactionSheetApprovalStatus } from '@/constants/api-schema-aliases.ts'

export type TransactionSheetFilterFormData = {
  code?: string
  customer_name?: string
  status?: TransactionSheetApprovalStatus | null
  project?: number | null
  investor?: number | null
  has_f2?: 'true' | 'false' | null
  /** Khoảng ngày đặt cọc → `deposit_date_from` / `deposit_date_to` */
  dateRange?: DateRange | null
  /** Khoảng ngày tạo phiếu → `created_at_from` / `created_at_to` */
  createdDateRange?: DateRange | null
}

/** Filter form data kèm các key thô đọc thẳng từ URL (giữ nguyên hành vi cũ của trang). */
export type TransactionSheetFilterValues = TransactionSheetFilterFormData & Record<string, unknown>

/** Các key URL thuộc về phân trang/sắp xếp, không phải điều kiện lọc. */
const NON_FILTER_URL_KEYS = ['page', 'page_size', 'ordering']

/**
 * Mỗi khoảng ngày trên form ứng với đúng một cặp query param của API.
 * Danh sách này là nguồn duy nhất cho cả hai chiều URL ↔ form, nên thêm một
 * bộ lọc ngày mới chỉ cần khai báo thêm một dòng ở đây.
 */
export const TRANSACTION_SHEET_DATE_RANGE_FILTERS = [
  { formKey: 'dateRange', fromParam: 'deposit_date_from', toParam: 'deposit_date_to' },
  { formKey: 'createdDateRange', fromParam: 'created_at_from', toParam: 'created_at_to' },
] as const

const DATE_RANGE_FORM_KEYS: string[] = TRANSACTION_SHEET_DATE_RANGE_FILTERS.map((f) => f.formKey)

const DATE_RANGE_PARAM_KEYS: string[] = TRANSACTION_SHEET_DATE_RANGE_FILTERS.flatMap((f) => [
  f.fromParam,
  f.toParam,
])

/** Dựng giá trị khởi tạo cho form bộ lọc từ URL hiện tại. */
export const buildFilterValuesFromUrl = (
  searchParams: URLSearchParams
): TransactionSheetFilterValues => {
  const filterValues: Record<string, unknown> = {}

  Array.from(searchParams.entries()).forEach(([key, value]) => {
    if (!NON_FILTER_URL_KEYS.includes(key)) {
      filterValues[key] = value
    }
  })

  if (filterValues.project) filterValues.project = Number(filterValues.project)
  if (filterValues.investor) filterValues.investor = Number(filterValues.investor)

  TRANSACTION_SHEET_DATE_RANGE_FILTERS.forEach(({ formKey, fromParam, toParam }) => {
    const from = parseDateFromApi(searchParams.get(fromParam))
    const to = parseDateFromApi(searchParams.get(toParam))
    if (from || to) {
      filterValues[formKey] = { from, to } as DateRange
    }
  })

  return filterValues as TransactionSheetFilterValues
}

/**
 * Dựng URL params mới từ dữ liệu form bộ lọc.
 *
 * Các key ngày dạng server (`*_from` / `*_to`) bị loại khỏi vòng lặp chung và chỉ
 * được sinh lại từ đối tượng `DateRange` tương ứng. Nếu không loại, giá trị cũ lọt
 * vào form qua `initialValues` sẽ được ghi lại nguyên xi, khiến thao tác xoá khoảng
 * ngày (DateRangePicker trả về `undefined`) không xoá được param trên URL.
 */
export const buildUrlParamsFromFilterValues = (
  formData: TransactionSheetFilterValues,
  currentSearch?: string | null
): URLSearchParams => {
  const params = new URLSearchParams()

  if (currentSearch) {
    params.set('search', currentSearch)
  }

  Object.entries(formData).forEach(([key, value]) => {
    if (DATE_RANGE_FORM_KEYS.includes(key) || DATE_RANGE_PARAM_KEYS.includes(key)) return
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  })

  TRANSACTION_SHEET_DATE_RANGE_FILTERS.forEach(({ formKey, fromParam, toParam }) => {
    const range = formData[formKey] as DateRange | null | undefined
    if (range?.from) params.set(fromParam, formatDateToApi(range.from))
    if (range?.to) params.set(toParam, formatDateToApi(range.to))
  })

  params.set('page', '1')

  return params
}

/** Số bộ lọc đang thực sự bật — dùng cho badge trên nút Bộ lọc. */
export const countActiveFilters = (filters: TransactionSheetFilterValues): number => {
  let count = 0

  if (filters.code) count++
  if (filters.customer_name) count++
  if (filters.status) count++
  if (filters.project) count++
  if (filters.investor) count++
  if (filters.has_f2 !== undefined) count++

  TRANSACTION_SHEET_DATE_RANGE_FILTERS.forEach(({ formKey }) => {
    const range = filters[formKey] as DateRange | null | undefined
    if (range?.from || range?.to) count++
  })

  return count
}
