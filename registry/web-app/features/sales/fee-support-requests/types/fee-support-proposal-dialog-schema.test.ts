import { describe, it, expect } from 'vitest'

import {
  feeSupportEditDialogSchema,
  feeSupportProposalDialogSchema,
  toFeeSupportEditPayload,
} from './fee-support-request-types'

const base = {
  sales: [1],
  reason: 'lý do hỗ trợ',
  support_sale_pct: 5,
  support_sale_amount: null,
  support_bonus_pct: null,
  support_bonus_amount: null,
  customer: 10,
  customer_discount_pct: null,
  customer_discount_amount: null,
  customer_discount_bonus_pct: null,
  customer_discount_bonus_amount: null,
}

describe('feeSupportProposalDialogSchema', () => {
  it('hợp lệ khi đúng 1 kênh có %', () => {
    expect(feeSupportProposalDialogSchema.safeParse(base).success).toBe(true)
  })

  it('lỗi khi thiếu nhân sự', () => {
    expect(feeSupportProposalDialogSchema.safeParse({ ...base, sales: [] }).success).toBe(false)
  })

  it('lỗi khi thiếu lý do', () => {
    expect(feeSupportProposalDialogSchema.safeParse({ ...base, reason: '' }).success).toBe(false)
  })

  it('lỗi khi không có kênh hỗ trợ nào', () => {
    expect(
      feeSupportProposalDialogSchema.safeParse({ ...base, support_sale_pct: null }).success
    ).toBe(false)
  })

  it('lỗi khi 1 kênh set cả % lẫn tiền', () => {
    expect(
      feeSupportProposalDialogSchema.safeParse({ ...base, support_sale_amount: 100 }).success
    ).toBe(false)
  })

  it('lỗi khi có customer_discount nhưng thiếu customer', () => {
    const v = { ...base, customer: null, customer_discount_pct: 3 }
    expect(feeSupportProposalDialogSchema.safeParse(v).success).toBe(false)
  })

  it('hợp lệ khi kênh thưởng dùng số tiền', () => {
    const v = { ...base, support_sale_pct: null, support_bonus_amount: 1_000_000 }
    expect(feeSupportProposalDialogSchema.safeParse(v).success).toBe(true)
  })

  // 2026-08-26 — nghiệp vụ không cho xin hỗ trợ thưởng, nên phiếu CHỈ cắt khách
  // phần thưởng là hình dạng phổ biến nhất. Nó phải qua được luật "ít nhất 1 kênh".
  it('hợp lệ khi CHỈ cắt khách phần thưởng (không xin hỗ trợ gì)', () => {
    const v = { ...base, support_sale_pct: null, customer_discount_bonus_pct: 0.6 }
    expect(feeSupportProposalDialogSchema.safeParse(v).success).toBe(true)
  })

  it('lỗi khi cắt khách phần thưởng nhưng thiếu customer', () => {
    const v = { ...base, support_sale_pct: null, customer: null, customer_discount_bonus_pct: 0.6 }
    expect(feeSupportProposalDialogSchema.safeParse(v).success).toBe(false)
  })

  it('lỗi khi cắt khách phần thưởng set cả % lẫn tiền', () => {
    const v = {
      ...base,
      customer_discount_bonus_pct: 0.6,
      customer_discount_bonus_amount: 1_000_000,
    }
    expect(feeSupportProposalDialogSchema.safeParse(v).success).toBe(false)
  })
})

// 86eyqf9m3 — dialog SỬA phiếu web_secretary dùng chung rule kênh với dialog tạo,
// chỉ khác không có deal/hold_full_until_paid/attachment_tokens.
describe('feeSupportEditDialogSchema', () => {
  it('hợp lệ khi đúng 1 kênh có %', () => {
    expect(feeSupportEditDialogSchema.safeParse(base).success).toBe(true)
  })

  it('lỗi khi thiếu nhân sự', () => {
    expect(feeSupportEditDialogSchema.safeParse({ ...base, sales: [] }).success).toBe(false)
  })

  it('lỗi khi không có kênh hỗ trợ nào', () => {
    expect(feeSupportEditDialogSchema.safeParse({ ...base, support_sale_pct: null }).success).toBe(
      false
    )
  })

  it('lỗi khi có customer_discount nhưng thiếu customer', () => {
    const v = { ...base, customer: null, customer_discount_pct: 3 }
    expect(feeSupportEditDialogSchema.safeParse(v).success).toBe(false)
  })
})

describe('toFeeSupportEditPayload', () => {
  it('map number → chuỗi decimal, không gửi deal/deposit_contract/hold_full_until_paid/files', () => {
    const payload = toFeeSupportEditPayload(base)

    expect(payload).toEqual({
      sales: [1],
      reason: 'lý do hỗ trợ',
      support_sale_pct: '5',
      support_sale_amount: null,
      support_bonus_pct: null,
      support_bonus_amount: null,
      customer: 10,
      customer_discount_pct: null,
      customer_discount_amount: null,
      customer_discount_bonus_pct: null,
      customer_discount_bonus_amount: null,
    })
    expect(payload).not.toHaveProperty('deal')
    expect(payload).not.toHaveProperty('deposit_contract')
    expect(payload).not.toHaveProperty('hold_full_until_paid')
    expect(payload).not.toHaveProperty('files')
  })

  it('customer = 0/undefined → null (không gửi id giả)', () => {
    expect(toFeeSupportEditPayload({ ...base, customer: null }).customer).toBeNull()
  })

  // FE ẩn ô "Xin hỗ trợ thưởng" (FEE_SUPPORT_BONUS_REQUEST_ENABLED = false) nên
  // payload phải mang null. Gửi 0 sẽ bị BE hiểu là "xin 0%" — tức GHI ĐÈ mức thưởng
  // quy định của sale về 0, khác hẳn "không xin".
  it('không xin hỗ trợ thưởng → gửi null, KHÔNG phải 0', () => {
    const payload = toFeeSupportEditPayload(base)
    expect(payload.support_bonus_pct).toBeNull()
    expect(payload.support_bonus_amount).toBeNull()
  })

  it('gửi kèm cắt khách phần thưởng dưới dạng chuỗi decimal', () => {
    const payload = toFeeSupportEditPayload({ ...base, customer_discount_bonus_pct: 0.6 })
    expect(payload.customer_discount_bonus_pct).toBe('0.6')
    expect(payload.customer_discount_bonus_amount).toBeNull()
  })
})
