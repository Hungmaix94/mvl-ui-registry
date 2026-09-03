import { describe, it, expect } from 'vitest'
import { resolveInvestorBonusAndDeduction } from '../reconciliation-resolver'

describe('resolveInvestorBonusAndDeduction', () => {
  it('returns zeros for null or undefined pricing', () => {
    const res = resolveInvestorBonusAndDeduction(null)
    expect(res.hasReconciliation).toBe(false)
    expect(res.bonus).toBe(0)
    expect(res.deduction).toBe(0)
    expect(res.agencyFee).toBe(0)
    expect(res.totalAmount).toBe(0)
  })

  it('resolves values from SA/PI when no reconciliation exists', () => {
    const pricing = {
      agency_fee_amount: '100000000',
      amt_investor_bonus: '20000000',
      total_fee_deduction: '5000000',
      total_amount: '115000000',
    }
    const res = resolveInvestorBonusAndDeduction(pricing)
    expect(res.hasReconciliation).toBe(false)
    expect(res.bonus).toBe(20000000)
    expect(res.deduction).toBe(5000000)
    expect(res.agencyFee).toBe(100000000)
    expect(res.totalAmount).toBe(115000000)
  })

  it('keeps an explicit 0 instead of falling through to the next candidate', () => {
    const res = resolveInvestorBonusAndDeduction({
      amt_investor_bonus: 0,
      amt_extra_bonus: '9000000',
      total_fee_deduction: '0',
      mv_config: { total_fee_deduction: '7000000' },
    })
    expect(res.bonus).toBe(0)
    expect(res.deduction).toBe(0)
  })

  it('falls back to mv_config when the pricing fields are absent', () => {
    const res = resolveInvestorBonusAndDeduction({
      mv_config: {
        amt_extra_bonus: '8000000',
        total_fee_deduction: '2000000',
        agency_fee_amount: '90000000',
        total_amount: '96000000',
      },
    })
    expect(res.bonus).toBe(8000000)
    expect(res.deduction).toBe(2000000)
    expect(res.agencyFee).toBe(90000000)
    expect(res.totalAmount).toBe(96000000)
  })

  it('resolves malformed values to 0 instead of NaN', () => {
    const res = resolveInvestorBonusAndDeduction({
      agency_fee_amount: 'n/a',
      amt_investor_bonus: '',
      total_amount: '  ',
    })
    expect(res.agencyFee).toBe(0)
    expect(res.bonus).toBe(0)
    expect(res.totalAmount).toBe(0)
  })

  it('ignores reconciliation without a ref code', () => {
    const res = resolveInvestorBonusAndDeduction({
      agency_fee_amount: '100000000',
      amt_investor_bonus: '20000000',
      investor_reconciled: { latest_ref_code: null, agency_fee_amount: '999', bonus: '999' },
    })
    expect(res.hasReconciliation).toBe(false)
    expect(res.agencyFee).toBe(100000000)
    expect(res.bonus).toBe(20000000)
  })

  it('prioritizes investor reconciliation data when reconciliation exists', () => {
    const pricing = {
      agency_fee_amount: '100000000',
      amt_investor_bonus: '20000000',
      investor_reconciled: {
        latest_ref_code: 'REC-2026-001',
        agency_fee_amount: '120000000',
        bonus: '25000000',
        deduction: '3000000',
        total_amount: '142000000',
      },
    }
    const res = resolveInvestorBonusAndDeduction(pricing)
    expect(res.hasReconciliation).toBe(true)
    expect(res.bonus).toBe(25000000)
    expect(res.deduction).toBe(3000000)
    expect(res.agencyFee).toBe(120000000)
    expect(res.totalAmount).toBe(142000000)
  })
})
