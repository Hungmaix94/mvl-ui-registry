import { describe, it, expect } from 'vitest'
import { TRANSFER_TO_ACCOUNT_OPTIONS } from '@/features/project/refund-booking/types/refund-payment-types'
import { getTransferToAccountLabel } from './transfer-account'

describe('getTransferToAccountLabel', () => {
  it('dịch mọi giá trị form chọn được, đúng chữ đang hiển thị trên form', () => {
    for (const opt of TRANSFER_TO_ACCOUNT_OPTIONS) {
      expect(getTransferToAccountLabel(opt.value)).toBe(opt.label)
    }
  })

  it('trả "-" cho rỗng / null / undefined', () => {
    expect(getTransferToAccountLabel('')).toBe('-')
    expect(getTransferToAccountLabel(null)).toBe('-')
    expect(getTransferToAccountLabel(undefined)).toBe('-')
  })

  it('trả "-" cho giá trị lạ thay vì in chuỗi thô ra màn hình', () => {
    // Gồm cả hai giá trị đã bị gỡ khỏi enum ngày 14/08/2026. BE có CheckConstraint
    // chốt cặp mv/investor nên đây là lưới an toàn, không phải trạng thái thật.
    expect(getTransferToAccountLabel('custom')).toBe('-')
    expect(getTransferToAccountLabel('unknown')).toBe('-')
    expect(getTransferToAccountLabel('bank_of_nowhere')).toBe('-')
  })
})

describe('TRANSFER_TO_ACCOUNT_OPTIONS', () => {
  it('có đúng hai lựa chọn — tiền chỉ về MVL hoặc về CĐT', () => {
    expect(TRANSFER_TO_ACCOUNT_OPTIONS.map((o) => o.value)).toEqual(['mv', 'investor'])
  })
})
