import { describe, expect, it } from 'vitest'
import { buildDeptPoolOptionLabel } from './dept-pool-option-label'

const pool = (overrides: Record<string, unknown> = {}) =>
  ({
    department_name: 'Phòng Kinh doanh',
    block_name: 'Khối Kinh doanh',
    branch_name: 'Chi nhánh HCM',
    total_amount: '2423977',
    ...overrides,
  }) as Parameters<typeof buildDeptPoolOptionLabel>[0]

describe('buildDeptPoolOptionLabel', () => {
  it('includes department, block, branch and amount', () => {
    expect(buildDeptPoolOptionLabel(pool())).toBe(
      'Phòng Kinh doanh — Khối Kinh doanh · Chi nhánh HCM (2.423.977)'
    )
  })

  it('keeps two same-named departments distinguishable', () => {
    // Đây là lý do tồn tại của hàm: department_name không unique, và từ CR 86eyj407z nó
    // không còn kèm mã phòng. Nếu hai nhãn này trùng nhau, kế toán có thể import file chia
    // hoa hồng vào pool sai phòng.
    const a = buildDeptPoolOptionLabel(pool())
    const b = buildDeptPoolOptionLabel(
      pool({ block_name: 'Khối Hỗ trợ', branch_name: 'Chi nhánh Hà Nội' })
    )
    expect(a).not.toBe(b)
  })

  it('still distinguishes them when the totals happen to be equal', () => {
    const a = buildDeptPoolOptionLabel(pool({ total_amount: '778000' }))
    const b = buildDeptPoolOptionLabel(
      pool({ total_amount: '778000', branch_name: 'Chi nhánh HN' })
    )
    expect(a).not.toBe(b)
  })

  it('omits the org segment entirely when both names are missing', () => {
    expect(buildDeptPoolOptionLabel(pool({ block_name: '', branch_name: '' }))).toBe(
      'Phòng Kinh doanh (2.423.977)'
    )
  })

  it('renders whichever org name is present when only one is missing', () => {
    expect(buildDeptPoolOptionLabel(pool({ block_name: '' }))).toBe(
      'Phòng Kinh doanh — Chi nhánh HCM (2.423.977)'
    )
  })

  it('treats a missing amount as zero rather than NaN', () => {
    expect(buildDeptPoolOptionLabel(pool({ total_amount: null }))).toContain('(0)')
  })
})
