import { describe, expect, it } from 'vitest'

import { CTVReconciliationPeriod_type } from '@/api/schema'

import {
  RECON_PERIOD_TYPE_LABELS,
  RECON_PERIOD_TYPE_SHORT,
  getReconPartVisibility,
} from './recon-period-type'

describe('getReconPartVisibility', () => {
  it('shows Phần 1/2/3 for every non-cancel kind (show-all model)', () => {
    for (const kind of [
      CTVReconciliationPeriod_type.normal_payment,
      CTVReconciliationPeriod_type.progress_with_adjustment,
      CTVReconciliationPeriod_type.adjustment_only,
      CTVReconciliationPeriod_type.bonus_deduction,
    ]) {
      expect(getReconPartVisibility(kind)).toEqual({ p1: true, p2: true, p3: true })
    }
  })

  it('hides Phần 1/2 for cancellation (only Phần 3)', () => {
    expect(getReconPartVisibility(CTVReconciliationPeriod_type.cancellation)).toEqual({
      p1: false,
      p2: false,
      p3: true,
    })
  })

  it('defaults to normal-payment visibility for null/undefined', () => {
    expect(getReconPartVisibility(undefined)).toEqual({ p1: true, p2: true, p3: true })
    expect(getReconPartVisibility(null)).toEqual({ p1: true, p2: true, p3: true })
  })
})

describe('period-type label maps', () => {
  it('exposes a Vietnamese label + short pill for every kind', () => {
    expect(RECON_PERIOD_TYPE_LABELS[CTVReconciliationPeriod_type.normal_payment]).toBe(
      'Kỳ thanh toán thường'
    )
    expect(RECON_PERIOD_TYPE_LABELS[CTVReconciliationPeriod_type.cancellation]).toBe('Kỳ hủy cọc')
    expect(RECON_PERIOD_TYPE_SHORT[CTVReconciliationPeriod_type.adjustment_only]).toBe('ĐC thuần')
  })
})
