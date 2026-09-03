import { z } from 'zod'
import { components, paths } from '@/api/schema'
import { KpiAssignmentRole, KpiCommissionStructureStatus } from '@/constants/api-schema-aliases'
export type KpiCommissionStructure = components['schemas']['KpiCommissionStructure']
export type KpiCommissionStructureRequest = components['schemas']['KpiCommissionStructureRequest']
export type KpiCommissionTier = components['schemas']['KpiCommissionTier']
export type KpiCommissionTierRequest = components['schemas']['KpiCommissionTierRequest']
export type GetKpiCommissionStructuresParams =
  paths['/api/accounting/kpi-commission-structures/']['get']['parameters']['query']

export const kpiCommissionTierSchema = z.object({
  id: z.number().optional(),
  min_completion_pct: z
    .string({ required_error: 'Vui lòng nhập % hoàn thành tối thiểu' })
    .min(1, 'Vui lòng nhập % hoàn thành tối thiểu'),
  max_completion_pct: z.string().nullable().optional(),
  commission_pct: z
    .string({ required_error: 'Vui lòng nhập % hoa hồng' })
    .min(1, 'Vui lòng nhập % hoa hồng'),
  note: z.string().max(2000, 'Ghi chú không vượt quá 2000 ký tự').optional().or(z.literal('')),
})

export const kpiCommissionRuleSchema = z.object({
  name: z
    .string({ required_error: 'Vui lòng nhập tên quy tắc' })
    .min(1, 'Vui lòng nhập tên quy tắc')
    .max(255, 'Tên quy tắc không vượt quá 255 ký tự'),
  target_role: z.nativeEnum(KpiAssignmentRole, {
    required_error: 'Vui lòng chọn đối tượng áp dụng',
  }),
  effective_from: z.string({ required_error: 'Vui lòng chọn ngày hiệu lực từ' }),
  effective_to: z.string().nullable().optional(),
  status: z.nativeEnum(KpiCommissionStructureStatus).optional(),
  note: z.string().max(2000, 'Ghi chú không vượt quá 2000 ký tự').optional().or(z.literal('')),
  tiers: z.array(kpiCommissionTierSchema).min(1, 'Vui lòng thêm ít nhất một ngưỡng hoa hồng'),
})

export type KpiCommissionRuleFormValues = z.infer<typeof kpiCommissionRuleSchema>

export const DEFAULT_KPI_COMMISSION_RULE_FORM_VALUES: KpiCommissionRuleFormValues = {
  name: '',
  target_role: '' as unknown as KpiAssignmentRole,
  effective_from: '',
  effective_to: null,
  status: KpiCommissionStructureStatus.DRAFT,
  note: '',
  tiers: [
    {
      min_completion_pct: '0',
      max_completion_pct: null,
      commission_pct: '0',
      note: '',
    },
  ],
}

export const kpiCommissionRuleFilterSchema = z.object({
  target_role: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
})

export type KpiCommissionRuleFilterValues = z.infer<typeof kpiCommissionRuleFilterSchema>

export const DEFAULT_KPI_COMMISSION_RULE_FILTER_VALUES: KpiCommissionRuleFilterValues = {
  target_role: null,
  status: null,
}
