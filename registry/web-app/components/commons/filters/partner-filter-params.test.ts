import { describe, expect, it } from 'vitest'

import {
  countPartnerFilters,
  parsePartnerFiltersFromUrl,
  serializePartnerFiltersToUrl,
} from './partner-filter-params'
import { buildApiParamsFromUrl as buildInvestorApiParams } from '@/pages/authenticated/investor/InvestorManagementPage'
import { buildApiParamsFromUrl as buildExchangeApiParams } from '@/pages/authenticated/exchange/ExchangeManagementPage'

describe('parsePartnerFiltersFromUrl', () => {
  it('reads is_active as a single-element array so the checkbox group can render it', () => {
    expect(parsePartnerFiltersFromUrl(new URLSearchParams('is_active=true')).is_active).toEqual([
      'true',
    ])
    expect(parsePartnerFiltersFromUrl(new URLSearchParams('is_active=false')).is_active).toEqual([
      'false',
    ])
  })

  it('ignores an is_active value that is neither true nor false', () => {
    expect(parsePartnerFiltersFromUrl(new URLSearchParams('is_active=')).is_active).toBeUndefined()
    expect(parsePartnerFiltersFromUrl(new URLSearchParams('is_active=1')).is_active).toBeUndefined()
    expect(
      parsePartnerFiltersFromUrl(new URLSearchParams('is_active=yes')).is_active
    ).toBeUndefined()
  })

  it('reads established_month inside 1-12 as a Date MonthPicker can render', () => {
    expect(
      parsePartnerFiltersFromUrl(
        new URLSearchParams('established_month=1')
      ).established_month?.getMonth()
    ).toBe(0)
    expect(
      parsePartnerFiltersFromUrl(
        new URLSearchParams('established_month=12')
      ).established_month?.getMonth()
    ).toBe(11)
  })

  it('drops an established_month outside 1-12 instead of passing it through', () => {
    for (const raw of ['0', '13', '99', '-3', 'abc', '']) {
      expect(
        parsePartnerFiltersFromUrl(new URLSearchParams(`established_month=${raw}`))
          .established_month
      ).toBeUndefined()
    }
  })

  it('reads established_day inside 1-31', () => {
    expect(
      parsePartnerFiltersFromUrl(new URLSearchParams('established_day=1')).established_day
    ).toBe('1')
    expect(
      parsePartnerFiltersFromUrl(new URLSearchParams('established_day=31')).established_day
    ).toBe('31')
  })

  it('drops an established_day outside 1-31 instead of passing it through', () => {
    for (const raw of ['0', '32', '99', '-3', 'abc', '']) {
      expect(
        parsePartnerFiltersFromUrl(new URLSearchParams(`established_day=${raw}`)).established_day
      ).toBeUndefined()
    }
  })

  it('reads the dashboard partner-birthday deep link as a fully populated filter', () => {
    // Tile "sinh nhật đối tác" (CR STT27) điều hướng sang đúng hai tham số này — dialog lọc phải
    // mở ra thấy sẵn chúng, nếu không người dùng tưởng danh sách chưa bị lọc.
    const parsed = parsePartnerFiltersFromUrl(
      new URLSearchParams('established_month=8&is_active=true')
    )
    expect(parsed.is_active).toEqual(['true'])
    expect(parsed.established_month?.getMonth()).toBe(7)
  })
})

describe('countPartnerFilters', () => {
  it('counts nothing when the form is empty', () => {
    expect(countPartnerFilters({})).toBe(0)
    expect(countPartnerFilters({ is_active: [] })).toBe(0)
  })

  it('counts one active filter per populated field', () => {
    expect(countPartnerFilters({ is_active: ['true'] })).toBe(1)
    expect(countPartnerFilters({ established_month: new Date(2026, 4, 1) })).toBe(1)
    expect(
      countPartnerFilters({ is_active: ['false'], established_month: new Date(2026, 4, 1) })
    ).toBe(2)
    expect(countPartnerFilters({ established_day: '9' })).toBe(1)
    expect(
      countPartnerFilters({
        is_active: ['true'],
        established_month: new Date(2026, 4, 1),
        established_day: '9',
      })
    ).toBe(3)
  })

  it('does not count both statuses ticked — that narrows nothing', () => {
    expect(countPartnerFilters({ is_active: ['true', 'false'] })).toBe(0)
  })
})

