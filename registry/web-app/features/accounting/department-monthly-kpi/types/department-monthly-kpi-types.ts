import { components } from '@/api/schema'

export type DepartmentMonthlyKpi = components['schemas']['DepartmentMonthlyKpi']

/**
 * Tổng trên TOÀN tập đã lọc, do BE trả cạnh `results`.
 *
 * Endpoint phân trang server-side nên cộng `results` chỉ ra tổng của MỘT trang — xem
 * `docs/ai/patterns.md`. Lấy từ đây, đừng bao giờ tự cộng lại ở FE.
 */
export type DepartmentMonthlyKpiSummary = NonNullable<
  components['schemas']['PaginatedDepartmentMonthlyKpiList']['summary']
>

export type GetDepartmentMonthlyKpisParams = {
  page?: number
  page_size?: number
  year?: number
  month?: number
  branch?: number
  block?: number
  department?: number
  /** true = phòng có doanh số trong kỳ, false = doanh số bằng 0 */
  has_revenue?: boolean
  /** true = đã qua một lần tính toán hoa hồng, false = chưa tính */
  is_computed?: boolean
  /** true = chỉ phòng có nhân viên. Bỏ trống = lấy cả phòng chưa có ai (mặc định của màn hình). */
  has_employees?: boolean
  /** true = chỉ phòng có giao dịch. Bỏ trống = lấy cả phòng chưa phát sinh giao dịch. */
  has_deals?: boolean
  /** Khoảng tỷ lệ hoàn thành (%). */
  completion_pct_min?: number
  completion_pct_max?: number
  /** Khoảng % và tiền hoa hồng Trưởng phòng (TPKD). */
  leader_pct_min?: number
  leader_pct_max?: number
  leader_amount_min?: number
  leader_amount_max?: number
  /** Khoảng % và tiền hoa hồng Giám đốc (GDKD). */
  director_pct_min?: number
  director_pct_max?: number
  director_amount_min?: number
  director_amount_max?: number
  /** Khoảng % và tiền hoa hồng Tổng giám đốc (CEO). */
  ceo_pct_min?: number
  ceo_pct_max?: number
  ceo_amount_min?: number
  ceo_amount_max?: number
  status?: string
  search?: string
}

export type EmployeeMonthlyKpi = components['schemas']['EmployeeMonthlyKpi']

export type GetEmployeeMonthlyKpisParams = {
  department_monthly_kpi?: number
  page?: number
  page_size?: number
  year?: number
  month?: number
  department?: number
  ordering?: string
}

export type DepartmentCommissionRow = components['schemas']['DepartmentCommissionRow']

export type GetDepartmentCommissionsParams = {
  year?: number
  month?: number
  department?: number
  source?: string
}
