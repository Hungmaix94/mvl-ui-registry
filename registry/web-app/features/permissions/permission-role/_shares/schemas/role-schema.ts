import { z } from 'zod'
import type { RoleRequest } from '@/services/role-service.ts'
import { PatchedRoleRequestData_scope_level } from '@/api/schema.ts'

export const roleFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên vai trò là bắt buộc')
    .max(100, 'Tên vai trò không được quá 100 ký tự'),
  description: z.string().optional(),
  permission_ids: z.array(z.number()),
  data_scope_level: z.nativeEnum(PatchedRoleRequestData_scope_level).optional(),
  branch_scope_ids: z.array(z.number()).optional(),
  block_scope_ids: z.array(z.number()).optional(),
  department_scope_ids: z.array(z.number()).optional(),
}) satisfies z.ZodType<RoleRequest>

export type RoleFormData = z.infer<typeof roleFormSchema>

// Type for edit form that includes id
export type RoleEditFormData = RoleFormData & { id: number }
