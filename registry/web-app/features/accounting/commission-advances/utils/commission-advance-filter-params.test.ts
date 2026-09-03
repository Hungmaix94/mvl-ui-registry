import { describe, expect, it } from 'vitest'
import { PAGE_SIZE } from '@/constants/table'
import {
  buildCommissionAdvanceApiParams,
  getCommissionAdvanceFilterValues,
  countCommissionAdvanceActiveFilters,
  applyCommissionAdvanceFilterToParams,
} from './commission-advance-filter-params'

const sp = (query: string) => new URLSearchParams(query)

describe('buildCommissionAdvanceApiParams', () => {
  it('defaults page_size to PAGE_SIZE and omits page when the URL is empty', () => {
    const params = buildCommissionAdvanceApiParams(sp(''))
    expect(params).toEqual({ page_size: PAGE_SIZE })
  })

  it('keeps a valid page and a whitelisted page_size', () => {
    const params = buildCommissionAdvanceApiParams(sp('page=2&page_size=50'))
    expect(params.page).toBe(2)
    expect(params.page_size).toBe(50)
  })

  it('falls back to PAGE_SIZE for a non-whitelisted page_size', () => {
    const params = buildCommissionAdvanceApiParams(sp('page_size=999'))
    expect(params.page_size).toBe(PAGE_SIZE)
  })

  it('maps status, search, requester_employee and deal', () => {
    const params = buildCommissionAdvanceApiParams(
      sp('status=APPROVED&search=abc&requester_employee=7&deal=12')
    )
    expect(params.status).toBe('APPROVED')
    expect(params.search).toBe('abc')
    expect(params.requester_employee).toBe(7)
    expect(params.deal).toBe(12)
  })

  it('collects repeated recipient_employee params into a number[]', () => {
    const params = buildCommissionAdvanceApiParams(
      sp('recipient_employee=1&recipient_employee=2&recipient_employee=3')
    )
    expect(params.recipient_employee).toEqual([1, 2, 3])
  })

  it('drops non-numeric / non-positive recipient_employee entries', () => {
    const params = buildCommissionAdvanceApiParams(
      sp('recipient_employee=1&recipient_employee=abc&recipient_employee=0&recipient_employee=-4')
    )
    expect(params.recipient_employee).toEqual([1])
  })

  it('ignores an empty recipient_employee param', () => {
    const params = buildCommissionAdvanceApiParams(sp('page=1'))
    expect(params.recipient_employee).toBeUndefined()
  })

  it('ignores a non-numeric requester_employee', () => {
    const params = buildCommissionAdvanceApiParams(sp('requester_employee=abc'))
    expect(params.requester_employee).toBeUndefined()
  })
})

describe('getCommissionAdvanceFilterValues', () => {
  it('returns an empty object when nothing is set', () => {
    expect(getCommissionAdvanceFilterValues(sp(''))).toEqual({})
  })

  it('reads status, requester_employee and deal as strings', () => {
    const data = getCommissionAdvanceFilterValues(sp('status=PAID&requester_employee=7&deal=12'))
    expect(data).toEqual({ status: 'PAID', requester_employee: '7', deal: '12' })
  })

  it('reads repeated recipient_employee into a string array', () => {
    const data = getCommissionAdvanceFilterValues(sp('recipient_employee=1&recipient_employee=2'))
    expect(data.recipient_employee).toEqual(['1', '2'])
  })

  it('omits recipient_employee when absent', () => {
    const data = getCommissionAdvanceFilterValues(sp('status=DRAFT'))
    expect(data.recipient_employee).toBeUndefined()
  })
})

describe('countCommissionAdvanceActiveFilters', () => {
  it('counts nothing for an empty URL', () => {
    expect(countCommissionAdvanceActiveFilters(sp(''))).toBe(0)
  })

  it('counts search alongside the dialog filters', () => {
    expect(countCommissionAdvanceActiveFilters(sp('search=x&status=PAID'))).toBe(2)
  })

  it('counts a repeated recipient_employee as a single active filter', () => {
    expect(
      countCommissionAdvanceActiveFilters(sp('recipient_employee=1&recipient_employee=2'))
    ).toBe(1)
  })

  it('counts every field when all are set', () => {
    expect(
      countCommissionAdvanceActiveFilters(
        sp('search=x&status=PAID&requester_employee=7&recipient_employee=1&deal=12')
      )
    ).toBe(5)
  })
})

describe('applyCommissionAdvanceFilterToParams', () => {
  it('always resets to page 1 and carries page_size + search', () => {
    const params = applyCommissionAdvanceFilterToParams({}, { pageSize: '50', search: 'abc' })
    expect(params.get('page')).toBe('1')
    expect(params.get('page_size')).toBe('50')
    expect(params.get('search')).toBe('abc')
  })

  it('omits search when not provided', () => {
    const params = applyCommissionAdvanceFilterToParams({}, { pageSize: '25' })
    expect(params.has('search')).toBe(false)
  })

  it('writes single-value filters', () => {
    const params = applyCommissionAdvanceFilterToParams(
      { status: 'PAID', requester_employee: '7', deal: '12' },
      { pageSize: '25' }
    )
    expect(params.get('status')).toBe('PAID')
    expect(params.get('requester_employee')).toBe('7')
    expect(params.get('deal')).toBe('12')
  })

  it('appends recipient_employee as repeated params', () => {
    const params = applyCommissionAdvanceFilterToParams(
      { recipient_employee: [1, 2, 3] },
      { pageSize: '25' }
    )
    expect(params.getAll('recipient_employee')).toEqual(['1', '2', '3'])
  })

  it('omits recipient_employee when the array is empty', () => {
    const params = applyCommissionAdvanceFilterToParams(
      { recipient_employee: [] },
      { pageSize: '25' }
    )
    expect(params.has('recipient_employee')).toBe(false)
  })

  it('round-trips through buildCommissionAdvanceApiParams', () => {
    const applied = applyCommissionAdvanceFilterToParams(
      { status: 'APPROVED', requester_employee: '7', recipient_employee: [1, 2], deal: '9' },
      { pageSize: '50', search: 'abc' }
    )
    const api = buildCommissionAdvanceApiParams(applied)
    expect(api).toMatchObject({
      page: 1,
      page_size: 50,
      search: 'abc',
      status: 'APPROVED',
      requester_employee: 7,
      recipient_employee: [1, 2],
      deal: 9,
    })
  })
})
