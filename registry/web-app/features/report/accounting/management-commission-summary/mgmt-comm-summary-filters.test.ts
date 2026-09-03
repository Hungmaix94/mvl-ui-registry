import { describe, expect, test } from 'vitest'
import { MonthlySummaryStatus } from '@/constants/api-schema-aliases'
import {
  MGMT_COMM_SUMMARY_FILTER_PARAMS,
  MGMT_COMM_SUMMARY_SEARCH_PARAM,
  buildMgmtCommSummaryApiParams,
  buildMgmtCommSummaryFilterParams,
  buildMgmtCommSummarySearchParams,
  countMgmtCommSummaryFilters,
  parseMgmtCommSummaryFilters,
} from './mgmt-comm-summary-filters'

const urlOf = (query: string) => new URLSearchParams(query)

describe('buildMgmtCommSummaryApiParams', () => {
  test('đổi id trên URL thành số cho API', () => {
    const params = buildMgmtCommSummaryApiParams(
      urlOf('branch=1&block=2&department=3&position=4&status__in=DRAFT')
    )

    expect(params).toEqual({
      branch: 1,
      block: 2,
      department: 3,
      position: 4,
      status__in: [MonthlySummaryStatus.DRAFT],
      search: undefined,
    })
  })

  test('tick nhiều trạng thái thì gửi cả danh sách', () => {
    const params = buildMgmtCommSummaryApiParams(urlOf('status__in=DRAFT,PAID'))

    expect(params.status__in).toEqual([MonthlySummaryStatus.DRAFT, MonthlySummaryStatus.PAID])
  })

  test('ô tìm kiếm nằm ở `q` trên URL nhưng gửi lên API là `search`', () => {
    // Đây là chỗ dễ sai nhất của màn: hai tên khác nhau cho cùng một thứ. Gửi nhầm `q` lên BE
    // thì DRF bỏ qua và danh sách KHÔNG thu hẹp — không có lỗi nào nổi lên.
    const params = buildMgmtCommSummaryApiParams(urlOf(`${MGMT_COMM_SUMMARY_SEARCH_PARAM}=NV001`))

    expect(params.search).toBe('NV001')
    expect(MGMT_COMM_SUMMARY_SEARCH_PARAM).toBe('q')
  })

  test('bỏ id không phải số dương thay vì gửi NaN lên API', () => {
    // `?department=abc` thả qua `Number()` thành `NaN`, đi vào query string là `department=NaN`
    // và BE trả 400 cho cả trang — vì một chữ gõ sai trên thanh địa chỉ.
    const params = buildMgmtCommSummaryApiParams(urlOf('branch=abc&block=0&department=-3'))

    expect(params.branch).toBeUndefined()
    expect(params.block).toBeUndefined()
    expect(params.department).toBeUndefined()
  })

  test('lọc bỏ giá trị trạng thái không nằm trong enum của BE', () => {
    // `status__in=DRAFT,bogus` gửi nguyên lên sẽ ăn 400 và cả bảng trắng — trong khi thứ sai
    // chỉ là một chữ trên thanh địa chỉ. Giữ lại phần hợp lệ.
    expect(buildMgmtCommSummaryApiParams(urlOf('status__in=DRAFT,bogus')).status__in).toEqual([
      MonthlySummaryStatus.DRAFT,
    ])
    expect(buildMgmtCommSummaryApiParams(urlOf('status__in=bogus')).status__in).toBeUndefined()
    // Tiền đề: giá trị HỢP LỆ phải đi qua được, không thì phép thử trên đúng một cách vô nghĩa.
    expect(buildMgmtCommSummaryApiParams(urlOf('status__in=PAID')).status__in).toEqual([
      MonthlySummaryStatus.PAID,
    ])
  })

  test('URL rỗng thì không gửi tham số lọc nào', () => {
    const params = buildMgmtCommSummaryApiParams(urlOf('year=2026&month=8&page=1'))

    expect(Object.values(params).every((value) => value === undefined)).toBe(true)
  })
})

