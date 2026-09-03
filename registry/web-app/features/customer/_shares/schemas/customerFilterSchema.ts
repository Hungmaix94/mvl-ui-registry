import { z } from 'zod'
import { CustomerType } from '@/constants/api-schema-aliases'
export const customerFilterSchema = z.object({
  customer_type: z.nativeEnum(CustomerType).nullable().optional(),
})

export type CustomerFilterValues = z.infer<typeof customerFilterSchema>
