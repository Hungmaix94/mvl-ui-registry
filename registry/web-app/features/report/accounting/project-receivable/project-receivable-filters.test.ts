import { describe, it, expect } from 'vitest'
import {
  buildProjectReceivableFilterParams,
  countActiveProjectReceivableFilters,
  parseProjectReceivableFilters,
} from './project-receivable-filters'

describe('parseProjectReceivableFilters', () => {
  it('đọc id dự án hợp lệ thành số', () => {
    expect(parseProjectReceivableFilters(new URLSearchParams('project=196'))).toEqual({
      project: 196,
      hasDebt: true,
    })
  })

  it('trả null khi không có param', () => {
    expect(parseProjectReceivableFilters(new URLSearchParams('year=2026&month=8'))).toEqual({
      project: null,
      hasDebt: true,
    })
  })

  it.each(['project=abc', 'project=', 'project=0', 'project=-5', 'project=1.5'])(
    'loại giá trị không phải id dương: %s',
    (query) => {
      // Thả thẳng qua `Number()` sẽ ra `NaN`/`0`/số âm rồi đi vào query string gửi BE.
      expect(parseProjectReceivableFilters(new URLSearchParams(query)).project).toBeNull()
    }
  )

  it('mặc định BẬT "công nợ > 0" khi URL không nói gì — SRS 20.16 §2.2', () => {
    expect(parseProjectReceivableFilters(new URLSearchParams('year=2026&month=8')).hasDebt).toBe(
      true
    )
  })

  it.each(['has_debt=0', 'has_debt=false'])('tắt lọc khi URL ghi %s', (query) => {
    // `false` là dạng request gửi lên BE — URL chép từ tab Network phải hiểu đúng,
    // không được âm thầm bật lọc lên.
    expect(parseProjectReceivableFilters(new URLSearchParams(query)).hasDebt).toBe(false)
  })

  it.each(['has_debt=1', 'has_debt=true', 'has_debt=xyz', 'has_debt='])(
    'giá trị %s vẫn về mặc định BẬT',
    (query) => {
      expect(parseProjectReceivableFilters(new URLSearchParams(query)).hasDebt).toBe(true)
    }
  )

  it.each(['has_debt=False', 'has_debt=FALSE', 'has_debt= false '])(
    'tắt lọc bất kể hoa thường hay khoảng trắng: %s',
    (query) => {
      // BE `.strip().lower()` trước khi so, nên `?has_debt=False` mà FE đọc thành BẬT là màn
      // hình hiện ngược hẳn ý người gõ URL.
      expect(parseProjectReceivableFilters(new URLSearchParams(query)).hasDebt).toBe(false)
    }
  )
})

describe('buildProjectReceivableFilterParams', () => {
  it('ghi project và giữ nguyên kỳ đang xem', () => {
    const next = buildProjectReceivableFilterParams(
      new URLSearchParams('year=2026&month=8&page_size=25'),
      { project: 196, hasDebt: true }
    )

    expect(next.get('project')).toBe('196')
    expect(next.get('year')).toBe('2026')
    expect(next.get('month')).toBe('8')
    expect(next.get('page_size')).toBe('25')
  })

  it('gỡ hẳn project khi bỏ chọn, không để lại chuỗi rỗng', () => {
    const next = buildProjectReceivableFilterParams(
      new URLSearchParams('year=2026&month=8&project=196'),
      { project: null, hasDebt: true }
    )

    expect(next.has('project')).toBe(false)
  })

  it('luôn đưa về trang 1 — bảng phân trang client-side nên trang cũ sẽ rỗng sau khi lọc', () => {
    const next = buildProjectReceivableFilterParams(new URLSearchParams('page=3'), {
      project: 196,
      hasDebt: true,
    })

    expect(next.get('page')).toBe('1')
  })

  it('không mutate params đang truyền vào', () => {
    const current = new URLSearchParams('page=3&year=2026')
    buildProjectReceivableFilterParams(current, { project: 196, hasDebt: true })

    expect(current.get('page')).toBe('3')
    expect(current.has('project')).toBe(false)
  })

  it('ghi has_debt=true khi đang BẬT — trạng thái phải đọc được thẳng trên URL', () => {
    const next = buildProjectReceivableFilterParams(new URLSearchParams('year=2026'), {
      project: null,
      hasDebt: true,
    })

    expect(next.get('has_debt')).toBe('true')
  })

  it('ghi has_debt=false khi bỏ tick', () => {
    const next = buildProjectReceivableFilterParams(new URLSearchParams('year=2026'), {
      project: null,
      hasDebt: false,
    })

    expect(next.get('has_debt')).toBe('false')
  })

  it('dùng đúng hai giá trị BE nhận, không dùng 0/1 — URL và tab Network khớp nhau', () => {
    const on = buildProjectReceivableFilterParams(new URLSearchParams(), {
      project: null,
      hasDebt: true,
    })
    const off = buildProjectReceivableFilterParams(new URLSearchParams(), {
      project: null,
      hasDebt: false,
    })

    expect([on.get('has_debt'), off.get('has_debt')]).toEqual(['true', 'false'])
  })

  it('tick lại thì ghi đè has_debt=0 cũ thành true, không để lại giá trị mâu thuẫn', () => {
    const next = buildProjectReceivableFilterParams(new URLSearchParams('has_debt=0&year=2026'), {
      project: null,
      hasDebt: true,
    })

    expect(next.get('has_debt')).toBe('true')
  })
})

describe('countActiveProjectReceivableFilters', () => {
  it('đếm cả dự án lẫn "công nợ > 0" khi cùng bật', () => {
    expect(countActiveProjectReceivableFilters(new URLSearchParams('project=196'))).toBe(2)
  })

  it('KHÔNG tính kỳ tháng — kỳ chọn ở chip trên toolbar, không nằm trong dialog', () => {
    expect(
      countActiveProjectReceivableFilters(
        new URLSearchParams('year=2026&month=8&page=1&has_debt=0')
      )
    ).toBe(0)
  })

  it('không tính project rác thành một tiêu chí', () => {
    expect(countActiveProjectReceivableFilters(new URLSearchParams('project=abc&has_debt=0'))).toBe(
      0
    )
  })

  it('mở màn đã là 1 vì "công nợ > 0" bật sẵn và đang thật sự cắt bớt dòng', () => {
    expect(countActiveProjectReceivableFilters(new URLSearchParams('year=2026&month=8'))).toBe(1)
  })

  it('bỏ tick "công nợ > 0" thì thôi không đếm nữa', () => {
    expect(countActiveProjectReceivableFilters(new URLSearchParams('has_debt=0'))).toBe(0)
  })
})
