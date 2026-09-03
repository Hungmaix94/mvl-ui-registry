import { describe, expect, it } from 'vitest'
import { reconciliationSheetToPersist } from './input-invoice-reconciliation-sheet'
import { InputInvoiceCounterpartyType } from '../types/input-invoice-types'

describe('reconciliationSheetToPersist', () => {
  it('giữ phiếu đối chiếu khi đối tượng là Sàn giao dịch', () => {
    // Đây là loại DUY NHẤT mà `f2_reconciliation_sheet` nói đúng sự thật: lựa chọn đến từ
    // endpoint phiếu F2 nên id nằm đúng bảng mà khóa ngoại trỏ tới.
    expect(reconciliationSheetToPersist(InputInvoiceCounterpartyType.EXCHANGE, 210)).toBe(210)
  })

  it('KHÔNG gửi phiếu đối chiếu Chủ đầu tư — đây là ca đã báo lỗi 400', () => {
    // `1545` là id phiếu CĐT thật trong ticket. Nó không tồn tại bên bảng phiếu F2, nên gửi đi
    // là ăn `Invalid pk "1545" - object does not exist.`
    expect(reconciliationSheetToPersist(InputInvoiceCounterpartyType.SUPPLIER, 1545)).toBeNull()
  })

  it('KHÔNG gửi phiếu đối chiếu CTV', () => {
    expect(reconciliationSheetToPersist(InputInvoiceCounterpartyType.COLLABORATOR, 88)).toBeNull()
  })

  it('bỏ id KỂ CẢ khi nó tình cờ trùng một phiếu F2 có thật', () => {
    // Nhánh nguy hơn nhánh 400 vì nó không báo gì: đo dev 27/08 có 72/1336 phiếu CĐT trùng id
    // với một phiếu F2, và những ca đó sẽ gắn hóa đơn vào một phiếu hoàn toàn không liên quan.
    // Hàm không được phép "thông minh" tra xem id có tồn tại hay không — loại đối tượng mới là
    // thứ quyết định, vì id trùng nhau vẫn là hai bản ghi khác nhau.
    expect(reconciliationSheetToPersist(InputInvoiceCounterpartyType.SUPPLIER, 288)).toBeNull()
  })

  it('trả về null khi chưa chọn phiếu nào, kể cả với Sàn giao dịch', () => {
    expect(reconciliationSheetToPersist(InputInvoiceCounterpartyType.EXCHANGE, null)).toBeNull()
    expect(
      reconciliationSheetToPersist(InputInvoiceCounterpartyType.EXCHANGE, undefined)
    ).toBeNull()
  })

  it('trả về null khi chưa chọn đối tượng', () => {
    // Form khởi tạo trước khi người dùng chạm vào ô nào; không được đoán bừa là Sàn.
    expect(reconciliationSheetToPersist(null, 210)).toBeNull()
    expect(reconciliationSheetToPersist(undefined, 210)).toBeNull()
  })

  it('mọi loại đối tượng ngoài Sàn giao dịch đều bị bỏ, không chỉ hai loại đã liệt kê', () => {
    // Ghim theo ENUM chứ không theo danh sách chép tay: backend thêm loại mới thì ca này tự
    // phủ, thay vì âm thầm để lọt một loại chưa ai nghĩ tới.
    const others = Object.values(InputInvoiceCounterpartyType).filter(
      (type) => type !== InputInvoiceCounterpartyType.EXCHANGE
    )
    // Khẳng định tiền đề: enum rỗng (hoặc chỉ có EXCHANGE) sẽ làm vòng lặp dưới không chứng
    // minh gì mà vẫn xanh.
    expect(others.length).toBeGreaterThanOrEqual(3)
    for (const type of others) {
      expect(reconciliationSheetToPersist(type, 1545)).toBeNull()
    }
  })
})
