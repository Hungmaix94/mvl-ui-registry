import { describe, expect, it } from 'vitest'

import { SalesInvoiceStatus } from '@/constants/api-schema-aliases'
import { SALES_INVOICE_DEFAULT_STATUSES } from '@/features/accounting/_shares/utils/invoice-list-status'
import { buildApiParams, ensureDefaultStatuses, getFilterValues } from './SalesInvoiceListPage'

const PERIOD_ID = 11

function params(query: string) {
  return buildApiParams(new URLSearchParams(query), PERIOD_ID) as Record<string, unknown>
}

/**
 * Sinh đôi của `InputInvoiceListPage.test.ts` — hai màn cố ý cùng một luật. Xem ghi chú đầy đủ
 * ở file đó. Khác biệt riêng của màn này: enum có HAI giá trị mang nghĩa huỷ (`CANCELLED` và
 * `VOIDED`), và link cũ dùng `status` đơn được quy về `status__in` một phần tử.
 */
describe('SalesInvoiceListPage — buildApiParams đọc trạng thái từ URL', () => {
  it('có ô tick ⇒ gửi đúng tập đó', () => {
    const p = params(`status__in=${SalesInvoiceStatus.DRAFT},${SalesInvoiceStatus.ISSUED}`)

    expect(p.status__in).toEqual([SalesInvoiceStatus.DRAFT, SalesInvoiceStatus.ISSUED])
  })

  it('tick cả hai trạng thái huỷ ⇒ hoá đơn đã huỷ hiện ra', () => {
    const p = params(`status__in=${SalesInvoiceStatus.CANCELLED},${SalesInvoiceStatus.VOIDED}`)

    expect(p.status__in).toEqual([SalesInvoiceStatus.CANCELLED, SalesInvoiceStatus.VOIDED])
  })

  it('bỏ hết ô tick (status__in rỗng) ⇒ KHÔNG lọc trạng thái, tức xem tất cả', () => {
    const p = params('status__in=')

    expect(p.status__in).toBeUndefined()
    expect((params('status__in=&investor=3') as Record<string, unknown>).investor).toBe('3')
  })

  it('URL chưa khởi tạo ⇒ buildApiParams KHÔNG tự thêm luật nào', () => {
    const p = params('page=1&page_size=25')

    expect(p.status__in).toBeUndefined()
  })

  it('link chia sẻ kiểu cũ dùng `status` đơn ⇒ quy về status__in một phần tử', () => {
    const p = params(`status=${SalesInvoiceStatus.CANCELLED}`)

    expect(p.status__in).toEqual([SalesInvoiceStatus.CANCELLED])
  })

  it('ô Tìm kiếm KHÔNG còn bỏ qua bộ lọc trạng thái', () => {
    const p = params(`search=HDOUT000001450&status__in=${SalesInvoiceStatus.DRAFT}`)

    expect(p.search).toBe('HDOUT000001450')
    expect(p.status__in).toEqual([SalesInvoiceStatus.DRAFT])
  })

  it('các bộ lọc khác đi qua nguyên vẹn', () => {
    const p = params(
      `status__in=${SalesInvoiceStatus.DRAFT}&investor=3&source_exchange=5&ordering=-invoice_date`
    )

    expect(p.investor).toBe('3')
    expect(p.source_exchange).toBe(5)
    expect(p.ordering).toBe('-invoice_date')
    expect(p.accounting_period).toBe(PERIOD_ID)
  })

  // Ba ô lọc này đã bị gỡ khỏi dialog vì trùng ô Tìm kiếm (số HĐ thực tế, MST khách hàng) hoặc
  // được thay bằng tra mã trong ô Tìm kiếm (phiếu đối chiếu CĐT).
  it.each([
    'external_invoice_no=00099',
    'customer_tax_code=0101',
    'investor_reconciliation_sheet=1528',
  ])('không còn đọc tham số đã gỡ (%s)', (query) => {
    const p = params(query) as Record<string, unknown>

    expect(p.external_invoice_no).toBeUndefined()
    expect(p.customer_tax_code).toBeUndefined()
    expect(p.investor_reconciliation_sheet).toBeUndefined()
    expect(p.accounting_period).toBe(PERIOD_ID)
  })
})

describe('SalesInvoiceListPage — ensureDefaultStatuses điền tập mặc định vào URL', () => {
  it('URL chưa có trạng thái ⇒ điền tập "mọi trạng thái trừ nhóm huỷ"', () => {
    const url = new URLSearchParams('page=1&page_size=25')

    expect(ensureDefaultStatuses(url)).toBe(true)
    expect(url.get('status__in')).toBe(SALES_INVOICE_DEFAULT_STATUSES.join(','))
    expect(url.get('status__in')).not.toContain(SalesInvoiceStatus.CANCELLED)
    expect(url.get('status__in')).not.toContain(SalesInvoiceStatus.VOIDED)
  })

  it('người dùng đã bỏ hết ô tick ⇒ KHÔNG điền đè lên', () => {
    const url = new URLSearchParams('status__in=')

    expect(ensureDefaultStatuses(url)).toBe(false)
    expect(url.get('status__in')).toBe('')
  })

  it('URL đã có lựa chọn ⇒ giữ nguyên', () => {
    const url = new URLSearchParams(`status__in=${SalesInvoiceStatus.CANCELLED}`)

    expect(ensureDefaultStatuses(url)).toBe(false)
    expect(url.get('status__in')).toBe(SalesInvoiceStatus.CANCELLED)
  })

  it('link kiểu cũ dùng `status` đơn ⇒ không chèn thêm `status__in` cạnh nó', () => {
    const url = new URLSearchParams(`status=${SalesInvoiceStatus.DRAFT}`)

    expect(ensureDefaultStatuses(url)).toBe(false)
    expect(url.has('status__in')).toBe(false)
  })
})

/**
 * `getFilterValues` là thứ quyết định NHÓM Ô TICK hiện tick những gì khi mở dialog. Nó phải nói
 * đúng thứ URL đang mang — lệch một chút là UI hiển thị một đằng còn bảng lọc một nẻo, và người
 * dùng không có cách nào biết.
 */
describe('SalesInvoiceListPage — getFilterValues dựng lại trạng thái ô tick', () => {
  it('URL có lựa chọn ⇒ tick đúng chúng', () => {
    const data = getFilterValues(
      new URLSearchParams(`status__in=${SalesInvoiceStatus.DRAFT},${SalesInvoiceStatus.CANCELLED}`)
    )

    expect(data.status__in).toEqual([SalesInvoiceStatus.DRAFT, SalesInvoiceStatus.CANCELLED])
  })

  // Chuỗi rỗng phải ra MẢNG RỖNG, không phải `undefined`: `undefined` để form rơi về defaultValues
  // và dialog lại hiện tick, ngược hẳn thứ người dùng vừa bỏ chọn.
  it('URL mang chuỗi rỗng ⇒ mảng rỗng, KHÔNG phải undefined', () => {
    const data = getFilterValues(new URLSearchParams('status__in='))

    expect(data.status__in).toEqual([])
    expect(data.status__in).not.toBeUndefined()
  })

  it('URL chưa có trạng thái ⇒ để form tự quyết (undefined), không bịa tập nào', () => {
    const data = getFilterValues(new URLSearchParams('page=1'))

    expect(data.status__in).toBeUndefined()
  })

  it('link kiểu cũ `status` đơn ⇒ quy về mảng một phần tử', () => {
    const data = getFilterValues(new URLSearchParams(`status=${SalesInvoiceStatus.ISSUED}`))

    expect(data.status__in).toEqual([SalesInvoiceStatus.ISSUED])
  })
})
