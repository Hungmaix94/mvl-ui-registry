import { parsePositiveInt } from '@/utils/common'
import { resolvePageSize } from '@/utils/table/pagination'
import type { DepartmentMonthlyKpiFilterValues } from '../schemas/department-monthly-kpi-schemas'
import {
  DepartmentCommissionPoolStatus as PoolStatus,
  DepartmentCommissionPoolSplitStatus as SplitStatus,
} from '@/constants/api-schema-aliases'

/** Các key do dialog Bộ lọc quản lý — dùng chung cho đếm badge và ghi lại lên URL. */
export const DEPT_MONTHLY_KPI_FILTER_KEYS = [
  'branch',
  'block',
  'department',
  'status',
  'split_status',
] as const

/**
 * URL là input user sửa được, nên chỉ chấp nhận mã có thật trong enum.
 *
 * `?status=rác` phải rơi về "không lọc" thay vì bắn thẳng xuống API — BE sẽ trả 400 và màn
 * hình chỉ hiện bảng rỗng, không ai đoán ra là do URL hỏng.
 */
export function parseEnumParam<T extends Record<string, string>>(
  enumObject: T,
  raw: string | null | undefined
): T[keyof T] | undefined {
  if (!raw) return undefined
  return Object.values(enumObject).includes(raw) ? (raw as T[keyof T]) : undefined
}

export type DepartmentMonthlyKpiApiParams = {
  page: number
  page_size: number
  year?: number
  month?: number
  branch?: number
  block?: number
  department?: number
  status?: PoolStatus
  split_status?: SplitStatus
}

export function buildDepartmentMonthlyKpiApiParams(
  searchParams: URLSearchParams
): DepartmentMonthlyKpiApiParams {
  return {
    page: parsePositiveInt(searchParams.get('page')) || 1,
    page_size: resolvePageSize(searchParams.get('page_size')),
    year: parsePositiveInt(searchParams.get('year')) || undefined,
    month: parsePositiveInt(searchParams.get('month')) || undefined,
    branch: parsePositiveInt(searchParams.get('branch')) || undefined,
    block: parsePositiveInt(searchParams.get('block')) || undefined,
    department: parsePositiveInt(searchParams.get('department')) || undefined,
    status: parseEnumParam(PoolStatus, searchParams.get('status')),
    split_status: parseEnumParam(SplitStatus, searchParams.get('split_status')),
  }
}

/** Giá trị seed cho form bộ lọc khi mở dialog. */
export function getDepartmentMonthlyKpiFilterValues(
  searchParams: URLSearchParams
): Partial<DepartmentMonthlyKpiFilterValues> {
  return {
    branch: parsePositiveInt(searchParams.get('branch')) || null,
    block: parsePositiveInt(searchParams.get('block')) || null,
    department: parsePositiveInt(searchParams.get('department')) || null,
    status: parseEnumParam(PoolStatus, searchParams.get('status')) ?? null,
    split_status: parseEnumParam(SplitStatus, searchParams.get('split_status')) ?? null,
  }
}

export function countDepartmentMonthlyKpiActiveFilters(searchParams: URLSearchParams): number {
  return DEPT_MONTHLY_KPI_FILTER_KEYS.filter((key) => searchParams.get(key)).length
}

/**
 * Ghi giá trị form bộ lọc lên URL, giữ nguyên các param ngoài phạm vi bộ lọc (kỳ, phân trang).
 * Luôn reset về trang 1 — tập kết quả đổi thì trang cũ có thể vượt tổng số trang mới.
 */
export function applyDepartmentMonthlyKpiFilterToParams(
  searchParams: URLSearchParams,
  formData: DepartmentMonthlyKpiFilterValues,
  pageSize: number
): URLSearchParams {
  const next = new URLSearchParams(searchParams)
  next.set('page', '1')
  next.set('page_size', String(pageSize))

  DEPT_MONTHLY_KPI_FILTER_KEYS.forEach((key) => {
    const value = formData[key]
    if (value) next.set(key, String(value))
    else next.delete(key)
  })

  return next
}
