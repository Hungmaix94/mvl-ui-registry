import { describe, it, expect } from 'vitest'
import {
  applyDepartmentMonthlyKpiFilters,
  countDepartmentMonthlyKpiFilters,
  findInvertedDepartmentMonthlyKpiRanges,
  parseRangeBound,
  readDepartmentMonthlyKpiFilters,
  readDepartmentMonthlyKpiFormValues,
  readDepartmentMonthlyKpiSimpleParams,
} from './department-monthly-kpi-filters'
import type { DepartmentMonthlyKpiFilterValues } from '../schemas/department-monthly-kpi-schemas'

const EMPTY_FORM: DepartmentMonthlyKpiFilterValues = {
  branch: null,
  block: null,
  department: null,
  status: null,
  has_revenue: null,
  is_computed: null,
  only_departments_with_employees: false,
  only_departments_with_deals: false,
  completion_pct_min: null,
  completion_pct_max: null,
  leader_pct_min: null,
  leader_pct_max: null,
  leader_amount_min: null,
  leader_amount_max: null,
  director_pct_min: null,
  director_pct_max: null,
  director_amount_min: null,
  director_amount_max: null,
  ceo_pct_min: null,
  ceo_pct_max: null,
  ceo_amount_min: null,
  ceo_amount_max: null,
}

describe('parseRangeBound', () => {
  it('bỏ qua ô để trống', () => {
    expect(parseRangeBound('')).toBeUndefined()
    expect(parseRangeBound(null)).toBeUndefined()
    expect(parseRangeBound(undefined)).toBeUndefined()
    expect(parseRangeBound('   ')).toBeUndefined()
  })

  it('bỏ qua chuỗi không phải số thay vì gửi NaN lên API', () => {
    // NaN lọt xuống query param sẽ khiến mọi dòng biến mất mà người dùng không hiểu vì sao.
    expect(parseRangeBound('abc')).toBeUndefined()
    expect(parseRangeBound('-')).toBeUndefined()
  })

  it('giữ số 0 — "từ 0" là một điều kiện thật, không phải ô trống', () => {
    expect(parseRangeBound('0')).toBe(0)
    expect(parseRangeBound(0)).toBe(0)
  })

  it('nhận cả chuỗi lẫn số, kể cả phần thập phân', () => {
    expect(parseRangeBound('2.5')).toBe(2.5)
    expect(parseRangeBound(' 4 ')).toBe(4)
    expect(parseRangeBound(5000000)).toBe(5000000)
  })
})

describe('readDepartmentMonthlyKpiFilters', () => {
  it('chỉ bật cờ khi URL ghi đúng "true"', () => {
    const on = readDepartmentMonthlyKpiFilters(
      new URLSearchParams('has_employees=true&has_deals=true')
    )
    expect(on).toEqual({ has_employees: true, has_deals: true })

    const off = readDepartmentMonthlyKpiFilters(
      new URLSearchParams('has_employees=false&has_deals=')
    )
    expect(off).toEqual({})
  })

  it('không gửi cờ nào khi URL không có — mặc định là hiện đủ mọi phòng', () => {
    expect(readDepartmentMonthlyKpiFilters(new URLSearchParams('year=2026&month=7'))).toEqual({})
  })

  it('đọc đủ 14 mốc khoảng thành số', () => {
    const params = readDepartmentMonthlyKpiFilters(
      new URLSearchParams(
        'completion_pct_min=50&completion_pct_max=100' +
          '&leader_pct_min=4&leader_amount_max=8000000' +
          '&director_pct_min=1&director_amount_min=100000' +
          '&ceo_pct_max=2&ceo_amount_min=0'
      )
    )

    expect(params).toEqual({
      completion_pct_min: 50,
      completion_pct_max: 100,
      leader_pct_min: 4,
      leader_amount_max: 8000000,
      director_pct_min: 1,
      director_amount_min: 100000,
      ceo_pct_max: 2,
      ceo_amount_min: 0,
    })
  })

  it('loại mốc rác khỏi query', () => {
    expect(readDepartmentMonthlyKpiFilters(new URLSearchParams('leader_amount_min=abc'))).toEqual(
      {}
    )
  })
})

describe('readDepartmentMonthlyKpiFormValues', () => {
  it('gieo lại đúng những gì đang lọc khi mở lại hộp thoại', () => {
    const values = readDepartmentMonthlyKpiFormValues(
      new URLSearchParams('has_deals=true&leader_amount_min=5000000')
    )

    expect(values.only_departments_with_deals).toBe(true)
    expect(values.only_departments_with_employees).toBe(false)
    expect(values.leader_amount_min).toBe('5000000')
    expect(values.leader_amount_max).toBeNull()
  })
})

