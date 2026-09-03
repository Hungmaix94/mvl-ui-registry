import { describe, expect, it } from 'vitest'

import { receiptVoucherSchema } from './receipt-voucher-schema'

/**
 * Phiếu thu ghi HAI số: tiền mặt thực nhận và mệnh giá tất toán. Backend PR #3289 đã bỏ ràng
 * buộc hai số phải bằng nhau — nhưng cổng zod ở đây vẫn ép bằng TUYỆT ĐỐI (`!==`, dung sai 0đ,
 * chặt hơn cả cổng backend cũ vốn cho lệch 1đ).
 *
 * Hệ quả nếu để nguyên: `collection_variance` luôn bằng 0 với mọi phiếu tạo qua wizard, nên
 * dòng "Chênh lệch thu" vừa thêm ở màn chi tiết không bao giờ hiện ra, và ca nghiệp vụ gốc
 * (CSTN-IRS0024 / HĐ 881 — CĐT chuyển thiếu 1đ) vẫn không nhập được.
 *
 * Nới ra KHÔNG có nghĩa là bỏ trắng: chặn cứng ở FE được thay bằng cảnh báo, và cổng thật nằm
 * ở bước ghi sổ của backend (`collection_variance_exceeds_limit`), nơi con người xác nhận.
 */

const base = {
  receipt_date: '2026-05-11',
  payer_type: 'INVESTOR',
  payer_investor: 1,
  payer_name: 'CĐT Chamora',
  accounting_period: 12,
  payment_method: 'TRANSFER',
  bank_on: true,
  bank_amount: 50_000_000,
  cash_on: false,
  offset_on: false,
  to_bank_account: 7,
  invoices: [{ sales_invoice: 1, allocated_amount: '50000000', allocation_pct: '100' }],
}

function parse(overrides: Record<string, unknown> = {}) {
  return receiptVoucherSchema.safeParse({ ...base, ...overrides })
}

function allocate(amount: string) {
  return { invoices: [{ sales_invoice: 1, allocated_amount: amount, allocation_pct: '100' }] }
}

describe('cổng tiền mặt vs phân bổ', () => {
  it('hai số bằng nhau vẫn hợp lệ', () => {
    expect(parse().success).toBe(true)
  })

  it('CĐT chuyển thiếu 1đ vẫn nhập được — đây là ca HĐ 881', () => {
    // Phân bổ ĐỦ mặt hoá đơn (50.000.001), tiền mặt theo sao kê (50.000.000).
    const result = parse(allocate('50000001'))
    expect(result.success).toBe(true)
  })

  it('CĐT chuyển thừa vài đồng cũng nhập được', () => {
    expect(parse(allocate('49999998')).success).toBe(true)
  })

  it('lệch lớn vẫn nhập được ở bước tạo — cổng thật nằm ở bước ghi sổ', () => {
    // Phiếu NHÁP lệch bao nhiêu cũng vô hại: chưa đụng paid_amount, PBTV hay hoa hồng.
    // Chặn ở đây sẽ dựng lại đúng cặp cổng mà backend vừa gỡ, và bắt kế toán trả lời
    // hai lần cho cùng một con số.
    expect(parse(allocate('99000000')).success).toBe(true)
  })

  it('cấn trừ vượt phân bổ vẫn bị chặn — nới cổng tiền mặt không phải bỏ trắng', () => {
    const result = parse({
      offset_on: true,
      offset_amount: 60_000_000,
      offset_invoices: [{ input_invoice: 9, allocated_amount: '60000000' }],
      ...allocate('50000000'),
    })
    expect(result.success).toBe(false)
    const messages = result.success ? [] : result.error.issues.map((i) => i.message)
    expect(messages.some((m) => m.includes('cấn trừ'))).toBe(true)
  })
})
