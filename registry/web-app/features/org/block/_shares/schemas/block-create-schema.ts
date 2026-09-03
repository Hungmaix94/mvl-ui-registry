import { z } from 'zod'

export const blockCreateSchema = z.object({
  name: z.string().min(1, 'Tên khối không được để trống'),
  code: z.string().min(1, 'Mã khối không được để trống'),
  block_type: z.string().min(1, 'Loại khối không được để trống'),
  branch: z.number().min(1, 'Chi nhánh không được để trống'),
})

export type BlockCreateFormData = z.infer<typeof blockCreateSchema>