describe('applyDepartmentMonthlyKpiFilters', () => {
  it('ghi cờ đã tích và bỏ cờ đã bỏ tích', () => {
    const next = applyDepartmentMonthlyKpiFilters(new URLSearchParams('has_employees=true'), {
      ...EMPTY_FORM,
      only_departments_with_deals: true,
    })

    expect(next.get('has_deals')).toBe('true')
    expect(next.has('has_employees')).toBe(false)
  })

  it('xoá mốc mà người dùng vừa xoá trắng', () => {
    // Giữ lại mốc cũ là badge đếm một bộ lọc mà hộp thoại không còn hiển thị.
    const next = applyDepartmentMonthlyKpiFilters(
      new URLSearchParams('leader_amount_min=5000000&ceo_pct_max=2'),
      { ...EMPTY_FORM, ceo_pct_max: '2' }
    )

    expect(next.has('leader_amount_min')).toBe(false)
    expect(next.get('ceo_pct_max')).toBe('2')
  })

  it('nhận cả số từ CurrencyInput lẫn chuỗi từ ô số', () => {
    const next = applyDepartmentMonthlyKpiFilters(new URLSearchParams(), {
      ...EMPTY_FORM,
      leader_amount_min: 5000000,
      leader_pct_min: '4',
    })

    expect(next.get('leader_amount_min')).toBe('5000000')
    expect(next.get('leader_pct_min')).toBe('4')
  })

  it('giữ nguyên các tham số ngoài phạm vi hộp thoại', () => {
    const next = applyDepartmentMonthlyKpiFilters(
      new URLSearchParams('year=2026&month=7&page=3&search=abc'),
      EMPTY_FORM
    )

    expect(next.get('year')).toBe('2026')
    expect(next.get('month')).toBe('7')
    expect(next.get('search')).toBe('abc')
  })
})

describe('countDepartmentMonthlyKpiFilters', () => {
  it('không đếm kỳ, phân trang hay ô tìm kiếm', () => {
    expect(
      countDepartmentMonthlyKpiFilters(
        new URLSearchParams('year=2026&month=7&page=1&page_size=25&search=abc')
      )
    ).toBe(0)
  })

  it('đếm từng bộ lọc đang bật, kể cả mốc bằng 0', () => {
    expect(
      countDepartmentMonthlyKpiFilters(
        new URLSearchParams('branch=2&has_deals=true&leader_amount_min=0&completion_pct_max=100')
      )
    ).toBe(4)
  })

  it('không đếm tham số bị loại khi parse — badge phải khớp bộ lọc đang thực sự chạy', () => {
    expect(
      countDepartmentMonthlyKpiFilters(
        new URLSearchParams('has_deals=false&completion_pct_min=abc&leader_pct_max=')
      )
    ).toBe(0)
  })

  it('không đếm cả tham số đơn bị loại: branch=0, branch=abc, has_revenue rác', () => {
    // Link người khác gửi có `?branch=0&has_revenue=yes`: request bỏ cả hai, badge cũng phải bỏ,
    // không thì người nhận thấy badge "2" rồi mở dialog ra tìm mãi không thấy bộ lọc nào.
    expect(countDepartmentMonthlyKpiFilters(new URLSearchParams('branch=0'))).toBe(0)
    expect(countDepartmentMonthlyKpiFilters(new URLSearchParams('branch=abc'))).toBe(0)
    expect(countDepartmentMonthlyKpiFilters(new URLSearchParams('has_revenue=yes'))).toBe(0)
    expect(countDepartmentMonthlyKpiFilters(new URLSearchParams('block=-3&department=1.5'))).toBe(0)
  })

  it('vẫn đếm has_revenue=false — "Chưa có doanh số" là một bộ lọc thật', () => {
    expect(countDepartmentMonthlyKpiFilters(new URLSearchParams('has_revenue=false'))).toBe(1)
  })
})

describe('readDepartmentMonthlyKpiSimpleParams', () => {
  it('chỉ giữ id dương và cờ true/false', () => {
    expect(
      readDepartmentMonthlyKpiSimpleParams(
        new URLSearchParams('branch=2&block=0&department=abc&has_revenue=false&is_computed=yes')
      )
    ).toEqual({ branch: 2, has_revenue: false })
  })
})

describe('findInvertedDepartmentMonthlyKpiRanges', () => {
  it('không báo gì khi các khoảng hợp lệ, thiếu một đầu, hoặc hai đầu bằng nhau', () => {
    expect(
      findInvertedDepartmentMonthlyKpiRanges({
        ...EMPTY_FORM,
        completion_pct_min: '10',
        completion_pct_max: '90',
        leader_amount_min: '1000000',
        director_pct_max: '5',
        ceo_pct_min: '2',
        ceo_pct_max: '2',
      })
    ).toEqual([])
  })

  it('gọi tên đúng nhóm bị gõ ngược', () => {
    expect(
      findInvertedDepartmentMonthlyKpiRanges({
        ...EMPTY_FORM,
        director_amount_min: 10000000,
        director_amount_max: 1000000,
      })
    ).toEqual(['HH Quản lý Giám đốc – Thành tiền'])
  })

  it('gom mọi khoảng sai, không chỉ khoảng đầu tiên', () => {
    expect(
      findInvertedDepartmentMonthlyKpiRanges({
        ...EMPTY_FORM,
        completion_pct_min: '90',
        completion_pct_max: '10',
        ceo_pct_min: '5',
        ceo_pct_max: '1',
      })
    ).toEqual(['Tỷ lệ hoàn thành', 'HH Quản lý Tổng giám đốc – Tỷ lệ'])
  })

  it('bỏ qua giá trị rác thay vì báo sai — rác đã bị parser loại nên không phải khoảng ngược', () => {
    expect(
      findInvertedDepartmentMonthlyKpiRanges({
        ...EMPTY_FORM,
        leader_pct_min: '90',
        leader_pct_max: 'abc',
      })
    ).toEqual([])
  })
})
