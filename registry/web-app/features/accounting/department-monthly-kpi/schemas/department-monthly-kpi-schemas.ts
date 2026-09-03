import { z } from 'zod'

/**
 * A numeric bound typed into a range filter.
 *
 * Text fields hand back strings while `CurrencyInput` hands back numbers, and an emptied field
 * lands as `''`/`undefined`; the page normalises all of that at the URL boundary
 * (`parseRangeBound`) rather than forcing one shape on the inputs.
 */
const rangeBound = z.union([z.string(), z.number()]).nullable().optional()

/**
 * Schema dùng chung cho hai màn khác nhau, nên là hợp của cả hai bộ field:
 * - "Hoa hồng quản lý khối back" (pool) dùng `status` + `split_status`
 * - "Hoa hồng theo doanh thu" (`CommissionByRevenuePage`) dùng `has_revenue` + `is_computed`,
 *   hai cờ dọn danh sách và 7 khoảng lọc bên dưới.
 * Mỗi màn bật phần của mình qua prop `showStatus` / `showKpiFlags` của filter.
 */
export const departmentMonthlyKpiFilterSchema = z.object({
  branch: z.number().nullable().optional(),
  block: z.number().nullable().optional(),
  department: z.number().nullable().optional(),
  // Duyệt và chia là hai vòng đời tách rời của cùng một pool (một pool đã duyệt vẫn có thể
  // chưa chia), nên là hai bộ lọc độc lập — khớp đúng hai query param `status` /
  // `split_status` mà API vốn đã nhận.
  status: z.string().nullable().optional(),
  split_status: z.string().nullable().optional(),
  // Cờ boolean đi qua Select nên giữ dạng chuỗi 'true' / 'false'; page tự đổi sang
  // boolean khi dựng query param.
  has_revenue: z.string().nullable().optional(),
  is_computed: z.string().nullable().optional(),

  // Hai tuỳ chọn dọn danh sách. Đều là opt-in: không tích thì danh sách vẫn đủ mọi phòng,
  // giữ nguyên con số đối chiếu kế toán vẫn quen.
  only_departments_with_employees: z.boolean().nullable().optional(),
  only_departments_with_deals: z.boolean().nullable().optional(),

  completion_pct_min: rangeBound,
  completion_pct_max: rangeBound,
  leader_pct_min: rangeBound,
  leader_pct_max: rangeBound,
  leader_amount_min: rangeBound,
  leader_amount_max: rangeBound,
  director_pct_min: rangeBound,
  director_pct_max: rangeBound,
  director_amount_min: rangeBound,
  director_amount_max: rangeBound,
  ceo_pct_min: rangeBound,
  ceo_pct_max: rangeBound,
  ceo_amount_min: rangeBound,
  ceo_amount_max: rangeBound,
})

export type DepartmentMonthlyKpiFilterValues = z.infer<typeof departmentMonthlyKpiFilterSchema>

/** Range filter keys, in the order the dialog and the URL both use them. */
export const DEPARTMENT_MONTHLY_KPI_RANGE_KEYS = [
  'completion_pct_min',
  'completion_pct_max',
  'leader_pct_min',
  'leader_pct_max',
  'leader_amount_min',
  'leader_amount_max',
  'director_pct_min',
  'director_pct_max',
  'director_amount_min',
  'director_amount_max',
  'ceo_pct_min',
  'ceo_pct_max',
  'ceo_amount_min',
  'ceo_amount_max',
] as const

export type DepartmentMonthlyKpiRangeKey = (typeof DEPARTMENT_MONTHLY_KPI_RANGE_KEYS)[number]
