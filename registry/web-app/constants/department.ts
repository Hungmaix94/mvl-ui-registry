/**
 * Department Level Mapping
 * Maps is_main_department boolean to Vietnamese display names
 */
export const DEPARTMENT_LEVEL_LABELS = {
  main: 'Đầu mối',
  sub: '', // Empty string for non-main departments as per requirement
} as const
