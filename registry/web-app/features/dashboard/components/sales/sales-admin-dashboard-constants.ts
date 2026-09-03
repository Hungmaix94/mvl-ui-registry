import { DashboardPerformanceGroup as TimeGroup } from '@/constants/api-schema-aliases'

/**
 * Ability mapping for the sales admin dashboard widgets.
 * Permission codes (from schema.ts): `sales.admindashboard.{action}`
 */
export const SALES_ADMIN_DASHBOARD_SUBJECT = 'sales.admindashboard'

export const SALES_ADMIN_DASHBOARD_ACTIONS = {
  SUMMARY: 'summary',
  PERFORMANCE: 'performance',
  REVENUE_TREND: 'revenue_trend',
  TRANSACTIONS_BY_PROJECT: 'transactions_by_project',
  PENDING_RECONCILIATIONS: 'pending_reconciliations',
  EXPORT_PERFORMANCE: 'export_performance',
  EXPORT_TRANSACTIONS_BY_PROJECT: 'export_transactions_by_project',
  EXPORT_REVENUE_TREND: 'export_revenue_trend',
} as const

/** Revenue trend palette — revenue bars in brand red, deal-count line in blue accent */
export const REVENUE_TREND_COLORS = {
  revenue: '#D32F2F',
  dealCount: '#1E88E5',
} as const

export const ONE_BILLION = 1_000_000_000

/**
 * Ô "Đối soát chờ duyệt" chỉ cần `count` của response, không cần một dòng dữ liệu nào.
 * Xin 1 dòng thay vì 5 để payload nhỏ nhất mà vẫn nhận đủ tổng số.
 */
export const PENDING_RECON_COUNT_LIMIT = 1

/**
 * Cách nhóm theo thời gian — dùng chung cho "Xu hướng doanh thu" và "Hiệu suất theo tổ chức".
 *
 * Ở đây chứ không nằm trong một file form: hai khối cùng gọi endpoint có tham số `group` giống
 * nhau, và mỗi khối tự khai một mảng riêng thì đổi nhãn một chỗ là hai biểu đồ trên CÙNG một
 * trang nói hai câu khác nhau cho cùng một giá trị. Đã từng có đúng hai bản như vậy.
 */
export const TIME_GROUP_OPTIONS = [
  { value: TimeGroup.week, label: 'Theo tuần' },
  { value: TimeGroup.month, label: 'Theo tháng' },
  { value: TimeGroup.year, label: 'Theo năm' },
]
