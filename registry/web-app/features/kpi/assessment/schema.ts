import { z } from 'zod'

export const assessmentItemSchema = z.object({
  id: z.number(),
  employee_score: z.coerce.number().min(0).max(100).nullable(),
  manager_score: z.coerce.number().min(0).max(100).nullable(),
  note: z.string().optional().nullable(),
})

export const assessmentSchema = z.object({
  plan_tasks: z.string().optional().nullable(),
  extra_tasks: z.string().optional().nullable(),
  proposal: z.string().optional().nullable(),
  items: z.array(assessmentItemSchema),
  grade_manager_overridden: z.string().optional().nullable(),
  manager_assessment: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  grade_hrm: z.string().optional().nullable(),
  note: z.string().max(250, 'Ghi chú không được vượt quá 250 ký tự').optional().nullable(),
  total_manager_score: z.coerce.number().optional().nullable(),
})

export type AssessmentFormValues = z.infer<typeof assessmentSchema>
export type AssessmentItemFormValues = z.infer<typeof assessmentItemSchema>
