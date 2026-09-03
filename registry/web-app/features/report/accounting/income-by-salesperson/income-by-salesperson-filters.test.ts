import { describe, it, expect } from 'vitest'
import {
  buildIncomeBySalespersonSearchParams,
  filterIncomeBySalespersonRows,
} from './income-by-salesperson-filters'

describe('buildIncomeBySalespersonSearchParams', () => {
  it('updates params and resets page to 1', () => {
    const current = new URLSearchParams('year=2026&month=7&page=3&branch=1')
    const patch = { branch: '2', department: '5' }
    const res = buildIncomeBySalespersonSearchParams(current, patch)

    expect(res.get('branch')).toBe('2')
    expect(res.get('department')).toBe('5')
    expect(res.get('page')).toBe('1')
  })

  it('removes param when patch value is null or empty', () => {
    const current = new URLSearchParams('year=2026&month=7&branch=1&department=5')
    const patch = { branch: null, department: '' }
    const res = buildIncomeBySalespersonSearchParams(current, patch)

    expect(res.has('branch')).toBe(false)
    expect(res.has('department')).toBe(false)
  })
})

describe('filterIncomeBySalespersonRows', () => {
  const sampleRows = [
    {
      employee_id: 101,
      employee_code: 'NV001',
      employee_name: 'Nguyen Van A',
      branch_id: 1,
      block_id: 5,
      department_id: 10,
      department_name: 'Phong Kinh Doanh 1',
    },
    {
      employee_id: 102,
      employee_code: 'NV002',
      employee_name: 'Tran Thi B',
      branch_id: 2,
      block_id: 6,
      department_id: 20,
      department_name: 'Phong Marketing',
    },
  ]

  it('filters rows by branch', () => {
    const res = filterIncomeBySalespersonRows(sampleRows, { branch: '1' })
    expect(res).toHaveLength(1)
    expect(res[0].employee_id).toBe(101)
  })

  it('filters rows by block', () => {
    const res = filterIncomeBySalespersonRows(sampleRows, { block: '6' })
    expect(res).toHaveLength(1)
    expect(res[0].employee_id).toBe(102)
  })

  it('filters rows by department', () => {
    const res = filterIncomeBySalespersonRows(sampleRows, { department: '20' })
    expect(res).toHaveLength(1)
    expect(res[0].employee_id).toBe(102)
  })

  it('filters rows by employee ID', () => {
    const res = filterIncomeBySalespersonRows(sampleRows, { employee: '101' })
    expect(res).toHaveLength(1)
    expect(res[0].employee_name).toBe('Nguyen Van A')
  })

  it('filters rows by searchQuery text', () => {
    const res = filterIncomeBySalespersonRows(sampleRows, { searchQuery: 'Marketing' })
    expect(res).toHaveLength(1)
    expect(res[0].employee_id).toBe(102)
  })

  it('returns 0 rows for invalid non-numeric filter values', () => {
    const res = filterIncomeBySalespersonRows(sampleRows, { branch: 'abc' })
    expect(res).toHaveLength(0)
  })
})
