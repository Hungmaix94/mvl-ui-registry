import { describe, expect, it } from 'vitest'
import { findInvoiceLine, splitTierByInvoiceLine } from './tier-vat-basis'
import type { InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'

// Số thật lấy từ prod khi truy vết bug 86eygdrz8 — giữ nguyên để test bảo vệ đúng ca đã gãy.
describe('splitTierByInvoiceLine', () => {
  it('bóc VAT khi hoa hồng F2 đã gồm VAT — ca gãy PV000000737 / căn VH100008', () => {
    // BE trả net = gross = 13.236.300 nên vat_amount sập về 0; hóa đơn thì tách đúng.
    const split = splitTierByInvoiceLine({
      gross: 13_236_300,
      line: { line_total: '12033000', line_total_with_vat: '13236300' },
      fallbackNet: 13_236_300,
      fallbackVat: 0,
    })

    expect(split).toEqual({ net: 12_033_000, vat: 1_203_300, source: 'invoice-line' })
  })

  it('giữ nguyên kết quả BE ở tier tất toán MỘT PHẦN — ca đúng PV000000730 / căn VH100009', () => {
    // Tier chỉ trả 27.944.051 trong tổng 30.450.000 của dòng hóa đơn, nên không được
    // copy thẳng line.vat_amount (2.768.182) mà phải theo tỷ lệ của riêng đợt này.
    const split = splitTierByInvoiceLine({
      gross: 27_944_051,
      line: { line_total: '27681818', line_total_with_vat: '30450000' },
      fallbackNet: 25_403_683,
      fallbackVat: 2_540_368,
    })

    expect(split).toEqual({ net: 25_403_683, vat: 2_540_368, source: 'invoice-line' })
  })

  it('sửa cả ca VAT bị hụt chứ không chỉ ca VAT = 0 — PV000000733 / căn NTESTTC123', () => {
    const split = splitTierByInvoiceLine({
      gross: 54_579_545,
      line: { line_total: '49617768', line_total_with_vat: '54579545' },
      fallbackNet: 54_204_545,
      fallbackVat: 375_000,
    })

    expect(split).toEqual({ net: 49_617_768, vat: 4_961_777, source: 'invoice-line' })
  })

  it('net + vat luôn cộng khít gross, không để lệch tròn số', () => {
    const gross = 10_000_001
    const split = splitTierByInvoiceLine({
      gross,
      line: { line_total: '3', line_total_with_vat: '7' },
      fallbackNet: 0,
      fallbackVat: 0,
    })

    expect(split.net + split.vat).toBe(gross)
  })

  it('hóa đơn không có VAT thì VAT bằng 0 — không bịa ra thuế', () => {
    const split = splitTierByInvoiceLine({
      gross: 5_000_000,
      line: { line_total: '5000000', line_total_with_vat: '5000000' },
      fallbackNet: 5_000_000,
      fallbackVat: 0,
    })

    expect(split).toEqual({ net: 5_000_000, vat: 0, source: 'invoice-line' })
  })

  it('lùi về số BE khi chưa có dòng hóa đơn (map fetch chưa xong / tier legacy)', () => {
    const split = splitTierByInvoiceLine({
      gross: 13_236_300,
      line: undefined,
      fallbackNet: 12_000_000,
      fallbackVat: 1_236_300,
    })

    expect(split).toEqual({ net: 12_000_000, vat: 1_236_300, source: 'tier' })
  })

  it('lùi về số BE khi dòng hóa đơn thiếu tổng gồm VAT', () => {
    const split = splitTierByInvoiceLine({
      gross: 13_236_300,
      line: { line_total: '12033000', line_total_with_vat: '' },
      fallbackNet: 13_236_300,
      fallbackVat: 0,
    })

    expect(split.source).toBe('tier')
  })

  it('lùi về số BE khi dữ liệu hỏng (trước VAT lớn hơn tổng gồm VAT)', () => {
    const split = splitTierByInvoiceLine({
      gross: 1_000_000,
      line: { line_total: '13236300', line_total_with_vat: '12033000' },
      fallbackNet: 999_999,
      fallbackVat: 1,
    })

    expect(split).toEqual({ net: 999_999, vat: 1, source: 'tier' })
  })
})

describe('findInvoiceLine', () => {
  const invoice = {
    lines: [
      { id: 309, line_total: '12033000', line_total_with_vat: '13236300' },
      { id: 310, line_total: '1000', line_total_with_vat: '1100' },
    ],
  } as unknown as InputInvoice

  it('lấy đúng dòng theo id mà tier tất toán', () => {
    expect(findInvoiceLine(invoice, 310)?.line_total).toBe('1000')
  })

  it('trả undefined khi chưa có hóa đơn hoặc tier không gắn dòng nào', () => {
    expect(findInvoiceLine(undefined, 309)).toBeUndefined()
    expect(findInvoiceLine(invoice, null)).toBeUndefined()
    expect(findInvoiceLine(invoice, 999)).toBeUndefined()
  })
})
