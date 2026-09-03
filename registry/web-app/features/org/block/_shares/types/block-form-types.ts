import { z } from 'zod'
import { BlockType } from '@/constants/api-schema-aliases'
/**
 * Zod schema for block form validation
 *
 * Field names match API schema (snake_case):
 * - branch_id (not branch)
 */
export const blockFormSchema = z.object({
  name: z.string().min(1, 'Tên khối không được để trống'),
  block_type: z.nativeEnum(BlockType, {
    required_error: 'Loại khối không được để trống',
  }),
  branch_id: z.coerce
    .number({ invalid_type_error: 'Chi nhánh không được để trống' })
    .min(1, 'Chi nhánh không được để trống'),
  director_id: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().optional(),
})

export type BlockFormValues = z.infer<typeof blockFormSchema>
