import { type components } from '@/api/schema'
import { CustomerType as CustomerType } from '@/constants/api-schema-aliases'
type Customer = components['schemas']['Customer']

export const CUSTOMER_TITLE_FALLBACK = 'Chi tiết khách hàng'

/**
 * Resolve the heading shown for a customer.
 *
 * `full_name` is an individual-only field: the create/edit form's zod
 * `discriminatedUnion` strips it out of a business payload, and the backend never
 * mirrors `business_name` into it. Reading `full_name` alone therefore leaves every
 * business customer with the generic fallback heading — measured on dev 2026-08-05,
 * 3 of 5 business records have `full_name === ''`.
 */
export function resolveCustomerTitle(customer?: Customer | null): string {
  if (!customer) return CUSTOMER_TITLE_FALLBACK

  if (customer.customer_type === CustomerType.business) {
    return customer.business_name || CUSTOMER_TITLE_FALLBACK
  }

  // Some list/detail payloads expose the individual's name as `name` rather than
  // `full_name`; keep both readings so the heading survives either shape.
  const individualName = (customer as unknown as { name?: string }).name || customer.full_name || ''

  return individualName || CUSTOMER_TITLE_FALLBACK
}
