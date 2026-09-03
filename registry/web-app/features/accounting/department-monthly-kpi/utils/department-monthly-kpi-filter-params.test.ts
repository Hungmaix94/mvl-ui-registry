import { describe, expect, it } from 'vitest'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import {
  applyDepartmentMonthlyKpiFilterToParams,
  buildDepartmentMonthlyKpiApiParams,
  countDepartmentMonthlyKpiActiveFilters,
  getDepartmentMonthlyKpiFilterValues,
} from './department-monthly-kpi-filter-params'

const sp = (query: string) => new URLSearchParams(query)

describe('pagination options (CR 86eyj407z acceptance criterion)', () => {
  it('offers exactly 25 / 50 / 100 and defaults to 25', () => {
    // Màn này trước đây tự khai [10, 20, 50, 100] với mặc định 20, lệch convention.
    expect(PAGE_SIZES).toEqual([25, 50, 100])
    expect(PAGE_SIZE).toBe(25)
  })
})

describe('buildDepartmentMonthlyKpiApiParams', () => {
  it('defaults to page 1 and PAGE_SIZE when the URL is empty', () => {
    const params = buildDepartmentMonthlyKpiApiParams(sp(''))
    expect(params.page).toBe(1)
    expect(params.page_size).toBe(PAGE_SIZE)
  })

  it.each([25, 50, 100])('keeps the whitelisted page_size %i', (size) => {
    expect(buildDepartmentMonthlyKpiApiParams(sp(`page_size=${size}`)).page_size).toBe(size)
  })

  it('falls back to PAGE_SIZE for a page_size outside the dropdown options', () => {
    // 20 was the old default; it is no longer offered so the dropdown would render blank.
    expect(buildDepartmentMonthlyKpiApiParams(sp('page_size=20')).page_size).toBe(PAGE_SIZE)
    expect(buildDepartmentMonthlyKpiApiParams(sp('page_size=99999')).page_size).toBe(PAGE_SIZE)
    expect(buildDepartmentMonthlyKpiApiParams(sp('page_size=abc')).page_size).toBe(PAGE_SIZE)
  })

  it('maps the org cascade and the period', () => {
    const params = buildDepartmentMonthlyKpiApiParams(
      sp('year=2026&month=7&branch=1&block=2&department=3')
    )
    expect(params).toMatchObject({ year: 2026, month: 7, branch: 1, block: 2, department: 3 })
  })

  it('carries approval and split status as two independent params', () => {
    const params = buildDepartmentMonthlyKpiApiParams(sp('status=DRAFT&split_status=PENDING_SPLIT'))
    expect(params.status).toBe('DRAFT')
    expect(params.split_status).toBe('PENDING_SPLIT')
  })

  it('allows an approval status without a split status and vice versa', () => {
    expect(buildDepartmentMonthlyKpiApiParams(sp('status=CONFIRMED')).split_status).toBeUndefined()
    expect(buildDepartmentMonthlyKpiApiParams(sp('split_status=SPLIT_DONE')).status).toBeUndefined()
  })

  it('drops a status code that is not in the schema enum instead of sending it to the API', () => {
    // A hand-edited URL must degrade to "no filter", not to a 400 that reads as an empty table.
    expect(buildDepartmentMonthlyKpiApiParams(sp('status=PENDING_SPLIT')).status).toBeUndefined()
    expect(buildDepartmentMonthlyKpiApiParams(sp('status=rác')).status).toBeUndefined()
    expect(
      buildDepartmentMonthlyKpiApiParams(sp('split_status=DRAFT')).split_status
    ).toBeUndefined()
  })
})

describe('getDepartmentMonthlyKpiFilterValues', () => {
  it('seeds the form from the URL', () => {
    expect(
      getDepartmentMonthlyKpiFilterValues(
        sp('branch=1&block=2&department=3&status=DRAFT&split_status=PARTIAL_SPLIT')
      )
    ).toEqual({
      branch: 1,
      block: 2,
      department: 3,
      status: 'DRAFT',
      split_status: 'PARTIAL_SPLIT',
    })
  })

  it('returns nulls (not undefined) so the form fields stay controlled', () => {
    expect(getDepartmentMonthlyKpiFilterValues(sp(''))).toEqual({
      branch: null,
      block: null,
      department: null,
      status: null,
      split_status: null,
    })
  })
})

describe('countDepartmentMonthlyKpiActiveFilters', () => {
  it('counts both status filters separately', () => {
    expect(countDepartmentMonthlyKpiActiveFilters(sp('status=DRAFT'))).toBe(1)
    expect(countDepartmentMonthlyKpiActiveFilters(sp('status=DRAFT&split_status=SPLIT_DONE'))).toBe(
      2
    )
  })

  it('counts the org cascade but ignores period and pagination params', () => {
    expect(
      countDepartmentMonthlyKpiActiveFilters(
        sp('branch=1&block=2&department=3&year=2026&month=7&page=2&page_size=50')
      )
    ).toBe(3)
  })

  it('is zero when nothing is filtered', () => {
    expect(countDepartmentMonthlyKpiActiveFilters(sp('year=2026&month=7&page=1'))).toBe(0)
  })
})

describe('applyDepartmentMonthlyKpiFilterToParams', () => {
  const emptyForm = {
    branch: null,
    block: null,
    department: null,
    status: null,
    split_status: null,
  }

  it('writes the selected filters and resets to page 1', () => {
    const next = applyDepartmentMonthlyKpiFilterToParams(
      sp('page=5&page_size=50&year=2026&month=7'),
      { ...emptyForm, branch: 1, status: 'CONFIRMED', split_status: 'SPLIT_DONE' },
      50
    )
    expect(next.get('page')).toBe('1')
    expect(next.get('branch')).toBe('1')
    expect(next.get('status')).toBe('CONFIRMED')
    expect(next.get('split_status')).toBe('SPLIT_DONE')
  })

  it('keeps the period and page size that live outside the filter dialog', () => {
    const next = applyDepartmentMonthlyKpiFilterToParams(
      sp('year=2026&month=7&page_size=100'),
      { ...emptyForm, status: 'DRAFT' },
      100
    )
    expect(next.get('year')).toBe('2026')
    expect(next.get('month')).toBe('7')
    expect(next.get('page_size')).toBe('100')
  })

  it('removes a filter that the user cleared instead of leaving the stale value on the URL', () => {
    const next = applyDepartmentMonthlyKpiFilterToParams(
      sp('branch=1&status=DRAFT&split_status=SPLIT_DONE'),
      emptyForm,
      PAGE_SIZE
    )
    expect(next.has('branch')).toBe(false)
    expect(next.has('status')).toBe(false)
    expect(next.has('split_status')).toBe(false)
  })

  it('clears only the status that was reset, keeping the other one', () => {
    const next = applyDepartmentMonthlyKpiFilterToParams(
      sp('status=DRAFT&split_status=SPLIT_DONE'),
      { ...emptyForm, split_status: 'SPLIT_DONE' },
      PAGE_SIZE
    )
    expect(next.has('status')).toBe(false)
    expect(next.get('split_status')).toBe('SPLIT_DONE')
  })
})
