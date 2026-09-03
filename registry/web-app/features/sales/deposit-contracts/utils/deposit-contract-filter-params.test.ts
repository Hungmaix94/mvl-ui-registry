import { describe, expect, it } from 'vitest'
import {
  applyFilterValuesToParams,
  buildApiParams,
  buildFilterValuesFromUrl,
  countActiveFilters,
} from './deposit-contract-filter-params'

const AUG_01 = new Date(2026, 7, 1)
const AUG_17 = new Date(2026, 7, 17)

describe('buildFilterValuesFromUrl', () => {
  it('gộp contract_date_from/to trên URL thành một đối tượng khoảng ngày', () => {
    const values = buildFilterValuesFromUrl(
      new URLSearchParams('contract_date_from=2026-08-01&contract_date_to=2026-08-17')
    )

    expect(values.contractDateRange).toEqual({ from: AUG_01, to: AUG_17 })
  })

  it('chấp nhận khoảng ngày hở một đầu', () => {
    const values = buildFilterValuesFromUrl(new URLSearchParams('contract_date_from=2026-08-01'))

    expect(values.contractDateRange).toEqual({ from: AUG_01, to: undefined })
  })

  it('trả null khi URL không có ngày nào', () => {
    expect(buildFilterValuesFromUrl(new URLSearchParams('page=1')).contractDateRange).toBeNull()
  })

  it('đọc customer thành số để Select nạp lại đúng khách hàng', () => {
    expect(buildFilterValuesFromUrl(new URLSearchParams('customer=190')).customer).toBe(190)
  })

  // URL là input người dùng sửa được. Trước đây `Number('abc')` = NaN và NaN được gửi thẳng lên API.
  it('bỏ qua id rác trên URL thay vì gửi NaN lên API', () => {
    const values = buildFilterValuesFromUrl(
      new URLSearchParams('customer=abc&project=0&investor=-5&block=1.5')
    )

    expect(values.customer).toBeNull()
    expect(values.project).toBeNull()
    expect(values.investor).toBeNull()
    expect(values.block).toBeUndefined()
  })

  it('giữ deep-link awaiting_me / pending từ dashboard', () => {
    const values = buildFilterValuesFromUrl(new URLSearchParams('awaiting_me=true&pending=true'))

    expect(values.awaiting_me).toBe(true)
    expect(values.pending).toBe(true)
  })
})

describe('buildApiParams', () => {
  it('dịch khoảng ngày của form thành cặp param API', () => {
    const params = buildApiParams({ contractDateRange: { from: AUG_01, to: AUG_17 } })

    expect(params.contract_date_from).toBe('2026-08-01')
    expect(params.contract_date_to).toBe('2026-08-17')
  })

  // `contractDateRange` là khái niệm của form; API không có param nào tên như vậy.
  it('không bao giờ gửi key riêng của form lên API', () => {
    const params = buildApiParams({ contractDateRange: { from: AUG_01, to: AUG_17 } })

    expect(params).not.toHaveProperty('contractDateRange')
  })

  // Form và URL giữ id tổ chức dạng CHUỖI (hợp đồng của OrgCascadeField), còn API khai là SỐ.
  it('đổi id chi nhánh/khối/phòng sang SỐ trước khi gọi API', () => {
    const params = buildApiParams({ branch: '5', block: '7', department: '9' })

    expect(params.branch).toBe(5)
    expect(params.block).toBe(7)
    expect(params.department).toBe(9)
  })

  it('vẫn bỏ qua id tổ chức rỗng thay vì gửi 0', () => {
    const params = buildApiParams({ branch: undefined, block: undefined })

    expect(params).not.toHaveProperty('branch')
    expect(params).not.toHaveProperty('block')
  })

  it('bỏ qua các bộ lọc rỗng', () => {
    const params = buildApiParams({
      status__in: [],
      customer: null,
      contractDateRange: null,
      approval_status__in: ['pending_manager'],
    })

    expect(params).toEqual({ approval_status__in: ['pending_manager'] })
  })
})

