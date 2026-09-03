import { z } from 'zod'

export const blockEditSchema = z.object({
  name: z.string().min(1, 'Tên khối không được để trống').optional(),
  code: z.string().min(1, 'Mã khối không được để trống').optional(),
  block_type: z.string().min(1, 'Loại khối không được để trống').optional(),
  branch: z.number().min(1, 'Chi nhánh không được để trống').optional(),
})

export type BlockEditFormData = z.infer<typeof blockEditSchema>
