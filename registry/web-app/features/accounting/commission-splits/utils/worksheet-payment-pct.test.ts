import { describe, expect, it } from 'vitest'

import { formatPctFloor } from '@/utils/common'

import { isWorksheetPaymentPctPinned, worksheetPaymentPct } from './split-helpers'

// Cột "% Thanh toán" của danh sách 20.8 (accounting/commission-sale/split-sheets) phải nói
// cùng một con số với Mục 2/Mục 3 của màn chi tiết: dial % TT phí kế toán đã ghim, hoặc
// Σ % phân bổ phí khi kỳ chưa ghim. `paid_pct` (received_net / phí GROSS) chỉ là lưới an toàn
// cho payload cũ — nó lệch trần `fee_collected_cap_pct` khi deal có giảm trừ / truy hồi.
describe('worksheetPaymentPct', () => {
  it('ưu tiên dial fee_progress_pct kế toán đã ghim', () => {
    const pct = worksheetPaymentPct({
      fee_progress_pct: '69.2279000000',
      total_distribution_pct: '70.0000000000',
      paid_pct: '70.00',
    })
    expect(pct).toBeCloseTo(69.2279, 10)
  })

  it('ghim 0% là giá trị hợp lệ, không rơi xuống fallback', () => {
    const row = { fee_progress_pct: '0.0000000000', total_distribution_pct: '70', paid_pct: '70' }
    expect(worksheetPaymentPct(row)).toBe(0)
    expect(isWorksheetPaymentPctPinned(row)).toBe(true)
  })

  it('kỳ chưa ghim dial thì lấy total_distribution_pct, không lấy paid_pct', () => {
    // Deal HD06-2026-000004 (BE PR #2856): span kế toán gõ 70,00 nhưng tiền thực ghi nhận
    // trên fee_base_net là 69,2279 — con số cột % phải khớp trần, không phải 70,00.
    const row = {
      fee_progress_pct: null,
      total_distribution_pct: '69.2279000000',
      paid_pct: '70.00',
    }
    expect(worksheetPaymentPct(row)).toBeCloseTo(69.2279, 10)
    expect(isWorksheetPaymentPctPinned(row)).toBe(false)
  })

  it('chỉ dùng paid_pct khi payload thiếu cả hai field trên', () => {
    expect(worksheetPaymentPct({ paid_pct: '42.5' })).toBeCloseTo(42.5, 10)
  })

  it('trả 0 khi không có field % nào dùng được', () => {
    expect(worksheetPaymentPct({})).toBe(0)
    expect(worksheetPaymentPct({ fee_progress_pct: '', total_distribution_pct: undefined })).toBe(0)
    expect(worksheetPaymentPct({ fee_progress_pct: 'x' as unknown as string })).toBe(0)
  })

  it('hiển thị cắt xuống 2dp (không half-up) để khớp trần Mục 2', () => {
    const row = { fee_progress_pct: null, total_distribution_pct: '69.2279000000' }
    expect(formatPctFloor(worksheetPaymentPct(row), 2)).toBe(formatPctFloor(69.2279, 2))
    // 69,2279 -> 69,22 (ROUND_DOWN), không phải 69,23
    expect(formatPctFloor(worksheetPaymentPct(row), 2)).toContain('69,22')
  })

  it('trạng thái/màu suy từ cùng con số: dial 100% => đã nhận đủ', () => {
    expect(worksheetPaymentPct({ fee_progress_pct: '100.0000000000', paid_pct: '90.00' })).toBe(100)
  })
})