describe('buildMgmtCommSummaryFilterParams', () => {
  test('ghi giá trị đã chọn và luôn quay về trang 1', () => {
    const next = buildMgmtCommSummaryFilterParams(urlOf('year=2026&month=8&page=5'), {
      branch: '1',
      department: '3',
    })

    expect(next.get('branch')).toBe('1')
    expect(next.get('department')).toBe('3')
    expect(next.get('page')).toBe('1')
    // Kỳ là trục toolbar, bộ lọc không được đụng vào.
    expect(next.get('year')).toBe('2026')
    expect(next.get('month')).toBe('8')
  })

  test('field bỏ trống thì XOÁ param, không ghi chuỗi rỗng', () => {
    // Để lại `department=` thì danh sách vẫn bị lọc về rỗng trong khi dialog hiện ô đó trắng —
    // người dùng không có gì để nhìn ra nguyên nhân.
    const next = buildMgmtCommSummaryFilterParams(urlOf('branch=1&block=2&department=3'), {
      branch: '1',
      block: undefined,
      department: '',
    })

    expect(next.get('branch')).toBe('1')
    expect(next.has('block')).toBe(false)
    expect(next.has('department')).toBe(false)
  })

  test('không tick trạng thái nào thì XOÁ param, không ghi `status__in=`', () => {
    // `String([])` ra chuỗi rỗng: ghi lên URL thành `status__in=` là BE lọc theo danh sách rỗng
    // ⇒ bảng trắng trong khi dialog không tick ô nào. Mảng rỗng phải xoá hẳn param.
    const next = buildMgmtCommSummaryFilterParams(urlOf('status__in=DRAFT'), { status__in: [] })

    expect(next.has('status__in')).toBe(false)
  })

  test('tick nhiều trạng thái thì nối bằng dấu phẩy', () => {
    const next = buildMgmtCommSummaryFilterParams(urlOf(''), {
      status__in: ['DRAFT', 'CONFIRMED'],
    })

    expect(next.get('status__in')).toBe('DRAFT,CONFIRMED')
  })

  test('không đụng tới ô tìm kiếm đang bật', () => {
    const next = buildMgmtCommSummaryFilterParams(urlOf('q=NV001&branch=9'), { branch: '1' })

    expect(next.get('q')).toBe('NV001')
  })
})

describe('buildMgmtCommSummarySearchParams', () => {
  test('gõ từ khoá thì ghi `q` và về trang 1', () => {
    const next = buildMgmtCommSummarySearchParams(urlOf('page=4&branch=1'), 'Nguyen')

    expect(next.get('q')).toBe('Nguyen')
    expect(next.get('page')).toBe('1')
    // Xoá ô tìm kiếm không được xoá luôn bộ lọc đang bật.
    expect(next.get('branch')).toBe('1')
  })

  test('xoá trắng ô tìm kiếm thì bỏ hẳn param', () => {
    const next = buildMgmtCommSummarySearchParams(urlOf('q=Nguyen&page=4'), '')

    expect(next.has('q')).toBe(false)
  })
})

describe('countMgmtCommSummaryFilters', () => {
  test('đếm đúng số ô trong dialog đang bật', () => {
    expect(countMgmtCommSummaryFilters(urlOf('branch=1&status__in=DRAFT'))).toBe(2)
  })

  test('nhóm ô tick trạng thái đếm là MỘT bộ lọc dù tick mấy ô', () => {
    // Badge đếm số Ô TRONG DIALOG, và nhóm ô tick là một ô. Đếm theo số giá trị đã tick thì
    // badge nhảy 1→4 khi người dùng chỉ mở rộng đúng một tiêu chí.
    expect(countMgmtCommSummaryFilters(urlOf('status__in=DRAFT,CONFIRMED,PAID'))).toBe(1)
  })

  test('KHÔNG đếm kỳ và KHÔNG đếm ô tìm kiếm', () => {
    // Kỳ chọn ở toolbar, từ khoá có ô riêng nhìn thấy được — badge phải khớp đúng những gì
    // người dùng thấy khi mở dialog ra.
    expect(countMgmtCommSummaryFilters(urlOf('year=2026&month=8&page=1&q=Nguyen'))).toBe(0)
  })

  test('badge khớp với số param mà dialog thật sự ghi ra', () => {
    // Ghim hai danh sách vào nhau: một bộ lọc được-áp-nhưng-không-đếm sẽ lọt qua mọi test khác.
    const applied = buildMgmtCommSummaryFilterParams(urlOf(''), {
      branch: '1',
      block: '2',
      department: '3',
      position: '4',
      status__in: ['DRAFT'],
    })

    expect(countMgmtCommSummaryFilters(applied)).toBe(MGMT_COMM_SUMMARY_FILTER_PARAMS.length)
  })
})

describe('parseMgmtCommSummaryFilters', () => {
  test('seed lại dialog từ URL', () => {
    expect(parseMgmtCommSummaryFilters(urlOf('branch=1&position=4&status__in=PAID'))).toEqual({
      branch: '1',
      block: undefined,
      department: undefined,
      position: '4',
      status__in: ['PAID'],
    })
  })

  test('URL không có trạng thái thì form nhận MẢNG RỖNG, không phải undefined', () => {
    // `CheckboxGroupField` đọc `value ?? []`; trả `undefined` thì `reset()` của RHF không có gì
    // để ghi đè và nhóm ô tick giữ nguyên lựa chọn cũ sau khi "Xoá bộ lọc".
    expect(parseMgmtCommSummaryFilters(urlOf('branch=1')).status__in).toEqual([])
  })

  test('đi vòng URL → form → URL giữ nguyên giá trị', () => {
    const original = urlOf('branch=1&block=2&department=3&position=4&status__in=EMAIL_SENT,PAID')
    const roundTripped = buildMgmtCommSummaryFilterParams(
      urlOf(''),
      parseMgmtCommSummaryFilters(original)
    )

    MGMT_COMM_SUMMARY_FILTER_PARAMS.forEach((key) => {
      expect(roundTripped.get(key)).toBe(original.get(key))
    })
  })
})