describe('applyFilterValuesToParams', () => {
  // Đây là ca DUY NHẤT lộ bug đã ghi ở docs/ai/conventions.md: chọn khoảng ngày mới thì
  // giá trị cũ bị ghi đè nên luôn xanh, chỉ thao tác XOÁ mới lộ ra param cũ còn nằm lại.
  it('xoá khoảng ngày thì XOÁ luôn cả hai param trên URL', () => {
    const previous = new URLSearchParams(
      'contract_date_from=2026-08-01&contract_date_to=2026-08-17&page=3'
    )

    const next = applyFilterValuesToParams(previous, { contractDateRange: null })

    expect(next.get('contract_date_from')).toBeNull()
    expect(next.get('contract_date_to')).toBeNull()
  })

  // `initialValues` dựng từ URL, nên form có thể còn ôm key thô. Vòng lặp chung mà ghi lại
  // chúng thì thao tác xoá ở trên vô hiệu.
  it('không ghi lại key ngày dạng thô lọt vào form từ URL', () => {
    const previous = new URLSearchParams('contract_date_from=2026-08-01')

    const next = applyFilterValuesToParams(previous, {
      contract_date_from: '2026-08-01',
      contract_date_to: '2026-08-17',
      contractDateRange: null,
    } as never)

    expect(next.get('contract_date_from')).toBeNull()
    expect(next.get('contract_date_to')).toBeNull()
  })

  it('ghi khoảng ngày mới chọn lên URL', () => {
    const next = applyFilterValuesToParams(new URLSearchParams(), {
      contractDateRange: { from: AUG_01, to: AUG_17 },
    })

    expect(next.get('contract_date_from')).toBe('2026-08-01')
    expect(next.get('contract_date_to')).toBe('2026-08-17')
  })

  it('ghi customer là id, không phải tên', () => {
    const next = applyFilterValuesToParams(new URLSearchParams(), { customer: 190 })

    expect(next.get('customer')).toBe('190')
  })

  it('xoá bộ lọc select thì xoá param tương ứng', () => {
    const previous = new URLSearchParams('approval_status__in=pending_manager&customer=190')

    const next = applyFilterValuesToParams(previous, { approval_status__in: [], customer: null })

    expect(next.get('approval_status__in')).toBeNull()
    expect(next.get('customer')).toBeNull()
  })

  // Bookmark cũ còn mang ô lọc đã bỏ — giữ lại là lọc ngầm mà dialog không có ô nào tắt được.
  it('dọn các param của ô lọc đã bỏ', () => {
    const previous = new URLSearchParams('contract_number=2026-940092&customer_name=Thi%C3%AAn')

    const next = applyFilterValuesToParams(previous, {})

    expect(next.get('contract_number')).toBeNull()
    expect(next.get('customer_name')).toBeNull()
  })

  it('giữ nguyên tìm kiếm, cỡ trang và deep-link ngoài dialog', () => {
    const previous = new URLSearchParams('search=Minh&page_size=50&awaiting_me=true')

    const next = applyFilterValuesToParams(previous, { approval_status__in: ['approved'] })

    expect(next.get('search')).toBe('Minh')
    expect(next.get('page_size')).toBe('50')
    expect(next.get('awaiting_me')).toBe('true')
  })

  it('đưa về trang 1 sau khi đổi bộ lọc', () => {
    const next = applyFilterValuesToParams(new URLSearchParams('page=7'), {
      status__in: ['approved'],
    })

    expect(next.get('page')).toBe('1')
  })

  it('không sửa đối tượng params được truyền vào', () => {
    const previous = new URLSearchParams('approval_status__in=pending_manager')

    applyFilterValuesToParams(previous, { approval_status__in: [] })

    expect(previous.get('approval_status__in')).toBe('pending_manager')
  })
})

