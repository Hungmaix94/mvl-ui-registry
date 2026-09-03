import { z } from 'zod'

/**
 * Zod validation schemas for Position Management
 */

// Position level enum
export const PositionLevelSchema = z.union([
  z.literal(1), // Chief Executive Officer (CEO)
  z.literal(2), // Block Director
  z.literal(3), // Deputy Block Director
  z.literal(4), // Department Manager
  z.literal(5), // Deputy Department Manager
  z.literal(6), // Supervisor
  z.literal(7), // Staff
  z.literal(8), // Intern
])

// Base position schema
export const PositionBaseSchema = z.object({
  name: z.string().min(1, 'Tên chức vụ là bắt buộc'),
  code: z.string().min(1, 'Mã chức vụ là bắt buộc'),
  level: PositionLevelSchema,
  description: z.string().optional(),
  is_active: z.boolean().optional().default(true),
})

// Position create schema
export const PositionCreateSchema = PositionBaseSchema

// Position update schema (all fields optional)
export const PositionUpdateSchema = PositionBaseSchema.partial()

// Type exports
export type PositionCreateInput = z.infer<typeof PositionCreateSchema>
export type PositionUpdateInput = z.infer<typeof PositionUpdateSchema>
