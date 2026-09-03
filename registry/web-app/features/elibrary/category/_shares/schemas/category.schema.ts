import { z } from 'zod'

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'Tên danh mục là bắt buộc')
    .max(255, 'Tên danh mục không được quá 255 ký tự'),
  description: z.string().max(500, 'Mô tả không được quá 500 ký tự').nullable().optional(),
  is_active: z.boolean().default(true).optional(),
})

export type CategoryFormData = z.infer<typeof categorySchema>