describe('serializePartnerFiltersToUrl', () => {
  const base = new URLSearchParams('page=4&page_size=50&search=abc&ordering=-created_at')

  it('keeps search, ordering and page_size but sends the reader back to page 1', () => {
    const next = serializePartnerFiltersToUrl({ is_active: ['true'] }, base)
    expect(next.get('page')).toBe('1')
    expect(next.get('page_size')).toBe('50')
    expect(next.get('search')).toBe('abc')
    expect(next.get('ordering')).toBe('-created_at')
  })

  it('writes only the fields that actually narrow the list', () => {
    expect(serializePartnerFiltersToUrl({ is_active: ['false'] }, base).get('is_active')).toBe(
      'false'
    )
    expect(
      serializePartnerFiltersToUrl({ is_active: ['true', 'false'] }, base).get('is_active')
    ).toBeNull()
    expect(serializePartnerFiltersToUrl({ is_active: [] }, base).get('is_active')).toBeNull()
    expect(
      serializePartnerFiltersToUrl({ established_month: new Date(2026, 6, 1) }, base).get(
        'established_month'
      )
    ).toBe('7')
  })

  it('writes established_day and keeps it independent of the month', () => {
    // Ngày đứng một mình phải đi được lên URL: BE lọc ngày đó ở mọi tháng.
    expect(
      serializePartnerFiltersToUrl({ established_day: '9' }, base).get('established_day')
    ).toBe('9')
    const both = serializePartnerFiltersToUrl(
      { established_month: new Date(2026, 2, 1), established_day: '9' },
      base
    )
    expect(both.get('established_month')).toBe('3')
    expect(both.get('established_day')).toBe('9')
  })

  it('drops an out-of-range day rather than writing junk to the URL', () => {
    for (const raw of ['0', '32', 'abc', '']) {
      expect(
        serializePartnerFiltersToUrl({ established_day: raw }, base).get('established_day')
      ).toBeNull()
    }
  })

  it('drops a filter that was just unticked instead of leaving it on the URL', () => {
    // Đây là ca dễ hỏng nhất: nếu serialize clone baseParams rồi chỉ `set`, điều kiện vừa gỡ vẫn
    // nằm nguyên trên URL và người dùng thấy bộ lọc "gỡ không ra".
    const withFilters = new URLSearchParams(
      'page=2&page_size=50&is_active=true&established_month=3&established_day=9'
    )
    const cleared = serializePartnerFiltersToUrl({}, withFilters)
    expect(cleared.get('is_active')).toBeNull()
    expect(cleared.get('established_month')).toBeNull()
    expect(cleared.get('established_day')).toBeNull()
  })

  it('falls back to the default page size when the URL carries an unsupported one', () => {
    const next = serializePartnerFiltersToUrl({}, new URLSearchParams('page_size=999'))
    expect(next.get('page_size')).not.toBe('999')
  })

  it('writes only the month — the year inside the picker Date is meaningless here', () => {
    // `MonthPicker showYear={false}` đóng cứng năm hiện tại vào Date nó phát ra. Nếu serialize
    // lỡ đọc cả năm thì bộ lọc thành "tháng 3 năm 1999" trong khi backend lọc mọi năm.
    expect(
      serializePartnerFiltersToUrl({ established_month: new Date(1999, 2, 1) }, base).get(
        'established_month'
      )
    ).toBe('3')
  })

  it('round-trips through parse without losing the month', () => {
    const values = {
      is_active: ['false'],
      established_month: new Date(2026, 10, 1),
      established_day: '9',
    }
    const parsed = parsePartnerFiltersFromUrl(serializePartnerFiltersToUrl(values, base))
    expect(parsed.is_active).toEqual(['false'])
    expect(parsed.established_month?.getMonth()).toBe(10)
    expect(parsed.established_day).toBe('9')
  })
})

describe('filter dialog reaches the list API', () => {
  // Dialog chỉ ghi vào URL; thứ biến URL thành tham số API là buildApiParamsFromUrl của từng
  // trang. Nối hai đầu lại ở đây, nếu không một bên đổi tên tham số là bộ lọc im lặng thành vô
  // tác dụng — bảng vẫn ra kết quả, chỉ là không lọc gì.
  const applied = serializePartnerFiltersToUrl(
    { is_active: ['false'], established_month: new Date(2026, 8, 1), established_day: '9' },
    new URLSearchParams('page_size=50&search=vinhomes')
  )

  it('turns the investor filter into investor API params', () => {
    const params = buildInvestorApiParams(applied)
    expect(params.is_active).toBe(false)
    expect(params.established_date__month).toBe(9)
    expect(params.established_date__day).toBe(9)
    expect(params.search).toBe('vinhomes')
    expect(params.page).toBe(1)
  })

  it('turns the exchange filter into exchange API params', () => {
    const params = buildExchangeApiParams(applied)
    expect(params.is_active).toBe(false)
    expect(params.established_date__month).toBe(9)
    expect(params.established_date__day).toBe(9)
    expect(params.search).toBe('vinhomes')
    expect(params.page).toBe(1)
  })
})
