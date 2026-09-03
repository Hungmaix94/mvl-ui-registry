import { describe, expect, it } from 'vitest'
import { formatPayoutBatchStatus, formatPayoutWave, PAYOUT_WAVE_LABELS } from './constants'

describe('formatPayoutWave', () => {
  it('maps known wave codes to their Vietnamese labels', () => {
    expect(formatPayoutWave('SALE')).toBe(PAYOUT_WAVE_LABELS.SALE)
    expect(formatPayoutWave('MGMT')).toBe(PAYOUT_WAVE_LABELS.MGMT)
    expect(formatPayoutWave('CTV')).toBe(PAYOUT_WAVE_LABELS.CTV)
  })

  it('renders CTV explicitly (regression: previously showed raw code)', () => {
    expect(formatPayoutWave('CTV')).toBe('Đợt chi CTV')
  })

  it('falls back to the raw code for an unknown wave', () => {
    expect(formatPayoutWave('OTHER')).toBe('OTHER')
  })

  it('renders a dash for empty / null / undefined', () => {
    expect(formatPayoutWave('')).toBe('-')
    expect(formatPayoutWave(null)).toBe('-')
    expect(formatPayoutWave(undefined)).toBe('-')
  })
})

describe('formatPayoutBatchStatus', () => {
  // Nguồn nhãn dùng chung cho chip trên bảng và ô chọn trong bộ lọc (CR 86eyj428y) — hai nơi
  // hiển thị cạnh nhau nên mọi khác biệt đều lộ ra với người dùng.
  it('vá đúng ba nhãn chưa được dịch', () => {
    expect(formatPayoutBatchStatus('SENT_TO_BANK', { SENT_TO_BANK: 'Sent to bank' })).toBe(
      'Đã gửi ngân hàng'
    )
    expect(formatPayoutBatchStatus('PAID', { PAID: 'Paid' })).toBe('Đã thanh toán')
    expect(formatPayoutBatchStatus('DRAFT', { DRAFT: 'Bản nháp' })).toBe('Nháp')
  })

  it('giữ nguyên bản dịch hợp lệ, không đè lên', () => {
    expect(formatPayoutBatchStatus('PAID', { PAID: 'Đã chi' })).toBe('Đã chi')
    expect(formatPayoutBatchStatus('CONFIRMED', { CONFIRMED: 'Đã xác nhận' })).toBe('Đã xác nhận')
  })

  it('trả về chính mã trạng thái khi app-constant chưa tải xong', () => {
    expect(formatPayoutBatchStatus('CANCELLED')).toBe('CANCELLED')
    expect(formatPayoutBatchStatus('CANCELLED', null)).toBe('CANCELLED')
    expect(formatPayoutBatchStatus('CANCELLED', {})).toBe('CANCELLED')
  })

  it('không đụng tới mã lạ ngoài enum', () => {
    expect(formatPayoutBatchStatus('WHATEVER', { WHATEVER: 'Gì đó' })).toBe('Gì đó')
  })
})
