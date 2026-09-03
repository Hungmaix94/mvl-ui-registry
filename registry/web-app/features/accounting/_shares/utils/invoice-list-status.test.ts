import { describe, expect, it } from 'vitest'

import { InputInvoiceStatus, SalesInvoiceStatus } from '@/constants/api-schema-aliases'
import {
  INPUT_INVOICE_CANCELLED_STATUSES,
  INPUT_INVOICE_DEFAULT_STATUSES,
  SALES_INVOICE_CANCELLED_STATUSES,
  SALES_INVOICE_DEFAULT_STATUSES,
} from './invoice-list-status'

describe('invoice-list-status — trạng thái mặc định của màn Danh sách hoá đơn (CR STT58)', () => {
  describe('hoá đơn đầu vào', () => {
    it('ẩn đúng VOIDED ("Đã huỷ")', () => {
      expect(INPUT_INVOICE_CANCELLED_STATUSES).toEqual([InputInvoiceStatus.VOIDED])
      expect(INPUT_INVOICE_DEFAULT_STATUSES).not.toContain(InputInvoiceStatus.VOIDED)
    })

    it('giữ lại các trạng thái làm việc — DRAFT là ca hay gặp nhất trên dữ liệu thật', () => {
      expect(INPUT_INVOICE_DEFAULT_STATUSES).toContain(InputInvoiceStatus.DRAFT)
      expect(INPUT_INVOICE_DEFAULT_STATUSES).toContain(InputInvoiceStatus.RECEIVED)
      expect(INPUT_INVOICE_DEFAULT_STATUSES).toContain(InputInvoiceStatus.VERIFIED)
      expect(INPUT_INVOICE_DEFAULT_STATUSES).toContain(InputInvoiceStatus.PAID)
    })

    // Guard chống drift: BE thêm một trạng thái mới, `yarn api:update` kéo về enum mới, mà nếu
    // danh sách mặc định được liệt kê tay thì dòng mang trạng thái đó BIẾN MẤT IM LẶNG khỏi màn
    // hình — không lỗi, không cảnh báo, chỉ thiếu dòng. Test này đỏ ngay ở lần regen đó.
    it('phủ kín enum: mọi giá trị đều thuộc "mặc định hiện" hoặc "đã huỷ", không sót', () => {
      const all = Object.values(InputInvoiceStatus)
      const covered = [...INPUT_INVOICE_DEFAULT_STATUSES, ...INPUT_INVOICE_CANCELLED_STATUSES]
      expect([...covered].sort()).toEqual([...all].sort())
    })
  })

  describe('hoá đơn bán ra', () => {
    it('ẩn CẢ HAI giá trị mang nghĩa đã huỷ: CANCELLED ("Đã hủy") và VOIDED ("Đã hủy (cũ)")', () => {
      expect(SALES_INVOICE_CANCELLED_STATUSES).toEqual([
        SalesInvoiceStatus.CANCELLED,
        SalesInvoiceStatus.VOIDED,
      ])
      expect(SALES_INVOICE_DEFAULT_STATUSES).not.toContain(SalesInvoiceStatus.CANCELLED)
      expect(SALES_INVOICE_DEFAULT_STATUSES).not.toContain(SalesInvoiceStatus.VOIDED)
    })

    it('giữ lại các trạng thái làm việc', () => {
      expect(SALES_INVOICE_DEFAULT_STATUSES).toContain(SalesInvoiceStatus.DRAFT)
      expect(SALES_INVOICE_DEFAULT_STATUSES).toContain(SalesInvoiceStatus.ISSUED)
      expect(SALES_INVOICE_DEFAULT_STATUSES).toContain(SalesInvoiceStatus.PAID)
      expect(SALES_INVOICE_DEFAULT_STATUSES).toContain(SalesInvoiceStatus.ADJUSTED)
    })

    it('phủ kín enum: mọi giá trị đều thuộc "mặc định hiện" hoặc "đã huỷ", không sót', () => {
      const all = Object.values(SalesInvoiceStatus)
      const covered = [...SALES_INVOICE_DEFAULT_STATUSES, ...SALES_INVOICE_CANCELLED_STATUSES]
      expect([...covered].sort()).toEqual([...all].sort())
    })
  })

  // Bốn hằng này được truyền THẲNG vào query params của list, `/summary/` và `/export/`. Đóng
  // băng để một lần `sort()`/`push()` vô ý ở bất kỳ call site nào không âm thầm đổi bộ lọc của
  // mọi màn — lỗi kiểu đó không nổ ở chỗ gây ra nó.
  it.each([
    ['INPUT_INVOICE_DEFAULT_STATUSES', INPUT_INVOICE_DEFAULT_STATUSES],
    ['INPUT_INVOICE_CANCELLED_STATUSES', INPUT_INVOICE_CANCELLED_STATUSES],
    ['SALES_INVOICE_DEFAULT_STATUSES', SALES_INVOICE_DEFAULT_STATUSES],
    ['SALES_INVOICE_CANCELLED_STATUSES', SALES_INVOICE_CANCELLED_STATUSES],
  ])('%s là bất biến', (_name, list) => {
    expect(Object.isFrozen(list)).toBe(true)
  })

  // Hai màn dùng hai enum KHÁC nhau: đầu vào không có CANCELLED, bán ra có cả hai. Ghim lại để
  // không ai "thống nhất cho gọn" bằng cách dùng chung một danh sách.
  it('hai enum khác nhau — đầu vào không hề có CANCELLED', () => {
    expect(Object.values(InputInvoiceStatus)).not.toContain('CANCELLED')
    expect(Object.values(SalesInvoiceStatus)).toContain('CANCELLED')
  })
})
