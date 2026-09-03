import { describe, it, expect } from 'vitest'

import {
  COMM_MGR_MONTHLY_FILTER_PARAMS,
  applyCommMgrMonthlyFilters,
  countCommMgrMonthlyFilters,
} from './comm-mgr-monthly-filters'

describe('applyCommMgrMonthlyFilters', () => {
  it('ghi mọi cấp org đang chọn lên URL', () => {
    const next = applyCommMgrMonthlyFilters(new URLSearchParams(), {
      status: 'DRAFT',
      branch: 1,
      block: 2,
      department: 3,
      position: 4,
      beneficiary_employee: 5,
    })

    expect(Object.fromEntries(next)).toEqual({
      status: 'DRAFT',
      branch: '1',
      block: '2',
      department: '3',
      position: '4',
      beneficiary_employee: '5',
    })
  })

  it('xoá param của cấp bị bỏ chọn thay vì ghi chuỗi rỗng', () => {
    // Cascade reset con khi đổi cha: department/position/nhân viên về null.
    const current = new URLSearchParams({
      branch: '1',
      block: '2',
      department: '3',
      position: '4',
      beneficiary_employee: '5',
    })

    const next = applyCommMgrMonthlyFilters(current, { branch: 9, block: null })

    expect(next.has('department')).toBe(false)
    expect(next.has('position')).toBe(false)
    expect(next.has('beneficiary_employee')).toBe(false)
    expect(next.get('branch')).toBe('9')
    expect(next.has('block')).toBe(false)
  })

  it('giữ nguyên các param ngoài bộ lọc (kỳ, phân trang, tìm kiếm)', () => {
    const current = new URLSearchParams({ year: '2026', month: '8', page: '3', q: 'Vượng' })

    const next = applyCommMgrMonthlyFilters(current, { status: 'CONFIRMED' })

    expect(next.get('year')).toBe('2026')
    expect(next.get('month')).toBe('8')
    expect(next.get('page')).toBe('3')
    expect(next.get('q')).toBe('Vượng')
  })

  it('không sửa URLSearchParams được truyền vào', () => {
    const current = new URLSearchParams({ status: 'DRAFT' })

    applyCommMgrMonthlyFilters(current, { status: 'PAID', branch: 7 })

    expect(current.get('status')).toBe('DRAFT')
    expect(current.has('branch')).toBe(false)
  })
})

describe('countCommMgrMonthlyFilters', () => {
  it('đếm đúng số bộ lọc đang bật', () => {
    const params = new URLSearchParams({ status: 'DRAFT', branch: '1', position: '4' })

    expect(countCommMgrMonthlyFilters(params)).toBe(3)
  })

  it('không đếm kỳ và phân trang', () => {
    const params = new URLSearchParams({ year: '2026', month: '8', page: '2', page_size: '25' })

    expect(countCommMgrMonthlyFilters(params)).toBe(0)
  })

  it('không đếm param rỗng', () => {
    const params = new URLSearchParams({ status: '', branch: '1' })

    expect(countCommMgrMonthlyFilters(params)).toBe(1)
  })

  it('phủ hết mọi filter khai báo — badge không được bỏ sót cấp nào', () => {
    const params = new URLSearchParams(
      COMM_MGR_MONTHLY_FILTER_PARAMS.map((key) => [key, '1'] as [string, string])
    )

    expect(countCommMgrMonthlyFilters(params)).toBe(COMM_MGR_MONTHLY_FILTER_PARAMS.length)
  })
})
