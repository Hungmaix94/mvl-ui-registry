/**
 * Recruitment expense filter option constants
 * Used for select dropdowns and numeric inputs in recruitment expense filter form
 */
import { TObjectValues } from '@/types'
import { ColoredValueVariant } from '@/api/schema.ts'

export const RECRUITMENT_EXPENSE_YES_NO_VALUES = {
  YES: 'true',
  NO: 'false',
} as const

export type TRecruitmentExpenseYesNo = TObjectValues<typeof RECRUITMENT_EXPENSE_YES_NO_VALUES>

export const RECRUITMENT_EXPENSE_YES_NO_OPTIONS = [
  { value: RECRUITMENT_EXPENSE_YES_NO_VALUES.YES, label: 'Có' },
  { value: RECRUITMENT_EXPENSE_YES_NO_VALUES.NO, label: 'Không' },
] as const

// Default value cho input số khi mở dialog lần đầu (theo yêu cầu BE)
export const DEFAULT_INVALID_REFEREE_MIN_WORKING_DAYS = undefined

// Labels (full) — dùng cho dialog filter
export const INVALID_REASON_FULL_LABELS = {
  is_valid: 'Tính hợp lệ',
  invalid_referee_min_working_days: 'Người được giới thiệu chưa đủ số ngày làm việc tối thiểu',
  invalid_referrer_left_by_expense_date: 'Người giới thiệu hiện tại đã nghỉ việc',
  invalid_referee_in_backoffice: 'Người được giới thiệu thuộc khối Backoffice',
  invalid_referrer_was_leadership: 'Người giới thiệu giữ chức quản lý tại thời điểm giới thiệu',
} as const

// Short labels — dùng cho chip/badge (giữ sẵn cho nhu cầu tương lai)
export const INVALID_REASON_SHORT_LABELS = {
  invalid_referee_min_working_days: 'Chưa đủ ngày làm việc tối thiểu',
  invalid_referrer_left_by_expense_date: 'Người giới thiệu đã nghỉ việc',
  invalid_referee_in_backoffice: 'Thuộc khối Backoffice',
  invalid_referrer_was_leadership: 'Người giới thiệu là quản lý',
} as const

// is_valid column Chip mapping — null/undefined hiển thị '-'
export const IS_VALID_CHIP: Record<
  'true' | 'false',
  { label: string; variant: ColoredValueVariant }
> = {
  true: { label: 'Hợp lệ', variant: ColoredValueVariant.GREEN },
  false: { label: 'Không hợp lệ', variant: ColoredValueVariant.RED },
}
