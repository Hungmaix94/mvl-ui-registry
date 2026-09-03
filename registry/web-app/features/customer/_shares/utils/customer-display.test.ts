import { describe, expect, it } from 'vitest'
import { CUSTOMER_TITLE_FALLBACK, resolveCustomerTitle } from './customer-display'
import { CustomerType as CustomerType } from '@/constants/api-schema-aliases'
type Customer = Parameters<typeof resolveCustomerTitle>[0]

const business = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 1,
    code: 'KH000000067',
    customer_type: CustomerType.business,
    business_name: 'Tập đoàn Sơn Á',
    full_name: '',
    ...overrides,
  }) as unknown as Customer

const individual = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 2,
    code: 'KH000000188',
    customer_type: CustomerType.individual,
    full_name: 'Quỳnh Mai',
    ...overrides,
  }) as unknown as Customer

describe('resolveCustomerTitle', () => {
  it('reads business_name for a business customer whose full_name is empty', () => {
    expect(resolveCustomerTitle(business())).toBe('Tập đoàn Sơn Á')
  })

  it('prefers business_name over a stale full_name on a business customer', () => {
    // Legacy dev records (KH000000009, KH000000068) carry full_name === business_name.
    // Newer ones do not, so business_name must win rather than being a fallback.
    expect(resolveCustomerTitle(business({ full_name: 'Công ty Thái An (cũ)' }))).toBe(
      'Tập đoàn Sơn Á'
    )
  })

  it('reads full_name for an individual customer', () => {
    expect(resolveCustomerTitle(individual())).toBe('Quỳnh Mai')
  })

  it('accepts the alternate `name` shape for an individual customer', () => {
    expect(resolveCustomerTitle(individual({ name: 'Nguyễn Văn A', full_name: '' }))).toBe(
      'Nguyễn Văn A'
    )
  })

  it('falls back when the name is missing on either type', () => {
    expect(resolveCustomerTitle(business({ business_name: '' }))).toBe(CUSTOMER_TITLE_FALLBACK)
    expect(resolveCustomerTitle(individual({ full_name: '' }))).toBe(CUSTOMER_TITLE_FALLBACK)
  })

  it('falls back while the customer is still loading', () => {
    expect(resolveCustomerTitle(undefined)).toBe(CUSTOMER_TITLE_FALLBACK)
    expect(resolveCustomerTitle(null)).toBe(CUSTOMER_TITLE_FALLBACK)
  })
})
