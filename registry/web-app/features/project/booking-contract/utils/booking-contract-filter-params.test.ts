import { describe, it, expect } from 'vitest'
import {
  BOOKING_CONTRACT_FILTER_KEYS,
  BOOKING_CONTRACT_MULTI_FILTERS,
  STALE_URL_KEYS,
  buildBookingContractApiParams,
  buildBookingContractFilterParams,
  buildBookingContractFilterValuesFromUrl,
  countActiveBookingContractFilters,
} from './booking-contract-filter-params'
import type { BookingContractFilterFormData } from '../components/BookingContractFilterForm'

/**
 * Bug 86eyqj0hf: ô "Tên khách hàng" (và "Mã phiếu đặt cọc") của dialog Bộ lọc không có tác dụng —
 * `handleApplyFilter` liệt kê tay từng `set()` và bỏ sót hai ô này từ ngày chúng được thêm vào form
 * (13/05/2026). Bộ test dưới đây canh cả hai mặt: từng ô phải lên URL, và **mọi** ô khai trong
 * `BOOKING_CONTRACT_FILTER_KEYS` đều phải lên URL — vế thứ hai mới là cái bắt được lần rơi tiếp theo.
 */

/** Một giá trị hợp lệ cho mỗi ô đơn trị, khác nhau từng cái để không ô nào che ô nào. */
const VALUE_BY_KEY: Record<(typeof BOOKING_CONTRACT_FILTER_KEYS)[number], string | number> = {
  search: 'BK-202608',
  project: 12,
  investor: 34,
  customer: 190,
  booking_date_from: '2026-08-01',
  booking_date_to: '2026-08-31',
}

const fullFormData = (): BookingContractFilterFormData => ({
  ...(Object.fromEntries(
    BOOKING_CONTRACT_FILTER_KEYS.map((key) => [key, VALUE_BY_KEY[key]])
  ) as BookingContractFilterFormData),
  booking_status__in: ['booked', 'refunded'],
  approval_status__in: ['approved'],
})

describe('buildBookingContractFilterParams', () => {
  it('đưa MỌI ô đơn trị của dialog lên URL — không ô nào được rơi im lặng', () => {
    const params = buildBookingContractFilterParams(fullFormData())

    // Vế quyết định: quét theo danh sách khai báo, nên ô mới thêm mà quên nối dây là đỏ ngay.
    for (const key of BOOKING_CONTRACT_FILTER_KEYS) {
      expect(params.get(key), `ô "${key}" không lên tới URL`).toBe(String(VALUE_BY_KEY[key]))
    }
  })

  it('đưa MỌI ô chọn-nhiều lên URL dưới dạng `a,b`', () => {
    const params = buildBookingContractFilterParams(fullFormData())

    expect(params.get('booking_status__in')).toBe('booked,refunded')
    expect(params.get('approval_status__in')).toBe('approved')
  })

  it('đưa khách hàng đã chọn lên URL bằng id', () => {
    const params = buildBookingContractFilterParams({ customer: 190 })

    expect(params.get('customer')).toBe('190')
  })

  it('luôn quay về trang 1 khi đổi bộ lọc', () => {
    expect(buildBookingContractFilterParams({ customer: 190 }).get('page')).toBe('1')
  })

  it('bỏ qua ô để trống, không ghi tham số rỗng lên URL', () => {
    const params = buildBookingContractFilterParams({
      customer: undefined,
      search: '   ',
      project: 12,
      booking_status__in: [],
    })

    expect(params.has('customer')).toBe(false)
    expect(params.has('search')).toBe(false)
    expect(params.has('booking_status__in')).toBe(false)
    expect(params.get('project')).toBe('12')
  })

  it('luôn dọn dạng đơn trị cũ để không lọc hai lần cùng một cột', () => {
    const params = buildBookingContractFilterParams({ booking_status__in: ['booked'] })

    expect(params.get('booking_status__in')).toBe('booked')
    expect(params.has('booking_status')).toBe(false)
    expect(params.has('approval_status')).toBe(false)
  })

  it('không mang theo tham số lạ ngoài page + các ô của dialog', () => {
    const params = buildBookingContractFilterParams({ customer: 190 })

    expect([...params.keys()].sort()).toEqual(['customer', 'page'])
  })
})

describe('buildBookingContractFilterValuesFromUrl', () => {
  it('đọc ô chọn-nhiều từ chuỗi `a,b` thành mảng', () => {
    const values = buildBookingContractFilterValuesFromUrl(
      new URLSearchParams('booking_status__in=booked,refunded')
    )

    expect(values.booking_status__in).toEqual(['booked', 'refunded'])
  })

  it('nhận link CŨ một giá trị (`booking_status=booked`) để bookmark không gãy', () => {
    const values = buildBookingContractFilterValuesFromUrl(
      new URLSearchParams('booking_status=booked&approval_status=approved')
    )

    expect(values.booking_status__in).toEqual(['booked'])
    expect(values.approval_status__in).toEqual(['approved'])
  })

  it('dạng `__in` thắng khi URL có cả hai', () => {
    const values = buildBookingContractFilterValuesFromUrl(
      new URLSearchParams('booking_status=booked&booking_status__in=refunded')
    )

    expect(values.booking_status__in).toEqual(['refunded'])
  })

  it('bỏ dấu phẩy thừa và giá trị trùng', () => {
    const values = buildBookingContractFilterValuesFromUrl(
      new URLSearchParams('booking_status__in=booked,,booked,refunded')
    )

    expect(values.booking_status__in).toEqual(['booked', 'refunded'])
  })

  it('id sai định dạng không được biến thành NaN rồi bay lên API', () => {
    const values = buildBookingContractFilterValuesFromUrl(new URLSearchParams('project=abc'))

    expect(values.project).toBeUndefined()
  })

  it('giữ deep-link `awaiting_me` của dashboard', () => {
    const values = buildBookingContractFilterValuesFromUrl(new URLSearchParams('awaiting_me=true'))

    expect(values.awaiting_me).toBe(true)
  })
})

