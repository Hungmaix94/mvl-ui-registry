import { describe, expect, it } from 'vitest'
import {
  buildFilterSearchParams,
  countActiveOrgFilters,
  parseOrgFilters,
} from './income-by-recipient-filters'
import type { ReportFilterPatch } from './income-by-recipient-filters'

function patch(current: string, changes: ReportFilterPatch) {
  return Object.fromEntries(buildFilterSearchParams(new URLSearchParams(current), changes))
}

describe('buildFilterSearchParams', () => {
  it('sets the patched keys and always resets to page 1', () => {
    expect(patch('year=2026&month=7&page=4', { branch: 3 })).toEqual({
      year: '2026',
      month: '7',
      page: '1',
      branch: '3',
    })
  })

  it('drops keys patched with null / undefined / empty string', () => {
    expect(patch('year=2026&month=7&q=hung&page=2', { q: null })).toEqual({
      year: '2026',
      month: '7',
      page: '1',
    })
    expect(patch('branch=1', { branch: undefined })).toEqual({ page: '1' })
    expect(patch('branch=1', { branch: '' })).toEqual({ page: '1' })
  })

  it('applies the whole cascade in one patch when Chi nhánh changes', () => {
    // Cascade emits all three levels together: chi nhánh mới, khối + phòng ban bị xoá.
    expect(
      patch('branch=1&block=5&department=9&page=3', { branch: 2, block: null, department: null })
    ).toEqual({ branch: '2', page: '1' })
  })

  it('keeps Chi nhánh when only Phòng ban is cleared by the cascade', () => {
    expect(
      patch('branch=1&block=5&department=9', { branch: 1, block: 6, department: null })
    ).toEqual({ branch: '1', block: '6', page: '1' })
  })

  it('leaves untouched filters alone', () => {
    expect(patch('branch=1&block=5&department=9&q=hung', { q: 'lan' })).toEqual({
      branch: '1',
      block: '5',
      department: '9',
      q: 'lan',
      page: '1',
    })
  })

  it('does not mutate the params it receives', () => {
    const current = new URLSearchParams('branch=1&block=5')
    buildFilterSearchParams(current, { branch: 2, block: null })
    expect(current.get('branch')).toBe('1')
    expect(current.get('block')).toBe('5')
  })
})

describe('parseOrgFilters', () => {
  const parse = (query: string) => parseOrgFilters(new URLSearchParams(query))

  it('reads the three org levels as numbers', () => {
    expect(parse('branch=1&block=5&department=9')).toEqual({
      branch: 1,
      block: 5,
      department: 9,
    })
  })

  it('drops values that are not a positive id', () => {
    // URL gõ tay: `Number('abc')` là `NaN`, đi vào query string thành `branch=NaN` và BE trả 400
    // — cả trang trắng chứ không chỉ hỏng một bộ lọc.
    expect(parse('branch=abc&block=0&department=-3')).toEqual({
      branch: null,
      block: null,
      department: null,
    })
    expect(parse('branch=1abc&block=1.5&department= ')).toEqual({
      branch: null,
      block: null,
      department: null,
    })
  })

  it('returns nulls when nothing is set', () => {
    expect(parse('year=2026&month=7')).toEqual({ branch: null, block: null, department: null })
  })
})

describe('countActiveOrgFilters', () => {
  const count = (query: string) => countActiveOrgFilters(new URLSearchParams(query))

  it('counts each org level that is set', () => {
    expect(count('')).toBe(0)
    expect(count('branch=1')).toBe(1)
    expect(count('branch=1&block=5')).toBe(2)
    expect(count('branch=1&block=5&department=9')).toBe(3)
  })

  it('ignores params that live outside the filter dialog', () => {
    // Kỳ (`year`/`month`) chọn ở chip trên toolbar, `q` là ô tìm người nhận cũng ngoài dialog —
    // tính chúng vào badge là người dùng mở dialog ra và đếm không ra đủ số.
    expect(count('year=2026&month=7&q=hung&page=2&page_size=25')).toBe(0)
    expect(count('year=2026&month=7&q=hung&branch=1')).toBe(1)
  })

  it('does not count a key present but empty', () => {
    expect(count('branch=&block=&department=')).toBe(0)
  })

  it('does not count a value the dialog could never show', () => {
    // Badge "1" cho `?branch=abc` là nói dối: mở dialog ra thì ô Chi nhánh trống trơn.
    expect(count('branch=abc')).toBe(0)
    expect(count('branch=abc&block=5')).toBe(1)
  })
})
