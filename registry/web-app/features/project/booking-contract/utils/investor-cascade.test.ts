import { describe, expect, it, vi } from 'vitest'
import { clearInvestorDependents, isInvestorChanged } from './investor-cascade'

/**
 * ClickUp 86eyqrk7h — "Danh sách Dự án hiển thị sai dữ liệu khi thay đổi Chủ đầu tư".
 *
 * Ảnh QA: CĐT `Vinaconex8` nhưng Dự án vẫn là `Legacy Hòa Lạc` (của `An Thịnh Group`), vì form chỉ
 * dọn field con khi XOÁ TRẮNG CĐT chứ không dọn khi ĐỔI sang CĐT khác.
 */
describe('isInvestorChanged (86eyqrk7h)', () => {
  it('đổi sang CĐT khác ⇒ coi là đã đổi', () => {
    expect(isInvestorChanged(85, 81)).toBe(true)
  })

  it('xoá trắng CĐT ⇒ coi là đã đổi (giữ nguyên hành vi cũ của nhánh `!val`)', () => {
    expect(isInvestorChanged(85, null)).toBe(true)
    expect(isInvestorChanged(85, undefined)).toBe(true)
  })

  it('từ rỗng chọn một CĐT ⇒ coi là đã đổi', () => {
    expect(isInvestorChanged(null, 85)).toBe(true)
  })

  it('chọn lại ĐÚNG CĐT đang có ⇒ KHÔNG đổi, không được xoá oan Dự án user đã chọn', () => {
    expect(isInvestorChanged(85, 85)).toBe(false)
  })

  it('Select trả chuỗi còn form giữ số ⇒ vẫn là CÙNG một CĐT, không được coi là đổi', () => {
    // Đây là bẫy thật: so `!==` trần thì '85' !== 85 ⇒ xoá oan Dự án mỗi lần chạm vào ô CĐT.
    expect(isInvestorChanged(85, '85')).toBe(false)
    expect(isInvestorChanged('85', 85)).toBe(false)
  })

  it('cả hai cùng rỗng ⇒ không đổi', () => {
    expect(isInvestorChanged(null, null)).toBe(false)
    expect(isInvestorChanged(undefined, null)).toBe(false)
  })
})

describe('clearInvestorDependents (86eyqrk7h)', () => {
  it('dọn ĐỦ 3 field phụ thuộc CĐT: Dự án, Mã BĐS, Thông tin bán hàng', () => {
    const setValue = vi.fn()

    clearInvestorDependents(setValue as any)

    const fields = setValue.mock.calls.map((call) => call[0] as string)
    expect(fields).toEqual(['project_id', 'product_inventory_id', 'sales_allocation'])
    for (const [, value] of setValue.mock.calls) {
      expect(value).toBeNull()
    }
  })

  it('dọn im lặng, không bắn lỗi validate trước khi user bấm Lưu', () => {
    const setValue = vi.fn()

    clearInvestorDependents(setValue as any)

    expect(setValue.mock.calls.length).toBeGreaterThan(0)
    for (const [field, , options] of setValue.mock.calls) {
      expect(options, `field "${field}" phải dọn im lặng`).toEqual({ shouldValidate: false })
    }
  })
})
