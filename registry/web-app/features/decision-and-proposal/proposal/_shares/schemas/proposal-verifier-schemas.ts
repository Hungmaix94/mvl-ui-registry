import { z } from 'zod'

export const verifierDecisionSchema = z.object({
  note: z.string().min(1, 'Ghi chú là bắt buộc'),
})

export type VerifierDecisionFormValues = z.infer<typeof verifierDecisionSchema>

export function validateVerifierDataOrThrow<TSchema extends z.ZodTypeAny>(
  data: unknown,
  schema: TSchema
): z.infer<TSchema> {
  const result = schema.safeParse(data)

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Validation failed'
    const error: Error & { isValidationError?: boolean } = new Error(message)
    error.isValidationError = true
    throw error
  }

  return result.data
}

export function validateVerifierDecisionOrThrow(data: unknown): VerifierDecisionFormValues {
  return validateVerifierDataOrThrow(data, verifierDecisionSchema)
}
