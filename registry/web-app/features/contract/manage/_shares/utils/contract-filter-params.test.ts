import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONTRACT_ORDERING,
  buildApiParamsFromUrl,
  parseFilterParamsFromUrl,
} from './contract-filter-params.ts'

describe('parseFilterParamsFromUrl', () => {
  it('parses the expiration date range from the URL', () => {
    const params = parseFilterParamsFromUrl(
      new URLSearchParams({
        expiration_date_from: '2026-01-01',
        expiration_date_to: '2026-03-31',
      })
    )

    expect(params.expiration_date_range?.from).toEqual(new Date(2026, 0, 1))
    expect(params.expiration_date_range?.to).toEqual(new Date(2026, 2, 31))
  })

  it('parses a one-sided expiration date range', () => {
    const params = parseFilterParamsFromUrl(
      new URLSearchParams({ expiration_date_to: '2026-06-30' })
    )

    expect(params.expiration_date_range?.from).toBeUndefined()
    expect(params.expiration_date_range?.to).toEqual(new Date(2026, 5, 30))
  })

  it('keeps the effective and expiration ranges independent', () => {
    const params = parseFilterParamsFromUrl(
      new URLSearchParams({
        effective_date_from: '2025-01-01',
        expiration_date_from: '2026-01-01',
      })
    )

    expect(params.effective_date_range?.from).toEqual(new Date(2025, 0, 1))
    expect(params.expiration_date_range?.from).toEqual(new Date(2026, 0, 1))
  })

  it('leaves the expiration range unset when the URL has no expiration params', () => {
    const params = parseFilterParamsFromUrl(
      new URLSearchParams({ effective_date_from: '2025-01-01' })
    )

    expect(params.expiration_date_range).toBeUndefined()
  })
})

describe('buildApiParamsFromUrl', () => {
  it('forwards the expiration date range to the API params', () => {
    const params = buildApiParamsFromUrl(
      new URLSearchParams({
        expiration_date_from: '2026-01-01',
        expiration_date_to: '2026-03-31',
      })
    )

    expect(params.expiration_date_from).toBe('2026-01-01')
    expect(params.expiration_date_to).toBe('2026-03-31')
  })

  it('omits the expiration params when they are absent from the URL', () => {
    const params = buildApiParamsFromUrl(new URLSearchParams({ page: '1' }))

    expect(params.expiration_date_from).toBeUndefined()
    expect(params.expiration_date_to).toBeUndefined()
    expect(params.ordering).toBe(DEFAULT_CONTRACT_ORDERING)
  })
})