describe('Ngày làm phiếu TTGD (transactionSheetDateRange) — độc lập với Ngày hợp đồng', () => {
  it('gộp transaction_sheet_date_from/to trên URL thành một đối tượng khoảng ngày', () => {
    const values = buildFilterValuesFromUrl(
      new URLSearchParams(
        'transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-17'
      )
    )

    expect(values.transactionSheetDateRange).toEqual({ from: AUG_01, to: AUG_17 })
  })

  it('dịch transactionSheetDateRange thành cặp param API đúng tên', () => {
    const params = buildApiParams({ transactionSheetDateRange: { from: AUG_01, to: AUG_17 } })

    expect(params.transaction_sheet_date_from).toBe('2026-08-01')
    expect(params.transaction_sheet_date_to).toBe('2026-08-17')
    expect(params).not.toHaveProperty('transactionSheetDateRange')
  })

  // Regression: field mới không được đổi hành vi của contractDateRange đã có sẵn.
  it('không đụng contractDateRange khi chỉ set transactionSheetDateRange', () => {
    const params = buildApiParams({ transactionSheetDateRange: { from: AUG_01, to: AUG_17 } })

    expect(params).not.toHaveProperty('contract_date_from')
    expect(params).not.toHaveProperty('contract_date_to')
  })

  it('gửi cả hai cặp param cùng lúc khi cả hai khoảng ngày đều được chọn (AND, không ghi đè)', () => {
    const params = buildApiParams({
      contractDateRange: { from: AUG_01, to: AUG_17 },
      transactionSheetDateRange: { from: AUG_01, to: AUG_17 },
    })

    expect(params).toMatchObject({
      contract_date_from: '2026-08-01',
      contract_date_to: '2026-08-17',
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-17',
    })
  })

  it('xoá transactionSheetDateRange thì XOÁ luôn cả hai param trên URL', () => {
    const previous = new URLSearchParams(
      'transaction_sheet_date_from=2026-08-01&transaction_sheet_date_to=2026-08-17&page=3'
    )

    const next = applyFilterValuesToParams(previous, { transactionSheetDateRange: null })

    expect(next.get('transaction_sheet_date_from')).toBeNull()
    expect(next.get('transaction_sheet_date_to')).toBeNull()
  })

  it('ghi transactionSheetDateRange mới chọn lên URL mà không đụng contract_date_from/to', () => {
    const previous = new URLSearchParams(
      'contract_date_from=2026-08-01&contract_date_to=2026-08-17'
    )

    const next = applyFilterValuesToParams(previous, {
      contractDateRange: { from: AUG_01, to: AUG_17 },
      transactionSheetDateRange: { from: AUG_01, to: AUG_17 },
    })

    expect(next.get('contract_date_from')).toBe('2026-08-01')
    expect(next.get('contract_date_to')).toBe('2026-08-17')
    expect(next.get('transaction_sheet_date_from')).toBe('2026-08-01')
    expect(next.get('transaction_sheet_date_to')).toBe('2026-08-17')
  })

  it('đếm transactionSheetDateRange là một bộ lọc riêng, độc lập với contractDateRange', () => {
    expect(
      countActiveFilters({
        contractDateRange: { from: AUG_01, to: AUG_17 },
        transactionSheetDateRange: { from: AUG_01, to: AUG_17 },
      })
    ).toBe(2)
  })

  it('đếm 0 khi cả hai khoảng ngày đều rỗng', () => {
    expect(countActiveFilters({ contractDateRange: null, transactionSheetDateRange: null })).toBe(0)
  })
})

