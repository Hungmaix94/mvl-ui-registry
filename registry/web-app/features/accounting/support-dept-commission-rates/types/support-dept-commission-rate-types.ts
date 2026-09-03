import { z } from 'zod'
import { DepartmentCommissionSource as SourceKind } from '@/constants/api-schema-aliases'

// This config only drives the single flat-rate label the backend SupportFlatCalculator
// understands; the other DeptCommissionSourceKind values come from other calculators.
// A duplicate BACKOFFICE label (same calculator, same base) was retired on the backend
// 2026-07-29 — it is rejected with 400 now, so it must not be offered here.
export const CONFIGURABLE_SOURCE_KINDS = [SourceKind.SUPPORT_FLAT] as const

export const SOURCE_KIND_LABEL: Record<(typeof CONFIGURABLE_SOURCE_KINDS)[number], string> = {
  [SourceKind.SUPPORT_FLAT]: 'Phòng hỗ trợ (SUPPORT_FLAT)',
}

export const SOURCE_KIND_OPTIONS = CONFIGURABLE_SOURCE_KINDS.map((value) => ({
  value,
  label: SOURCE_KIND_LABEL[value],
}))

export const SUPPORT_DEPT_COMMISSION_RATE_PERMISSIONS = {
  LIST: 'supportdeptcommissionrateconfig.list',
  CREATE: 'supportdeptcommissionrateconfig.create',
  UPDATE: 'supportdeptcommissionrateconfig.update',
  DESTROY: 'supportdeptcommissionrateconfig.destroy',
} as const

export const SUPPORT_DEPT_COMMISSION_RATE_SUBJECT = 'supportdeptcommissionrateconfig'

export const supportDeptCommissionRateFormSchema = z.object({
  department: z.coerce
    .number({ required_error: 'Vui lòng chọn phòng ban' })
    .refine((v) => v > 0, { message: 'Vui lòng chọn phòng ban' }),
  source_kind: z.nativeEnum(SourceKind, { required_error: 'Vui lòng chọn loại nguồn' }),
  rate: z
    .union([z.number(), z.string()])
    .refine((v) => v !== '' && v != null, { message: 'Vui lòng nhập định mức' })
    .transform((v) => String(Number(String(v).replace(/,/g, ''))))
    .refine((v) => Number(v) > 0, { message: 'Định mức phải lớn hơn 0' })
    .refine((v) => Number(v) <= 100, { message: 'Định mức không được vượt quá 100%' }),
  is_active: z.boolean(),
})

export type SupportDeptCommissionRateFormValues = z.input<
  typeof supportDeptCommissionRateFormSchema
>

export { SourceKind }
