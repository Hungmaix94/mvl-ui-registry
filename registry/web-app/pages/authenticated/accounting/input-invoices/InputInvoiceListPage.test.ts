import { describe, expect, it } from 'vitest'

import { InputInvoiceStatus } from '@/constants/api-schema-aliases'
import { INPUT_INVOICE_DEFAULT_STATUSES } from '@/features/accounting/_shares/utils/invoice-list-status'
import { buildApiParams, ensureDefaultStatuses, getFilterValues } from './InputInvoiceListPage'

const PERIOD_ID = 11

function params(query: string) {
  return buildApiParams(new URLSearchParams(query), PERIOD_ID) as Record<string, unknown>
}

/**
 * Luật trạng thái của màn Danh sách, sau CR 86eyqrn7k vòng 2.
 *
 * Bản đầu (CR STT58) để FE tự thêm `status__in` khi URL trống, cộng một ngoại lệ cho ô Tìm kiếm.
 * Nay luật hiện ra thành NHÓM Ô TICK: URL luôn mang `status__in`, và nhóm ô tick là nguồn sự thật
 * DUY NHẤT — không còn ngoại lệ nào. Đổi lại, người dùng nhìn thấy vì sao một hoá đơn không hiện,
 * thay vì phải đoán một luật chạy ngầm.
 *
 * Hai vai trò tách bạch, và đó là điều đáng ghim nhất ở đây:
 * - `ensureDefaultStatuses` quyết định URL trông thế nào khi mở màn (tick sẵn gì).
 * - `buildApiParams` chỉ dịch URL sang query, không tự thêm luật nào.
 */
describe('InputInvoiceListPage — buildApiParams đọc trạng thái từ URL', () => {
  it('có ô tick ⇒ gửi đúng tập đó', () => {
    const p = params(`status__in=${InputInvoiceStatus.DRAFT},${InputInvoiceStatus.RECEIVED}`)

    expect(p.status__in).toEqual([InputInvoiceStatus.DRAFT, InputInvoiceStatus.RECEIVED])
  })

  it('tick cả "Đã huỷ" ⇒ hoá đơn đã huỷ hiện ra, không có luật nào chặn lại', () => {
    const p = params(`status__in=${InputInvoiceStatus.DRAFT},${InputInvoiceStatus.VOIDED}`)

    expect(p.status__in).toContain(InputInvoiceStatus.VOIDED)
  })

  // Chuỗi rỗng ≠ vắng mặt. Đây là cách duy nhất diễn đạt "người dùng đã bỏ hết ô tick"; lẫn hai ca
  // này là bấm "Xoá bộ lọc" xong bộ lọc tự bật lại ở lần đọc URL kế tiếp.
  it('bỏ hết ô tick (status__in rỗng) ⇒ KHÔNG lọc trạng thái, tức xem tất cả', () => {
    const p = params('status__in=')

    expect(p.status__in).toBeUndefined()
    expect(p.status).toBeUndefined()
    // Đối chứng: các bộ lọc khác vẫn đi bình thường, nên `undefined` ở trên không phải do
    // buildApiParams trả về rỗng toàn tập.
    expect((params('status__in=&investor=3') as Record<string, unknown>).investor).toBe('3')
  })

  it('URL chưa khởi tạo ⇒ buildApiParams KHÔNG tự thêm luật nào', () => {
    const p = params('page=1&page_size=25')

    // Việc điền tập mặc định là của `ensureDefaultStatuses`, không phải của hàm này. Trộn hai vai
    // trò lại là luật lại chạy ngầm — đúng thứ CR này gỡ đi.
    expect(p.status__in).toBeUndefined()
  })

  it('link chia sẻ kiểu cũ dùng `status` đơn vẫn được tôn trọng', () => {
    const p = params(`status=${InputInvoiceStatus.VOIDED}`)

    expect(p.status).toBe(InputInvoiceStatus.VOIDED)
    expect(p.status__in).toBeUndefined()
  })

  // Ngoại lệ cũ cho ô Tìm kiếm đã bị GỠ. Ghim lại để không ai thêm về theo trí nhớ: giữ nó cùng
  // lúc với nhóm ô tick sẽ thành UI hiện 5 ô tick mà kết quả lại có hoá đơn đã huỷ.
  it('ô Tìm kiếm KHÔNG còn bỏ qua bộ lọc trạng thái', () => {
    const p = params(`search=HDIN000000140&status__in=${InputInvoiceStatus.DRAFT}`)

    expect(p.search).toBe('HDIN000000140')
    expect(p.status__in).toEqual([InputInvoiceStatus.DRAFT])
  })

  it('các bộ lọc khác đi qua nguyên vẹn', () => {
    const p = params(
      `status__in=${InputInvoiceStatus.DRAFT}&investor=3&exchange=5&invoice_date_after=2026-08-01`
    )

    expect(p.investor).toBe('3')
    expect(p.exchange).toBe(5)
    expect(p.invoice_date_after).toBe('2026-08-01')
    expect(p.accounting_period).toBe(PERIOD_ID)
  })

  // Hai ô lọc này đã bị gỡ khỏi dialog vì trùng ô Tìm kiếm; buildApiParams không được đọc chúng
  // nữa, nếu không một link cũ vẫn ép được bộ lọc mà dialog không hiển thị ở đâu cả.
  it.each(['external_invoice_no=00099', 'tax_code=0101'])(
    'không còn đọc tham số đã gỡ (%s)',
    (query) => {
      const p = params(query) as Record<string, unknown>

      expect(p.external_invoice_no).toBeUndefined()
      expect(p.tax_code).toBeUndefined()
      // Đối chứng: chính lượt gọi này vẫn dựng được các tham số khác.
      expect(p.accounting_period).toBe(PERIOD_ID)
    }
  )
})

