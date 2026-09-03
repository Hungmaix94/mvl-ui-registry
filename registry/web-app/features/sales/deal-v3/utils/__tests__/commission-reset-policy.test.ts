import { describe, expect, it } from 'vitest'

import {
  getResetToPolicyButtonState,
  RESET_TO_POLICY_LABEL,
} from '@/features/sales/deal-v3/utils/commission-reset-policy'

describe('getResetToPolicyButtonState', () => {
  it('cho bấm khi dòng đang bị ghi đè thủ công', () => {
    const state = getResetToPolicyButtonState({ isCustomOverride: true, isPending: false })

    expect(state.disabled).toBe(false)
    expect(state.title).toBe('Bỏ ghi đè thủ công, tính lại theo chính sách chung')
  })

  it('disable (không ẩn) khi dòng đang theo chính sách chung', () => {
    const state = getResetToPolicyButtonState({ isCustomOverride: false })

    expect(state.disabled).toBe(true)
    expect(state.title).toBe('Dòng này đang theo chính sách chung, không có ghi đè để khôi phục')
  })

  it('coi is_custom_override thiếu/null như không có ghi đè', () => {
    expect(getResetToPolicyButtonState({}).disabled).toBe(true)
    expect(getResetToPolicyButtonState({ isCustomOverride: null }).disabled).toBe(true)
  })

  it('disable khi có mutation đang chạy dù đang bị ghi đè', () => {
    const state = getResetToPolicyButtonState({ isCustomOverride: true, isPending: true })

    expect(state.disabled).toBe(true)
    // Vẫn giữ title "bấm được" để không đổi nghĩa tooltip lúc đang lưu.
    expect(state.title).toBe('Bỏ ghi đè thủ công, tính lại theo chính sách chung')
  })

  it('nhãn nút dùng chung cho cả popover ô và form đầy đủ', () => {
    expect(RESET_TO_POLICY_LABEL).toBe('Khôi phục theo chính sách chung')
  })
})