describe('buildBookingContractApiParams', () => {
  it('nối mảng thành `a,b` — BaseInFilter đọc chuỗi, không đọc tham số lặp', () => {
    const params = buildBookingContractApiParams({
      booking_status__in: ['booked', 'refunded'],
      approval_status__in: ['approved'],
    })

    expect(params.booking_status__in).toBe('booked,refunded')
    expect(params.approval_status__in).toBe('approved')
  })

  it('không gửi kèm dạng đơn trị (đã gộp vào mảng lúc đọc URL)', () => {
    const values = buildBookingContractFilterValuesFromUrl(
      new URLSearchParams('booking_status=booked')
    )
    const params = buildBookingContractApiParams(values)

    expect(params.booking_status__in).toBe('booked')
    expect(params.booking_status).toBeUndefined()
  })

  it('bỏ hẳn ô rỗng, không gửi tham số rỗng lên API', () => {
    const params = buildBookingContractApiParams({
      customer: undefined,
      project: 12,
      booking_status__in: [],
    })

    expect(params.customer).toBeUndefined()
    expect(params.booking_status__in).toBeUndefined()
    expect(params.project).toBe(12)
  })
})

describe('countActiveBookingContractFilters', () => {
  it('đếm ô khách hàng', () => {
    expect(countActiveBookingContractFilters({ customer: 190 })).toBe(1)
    expect(countActiveBookingContractFilters({ customer: 190, project: 12 })).toBe(2)
  })

  it('một nhóm ô tick tính đúng MỘT bộ lọc dù tick nhiều giá trị', () => {
    expect(countActiveBookingContractFilters({ booking_status__in: ['booked', 'refunded'] })).toBe(
      1
    )
    expect(
      countActiveBookingContractFilters({
        booking_status__in: ['booked'],
        approval_status__in: ['approved'],
      })
    ).toBe(2)
  })

  it('nhóm ô tick rỗng không tính', () => {
    expect(
      countActiveBookingContractFilters({ booking_status__in: [], approval_status__in: [] })
    ).toBe(0)
  })

  it('không đếm ô tìm kiếm — nó nằm ngoài dialog, có ô riêng trên toolbar', () => {
    expect(countActiveBookingContractFilters({ search: 'BK-2026' })).toBe(0)
  })

  it('một khoảng ngày tính đúng MỘT bộ lọc, bằng số ô người dùng nhìn thấy', () => {
    expect(
      countActiveBookingContractFilters({
        booking_date_from: '2026-08-01',
        booking_date_to: '2026-08-31',
      })
    ).toBe(1)
    expect(countActiveBookingContractFilters({ booking_date_from: '2026-08-01' })).toBe(1)
  })

  it('đếm đủ khi bật hết các ô lọc', () => {
    // 6 ô đơn trị − `search` − 1 (hai đầu khoảng ngày gộp một) = 4, cộng 2 nhóm ô tick = 6
    expect(countActiveBookingContractFilters(fullFormData())).toBe(6)
  })

  it('không bộ lọc nào bật thì badge bằng 0', () => {
    expect(countActiveBookingContractFilters({})).toBe(0)
    expect(countActiveBookingContractFilters({ customer: undefined, project: undefined })).toBe(0)
  })
})

describe('ô đã bỏ khỏi dialog (STALE_URL_KEYS)', () => {
  it('không gửi lên API — link cũ không được lọc ngầm', () => {
    // Bookmark cũ từ thời còn ô gõ tay. Dialog nay không còn ô nào tắt được hai điều kiện này,
    // nên nếu vẫn gửi thì người dùng thấy danh sách bị lọc mà không hiểu vì sao.
    const values = buildBookingContractFilterValuesFromUrl(
      new URLSearchParams('customer_name=Thiên Minh&contract_number=2026-963427&project=12')
    )
    const params = buildBookingContractApiParams(values)

    for (const key of STALE_URL_KEYS) {
      expect(params[key], `\`${key}\` vẫn bị gửi lên API`).toBeUndefined()
    }
    expect(params.project).toBe(12)
  })

  it('bị dọn khỏi URL khi bấm Áp dụng', () => {
    const params = buildBookingContractFilterParams({ customer: 190 })

    for (const key of STALE_URL_KEYS) {
      expect(params.has(key), `\`${key}\` vẫn còn trên URL`).toBe(false)
    }
  })

  it('không đếm vào badge', () => {
    const values = buildBookingContractFilterValuesFromUrl(
      new URLSearchParams('customer_name=Thiên Minh&contract_number=2026-1')
    )

    expect(countActiveBookingContractFilters(values)).toBe(0)
  })
})

describe('hằng khai báo', () => {
  it('mỗi ô chọn-nhiều có đúng một tham số đơn trị cũ đi kèm', () => {
    expect(BOOKING_CONTRACT_MULTI_FILTERS.map((f) => f.formKey)).toEqual([
      'booking_status__in',
      'approval_status__in',
    ])
    expect(BOOKING_CONTRACT_MULTI_FILTERS.map((f) => f.legacyParam)).toEqual([
      'booking_status',
      'approval_status',
    ])
  })
})
