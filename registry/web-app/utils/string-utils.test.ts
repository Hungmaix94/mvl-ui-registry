import { describe, it, expect } from 'vitest'

import { formatCodeNameLabel } from './string-utils'

/**
 * Nhãn `Mã - Tên` dùng chung cho mọi picker/cột "Thông tin bán hàng" (ClickUp 86eyqwr9u).
 * Lý do gom về một hàm thay vì nối chuỗi tại chỗ: mỗi call site tự nối lại tự chọn một cách
 * xử vế rỗng khác nhau — `${code} - ${name ?? ''}` để lại đuôi `" - "` treo, còn
 * `name || code` thì nuốt luôn mã.
 */
describe('formatCodeNameLabel', () => {
  it('ghép "Mã - Tên" khi có đủ cả hai', () => {
    expect(formatCodeNameLabel('SA-2026-002093', 'Bảng hàng Dự án A')).toBe(
      'SA-2026-002093 - Bảng hàng Dự án A'
    )
  })

  it('giữ nguyên dấu gạch có sẵn trong TÊN, chỉ thêm đúng một dấu phân cách ở đầu', () => {
    // Tên bảng hàng thật ở dữ liệu dev có sẵn dấu gạch: "Bảng hàng - Dự án Đầm Sen 2".
    // Nếu ai đó "dọn" bằng split('-') thì mất chữ — ghim lại để không ai làm thế.
    expect(formatCodeNameLabel('SA-2026-002091', 'Bảng hàng - Dự án Đầm Sen 2')).toBe(
      'SA-2026-002091 - Bảng hàng - Dự án Đầm Sen 2'
    )
  })

  it('chỉ có mã → in mã, KHÔNG kèm đuôi " - " treo', () => {
    expect(formatCodeNameLabel('SA-2026-002093', null)).toBe('SA-2026-002093')
    expect(formatCodeNameLabel('SA-2026-002093', '   ')).toBe('SA-2026-002093')
    expect(formatCodeNameLabel('SA-2026-002093', undefined)).toBe('SA-2026-002093')
  })

  it('chỉ có tên → in tên, không có dấu phân cách đứng trước', () => {
    expect(formatCodeNameLabel(null, 'Bảng hàng')).toBe('Bảng hàng')
    expect(formatCodeNameLabel('  ', 'Bảng hàng')).toBe('Bảng hàng')
  })

  it('rỗng cả hai → trả fallback (mặc định chuỗi rỗng)', () => {
    expect(formatCodeNameLabel(null, null)).toBe('')
    expect(formatCodeNameLabel(undefined, undefined, 'Thông tin bán hàng #12')).toBe(
      'Thông tin bán hàng #12'
    )
  })

  it('cắt khoảng trắng thừa hai đầu của từng vế', () => {
    expect(formatCodeNameLabel('  SA-1  ', '  Tên  ')).toBe('SA-1 - Tên')
  })
})
