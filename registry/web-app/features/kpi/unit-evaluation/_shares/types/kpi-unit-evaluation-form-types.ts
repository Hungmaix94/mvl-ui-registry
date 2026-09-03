import { z } from 'zod'
import { DepartmentKPIAssessmentList } from '@/features/kpi/services/kpi-assessment-service'

/**
 * Extract grade type from DepartmentKPIAssessmentList
 * Grade can be 'A', 'B', 'C', or 'D' based on API schema
 */
export type KPIGradeType = NonNullable<DepartmentKPIAssessmentList['grade']>

/**
 * Valid KPI grade values based on API schema
 * These values are derived from DepartmentKPIAssessmentList['grade'] type
 */
const KPI_GRADE_VALUES: readonly [KPIGradeType, KPIGradeType, KPIGradeType, KPIGradeType] = [
  'A',
  'B',
  'C',
  'D',
] as const

/**
 * Zod schema for KPI unit evaluation form validation
 *
 * Field names match API schema (snake_case):
 * - grade, note
 */
export const kpiUnitEvaluationFormSchema = z.object({
  grade: z.enum(KPI_GRADE_VALUES, {
    required_error: 'Xếp loại KPI không được để trống',
  }),
  note: z.string().max(250, 'Ghi chú không được vượt quá 250 ký tự').optional(),
})

export type KPIUnitEvaluationFormValues = z.infer<typeof kpiUnitEvaluationFormSchema>
