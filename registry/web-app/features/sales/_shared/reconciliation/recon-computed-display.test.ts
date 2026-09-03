import { describe, expect, it } from 'vitest'

import { createEmptyInvestorReconciliationSheetItem } from './recon-sheet-schema'
import { reconDirtyKey, resolveReconComputedDisplayState } from './recon-computed-display'

describe('resolveReconComputedDisplayState', () => {
  it('ẩn khi căn mới, chưa có số BE', () => {
    expect(resolveReconComputedDisplayState('new', false)).toBe('hidden')
  })
  it('hiện khi căn đã lưu (saved) và khớp', () => {
    expect(resolveReconComputedDisplayState('saved', true)).toBe('shown')
  })
  it('stale khi đã có số BE nhưng đang dirty/saving (cần xác nhận lại)', () => {
    expect(resolveReconComputedDisplayState('dirty', true)).toBe('stale')
    expect(resolveReconComputedDisplayState('saving', true)).toBe('stale')
  })
  it('ẩn khi dirty mà chưa từng có số BE', () => {
    expect(resolveReconComputedDisplayState('dirty', false)).toBe('hidden')
  })
  it('view (read-only): shown nếu có số BE, hidden nếu không', () => {
    expect(resolveReconComputedDisplayState(undefined, true, true)).toBe('shown')
    expect(resolveReconComputedDisplayState(undefined, false, true)).toBe('hidden')
  })
})

describe('reconDirtyKey', () => {
  it('bỏ qua retroactive_adjustment_amount khi so dirty', () => {
    const a = createEmptyInvestorReconciliationSheetItem()
    const b = { ...a, retroactive_adjustment_amount: 123456 }
    expect(reconDirtyKey(a)).toBe(reconDirtyKey(b))
  })
  it('bỏ qua progress_from_pct / progress_to_pct (BE readonly) khi so dirty', () => {
    const a = createEmptyInvestorReconciliationSheetItem()
    const b = { ...a, progress_from_pct: 0, progress_to_pct: 50 }
    expect(reconDirtyKey(a)).toBe(reconDirtyKey(b))
  })
  it('khác khi field input đổi', () => {
    const a = createEmptyInvestorReconciliationSheetItem()
    const b = { ...a, fee_calculation_price: 999 }
    expect(reconDirtyKey(a)).not.toBe(reconDirtyKey(b))
  })
})