describe('InputInvoiceListPage — ensureDefaultStatuses điền tập mặc định vào URL', () => {
  it('URL chưa có trạng thái ⇒ điền tập "mọi trạng thái trừ Đã huỷ"', () => {
    const url = new URLSearchParams('page=1&page_size=25')

    expect(ensureDefaultStatuses(url)).toBe(true)
    expect(url.get('status__in')).toBe(INPUT_INVOICE_DEFAULT_STATUSES.join(','))
    expect(url.get('status__in')).not.toContain(InputInvoiceStatus.VOIDED)
  })

  // Ca hồi quy cho lỗi dễ mắc nhất của luật này: bấm "Xoá bộ lọc" (bỏ hết ô tick) rồi reload mà
  // bộ lọc tự bật lại thì người dùng không bao giờ xem được hoá đơn đã huỷ.
  it('người dùng đã bỏ hết ô tick ⇒ KHÔNG điền đè lên', () => {
    const url = new URLSearchParams('status__in=')

    expect(ensureDefaultStatuses(url)).toBe(false)
    expect(url.get('status__in')).toBe('')
  })

  it('URL đã có lựa chọn ⇒ giữ nguyên', () => {
    const url = new URLSearchParams(`status__in=${InputInvoiceStatus.VOIDED}`)

    expect(ensureDefaultStatuses(url)).toBe(false)
    expect(url.get('status__in')).toBe(InputInvoiceStatus.VOIDED)
  })

  it('link kiểu cũ dùng `status` đơn ⇒ không chèn thêm `status__in` cạnh nó', () => {
    const url = new URLSearchParams(`status=${InputInvoiceStatus.DRAFT}`)

    expect(ensureDefaultStatuses(url)).toBe(false)
    expect(url.has('status__in')).toBe(false)
  })
})

/** Xem ghi chú cùng tên ở `SalesInvoiceListPage.test.ts` — hai màn cùng một luật. */
describe('InputInvoiceListPage — getFilterValues dựng lại trạng thái ô tick', () => {
  it('URL có lựa chọn ⇒ tick đúng chúng', () => {
    const data = getFilterValues(
      new URLSearchParams(`status__in=${InputInvoiceStatus.DRAFT},${InputInvoiceStatus.VOIDED}`)
    )

    expect(data.status__in).toEqual([InputInvoiceStatus.DRAFT, InputInvoiceStatus.VOIDED])
  })

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
    const data = getFilterValues(new URLSearchParams(`status=${InputInvoiceStatus.RECEIVED}`))

    expect(data.status__in).toEqual([InputInvoiceStatus.RECEIVED])
  })
})