describe('lọc nhiều trạng thái (__in)', () => {
  it('tách chuỗi phẩy trên URL thành mảng', () => {
    const values = buildFilterValuesFromUrl(
      new URLSearchParams('status__in=approved,rejected&approval_status__in=pending_manager')
    )

    expect(values.status__in).toEqual(['approved', 'rejected'])
    expect(values.approval_status__in).toEqual(['pending_manager'])
  })

  it('nối mảng thành chuỗi phẩy khi ghi URL', () => {
    const next = applyFilterValuesToParams(new URLSearchParams(), {
      status__in: ['approved', 'rejected'],
    })

    expect(next.get('status__in')).toBe('approved,rejected')
  })

  it('gửi MẢNG lên API, không phải chuỗi', () => {
    const params = buildApiParams({ status__in: ['approved', 'rejected'] })

    expect(params.status__in).toEqual(['approved', 'rejected'])
  })

  it('bỏ tick hết thì xoá param, không để lại chuỗi rỗng', () => {
    const previous = new URLSearchParams('status__in=approved,rejected')

    const next = applyFilterValuesToParams(previous, { status__in: [] })

    expect(next.get('status__in')).toBeNull()
    expect(next.toString()).not.toContain('status__in')
  })

  it('mảng rỗng thì không gửi gì lên API', () => {
    expect(buildApiParams({ status__in: [], approval_status__in: [] })).toEqual({})
  })

  // Dashboard 18.7 bắn thẳng `?approval_status=pending_manager`. Link đó phải còn chạy.
  it('nhận link cũ dạng ĐƠN TRỊ và nạp vào ô chọn nhiều', () => {
    const values = buildFilterValuesFromUrl(
      new URLSearchParams('approval_status=pending_manager&status=approved')
    )

    expect(values.approval_status__in).toEqual(['pending_manager'])
    expect(values.status__in).toEqual(['approved'])
  })

  it('có cả hai dạng thì dạng __in thắng', () => {
    const values = buildFilterValuesFromUrl(
      new URLSearchParams('status=approved&status__in=rejected,abandoned')
    )

    expect(values.status__in).toEqual(['rejected', 'abandoned'])
  })

  // Giữ lại dạng đơn trị là có hai tham số cùng lọc một cột, mà dialog chỉ tắt được một.
  it('ghi URL thì dọn sạch dạng đơn trị cũ', () => {
    const previous = new URLSearchParams('status=approved&approval_status=pending_manager')

    const next = applyFilterValuesToParams(previous, { status__in: ['rejected'] })

    expect(next.get('status')).toBeNull()
    expect(next.get('approval_status')).toBeNull()
    expect(next.get('status__in')).toBe('rejected')
  })

  it('bỏ giá trị trùng và dấu phẩy thừa khi đọc URL', () => {
    const values = buildFilterValuesFromUrl(
      new URLSearchParams('status__in=approved,,approved,new')
    )

    expect(values.status__in).toEqual(['approved', 'new'])
  })

  it('không bao giờ để key riêng của form lọt lên API', () => {
    const params = buildApiParams({ status__in: ['approved'], approval_status__in: ['approved'] })

    expect(params).not.toHaveProperty('status')
    expect(params).not.toHaveProperty('approval_status')
  })
})

describe('countActiveFilters', () => {
  // Trên dialog người dùng chỉ thấy MỘT ô khoảng ngày, nên badge phải đếm 1 — trước đây
  // hai ô rời đếm thành 2.
  it('đếm một khoảng ngày là một bộ lọc', () => {
    expect(countActiveFilters({ contractDateRange: { from: AUG_01, to: AUG_17 } })).toBe(1)
  })

  it('đếm cả khoảng ngày hở một đầu', () => {
    expect(countActiveFilters({ contractDateRange: { from: AUG_01, to: undefined } })).toBe(1)
  })

  // Bug cũ: lọc theo khách hàng nhưng badge vẫn hiện 0.
  it('đếm bộ lọc khách hàng', () => {
    expect(countActiveFilters({ customer: 190 })).toBe(1)
  })

  it('đếm bộ lọc chi nhánh', () => {
    expect(countActiveFilters({ branch: '3' })).toBe(1)
  })

  // Badge đếm số Ô đang bật, không đếm số GIÁ TRỊ: tick 5 trạng thái mà badge hiện 5
  // thì người dùng đi tìm 5 ô đang bật trong dialog và chỉ thấy một.
  it('một ô chọn-nhiều tính là MỘT bộ lọc dù tick nhiều giá trị', () => {
    expect(countActiveFilters({ status__in: ['approved', 'rejected', 'new'] })).toBe(1)
  })

  it('mảng rỗng không tính là đang lọc', () => {
    expect(countActiveFilters({ status__in: [], approval_status__in: [] })).toBe(0)
  })

  it('cộng dồn nhiều bộ lọc', () => {
    const count = countActiveFilters({
      status__in: ['approved'],
      approval_status__in: ['pending_manager'],
      customer: 190,
      project: 3,
      contractDateRange: { from: AUG_01, to: AUG_17 },
    })

    expect(count).toBe(5)
  })

  // `search` có ô riêng ngoài toolbar; `pending`/`awaiting_me` đến từ deep-link dashboard.
  // Đếm chúng vào badge là chỉ vào một ô không tồn tại trong dialog.
  it('không đếm ô tìm kiếm và deep-link của dashboard', () => {
    expect(countActiveFilters({ search: 'Minh', pending: true, awaiting_me: true })).toBe(0)
  })

  it('trả 0 khi không lọc gì', () => {
    expect(countActiveFilters(buildFilterValuesFromUrl(new URLSearchParams('page=1')))).toBe(0)
  })
})
