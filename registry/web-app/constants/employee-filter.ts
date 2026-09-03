/**
 * Employee filter option constants
 * Used for select dropdowns in employee filter form
 */
import { TObjectValues } from '@/types'
import { EmployeeStatus } from '@/constants/api-schema-aliases'
/**
 * Trạng thái nhân sự được phép dùng trong bộ lọc (cả UI checkbox lẫn URL).
 * "Nghỉ không lương" (Unpaid Leave) bị loại bỏ theo yêu cầu nghiệp vụ — nguồn sự thật
 * duy nhất cho EmployeeFilterForm, màn Quản lý nhân sự và màn Nhân sự theo cấu trúc tổ chức.
 */
export const EMPLOYEE_FILTER_STATUS_VALUES: string[] = Object.values(EmployeeStatus).filter(
  (status) => status !== EmployeeStatus.Unpaid_Leave
)

export const EMPLOYEE_FILTER_YES_NO_VALUES = {
  YES: 'true',
  NO: 'false',
} as const

export const EMPLOYEE_FILTER_YES_NO_OPTIONS = [
  { value: EMPLOYEE_FILTER_YES_NO_VALUES.YES, label: 'Có' },
  { value: EMPLOYEE_FILTER_YES_NO_VALUES.NO, label: 'Không' },
] as const

export const EMPLOYEE_FILTER_UPLOAD_STATUS_OPTIONS = [
  { value: EMPLOYEE_FILTER_YES_NO_VALUES.YES, label: 'Đã upload' },
  { value: EMPLOYEE_FILTER_YES_NO_VALUES.NO, label: 'Chưa upload' },
] as const

export const EMPLOYEE_FILTER_TERMINATION_NOTICE_OPTIONS = [
  { value: EMPLOYEE_FILTER_YES_NO_VALUES.YES, label: 'Đã gửi' },
  { value: EMPLOYEE_FILTER_YES_NO_VALUES.NO, label: 'Chưa gửi' },
] as const

export const EMPLOYEE_FILTER_HANDOVER_COMPLETED_OPTIONS = [
  { value: EMPLOYEE_FILTER_YES_NO_VALUES.YES, label: 'Đã hoàn tất' },
  { value: EMPLOYEE_FILTER_YES_NO_VALUES.NO, label: 'Chưa hoàn tất' },
] as const

/**
 * Options for "Chức vụ không được tính vào báo cáo nhân sự" filter.
 * Maps to API param `include_report_excluded_positions`:
 *   true  = include (show) employees whose position is excluded from HR reports
 *   false = hide them
 */
export const EMPLOYEE_FILTER_REPORT_EXCLUDED_POSITION_OPTIONS = [
  { value: EMPLOYEE_FILTER_YES_NO_VALUES.YES, label: 'Có hiển thị' },
  { value: EMPLOYEE_FILTER_YES_NO_VALUES.NO, label: 'Không hiển thị' },
] as const

// -----------------------

export type TEmployeeFilter = TObjectValues<typeof EMPLOYEE_FILTER_YES_NO_VALUES>
