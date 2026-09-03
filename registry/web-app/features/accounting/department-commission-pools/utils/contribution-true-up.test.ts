import { describe, it, expect } from 'vitest'
import { formatPeriodKey, readRevenueBreakdown, revenueLines } from './contribution-true-up'

describe('formatPeriodKey', () => {
  it('turns a BE period key into the Vietnamese month/year order', () => {
    expect(formatPeriodKey('2026-07')).toBe('07/2026')
  })

  it('keeps the leading zero so 07/2026 never reads as 7/2026', () => {
    expect(formatPeriodKey('2026-07')).not.toBe('7/2026')
  })

  it('passes an unexpected shape through instead of rendering undefined', () => {
    expect(formatPeriodKey('2026')).toBe('2026')
  })
})

describe('readRevenueBreakdown', () => {
  it('returns null rather than throwing on a missing detail', () => {
    expect(readRevenueBreakdown(null)).toBeNull()
  })

  it('returns null when the backend has not shipped the field yet', () => {
    expect(readRevenueBreakdown({ basis_amount: '100' })).toBeNull()
  })
})

describe('revenueLines', () => {
  it('is null for a source whose basis is entirely this period', () => {
    expect(
      revenueLines({ revenue_breakdown: { own: '1144150000', carried: [], total: '1144150000' } })
    ).toBeNull()
  })

  it('names this period and the period folded into it', () => {
    const lines = revenueLines({
      revenue_breakdown: {
        own: '1144150000',
        carried: [{ period: '2026-07', amount: '502800000' }],
        total: '1646950000',
      },
    })

    expect(lines).toEqual([
      { label: 'kỳ này', amount: 1144150000 },
      { label: 'bù kỳ 07/2026', amount: 502800000 },
    ])
  })

  it('keeps an over-recognised period negative so the reader sees it was taken back', () => {
    const lines = revenueLines({
      revenue_breakdown: {
        own: '96965948',
        carried: [{ period: '2026-06', amount: '-36045335' }],
        total: '60920613',
      },
    })

    expect(lines?.[1]).toEqual({ label: 'bù kỳ 06/2026', amount: -36045335 })
  })

  it('lists several carried periods separately rather than as one lump', () => {
    const lines = revenueLines({
      revenue_breakdown: {
        own: '1000',
        carried: [
          { period: '2026-06', amount: '-10' },
          { period: '2026-07', amount: '60' },
        ],
        total: '1050',
      },
    })

    expect(lines?.map((line) => line.label)).toEqual(['kỳ này', 'bù kỳ 06/2026', 'bù kỳ 07/2026'])
  })

  it('adds up to the basis the row shows', () => {
    const lines = revenueLines({
      revenue_breakdown: {
        own: '1144150000',
        carried: [{ period: '2026-07', amount: '502800000' }],
        total: '1646950000',
      },
    })!

    expect(lines.reduce((sum, line) => sum + line.amount, 0)).toBe(1646950000)
  })

  it('degrades to null when the backend has not shipped the field yet', () => {
    expect(revenueLines({ basis_amount: '100' })).toBeNull()
  })

  it('tolerates a missing detail', () => {
    expect(revenueLines(undefined)).toBeNull()
  })
})
