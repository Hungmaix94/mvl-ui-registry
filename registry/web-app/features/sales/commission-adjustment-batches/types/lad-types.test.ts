import { describe, expect, it } from 'vitest'
import { RateSpecBase_unit, RateSpecMode } from '@/api/schema'
import { ladFilterCriteriaSchema, ladPayloadSnapshotSchema } from './lad-types'
import { tbcCoreToConfig, tbcF2ToOverride } from '../components/wizard/ladTbcMapping'

describe('ladPayloadSnapshotSchema', () => {
  it('accepts a single % value per khoản', () => {
    const result = ladPayloadSnapshotSchema.safeParse({ pct_agency_fee: 4 })
    expect(result.success).toBe(true)
  })

  it('accepts an empty config', () => {
    expect(ladPayloadSnapshotSchema.safeParse({}).success).toBe(true)
  })

  it('rejects both % and amount on the same khoản (xor)', () => {
    const result = ladPayloadSnapshotSchema.safeParse({
      pct_agency_fee: 4,
      amt_agency_fee: 100_000,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'amt_agency_fee')).toBe(true)
    }
  })

  it('rejects pct_revenue greater than pct_agency_fee', () => {
    const result = ladPayloadSnapshotSchema.safeParse({ pct_revenue: 6, pct_agency_fee: 4 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'pct_revenue')).toBe(true)
    }
  })

  it('accepts pct_revenue equal to / below pct_agency_fee', () => {
    expect(ladPayloadSnapshotSchema.safeParse({ pct_revenue: 4, pct_agency_fee: 4 }).success).toBe(
      true
    )
    expect(
      ladPayloadSnapshotSchema.safeParse({ pct_revenue: 1.5, pct_agency_fee: 4 }).success
    ).toBe(true)
  })

  it('accepts doanh thu KPI Sàn liên kết dạng % hoặc số tiền', () => {
    expect(ladPayloadSnapshotSchema.safeParse({ pct_kpi_revenue_slk: 6 }).success).toBe(true)
    expect(ladPayloadSnapshotSchema.safeParse({ amt_kpi_revenue_slk: 600_000_000 }).success).toBe(
      true
    )
  })

  it('rejects cả % lẫn số tiền cho doanh thu KPI Sàn liên kết (xor)', () => {
    const result = ladPayloadSnapshotSchema.safeParse({
      pct_kpi_revenue_slk: 6,
      amt_kpi_revenue_slk: 600_000_000,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'amt_kpi_revenue_slk')).toBe(true)
    }
  })

  it('không áp trần phí đại lý lên doanh thu KPI Sàn liên kết', () => {
    // Cơ sở doanh thu nội bộ phòng SLK, độc lập phí đại lý CĐT trả — 6% > 4% là hợp lệ.
    expect(
      ladPayloadSnapshotSchema.safeParse({ pct_kpi_revenue_slk: 6, pct_agency_fee: 4 }).success
    ).toBe(true)
  })

  it('accepts F2 overrides keyed by exchange id', () => {
    const result = ladPayloadSnapshotSchema.safeParse({
      f2_overrides_by_exchange: {
        '7': { pct_f2_commission: 1.5, is_f2_commission_include_vat: null },
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts an F2 override whose commission is a RateSpec (fraction)', () => {
    const result = ladPayloadSnapshotSchema.safeParse({
      f2_overrides_by_exchange: {
        '7': {
          pct_f2_commission_spec: {
            mode: RateSpecMode.fraction,
            num: 1,
            den: 3,
            base_value: '4',
            base_unit: RateSpecBase_unit.pct,
          },
          pct_f2_commission: null,
          amt_f2_commission: null,
        },
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('tbcF2ToOverride', () => {
  it('normalises a TBC-F2 fraction spec into pct_f2_commission_spec with null caches (XOR)', () => {
    const override = tbcF2ToOverride({
      f2_commission_spec: {
        mode: RateSpecMode.fraction,
        num: 1,
        den: 3,
        base_value: '4',
        base_unit: RateSpecBase_unit.pct,
      },
    } as never)
    expect(override.pct_f2_commission_spec).toEqual({
      mode: RateSpecMode.fraction,
      pct: null,
      num: 1,
      den: 3,
      base_value: '4',
      base_unit: RateSpecBase_unit.pct,
    })
    expect(override.pct_f2_commission).toBeNull()
    expect(override.amt_f2_commission).toBeNull()
  })

  it('keeps a plain pct commission as cache (no spec) when TBC-F2 has no spec', () => {
    const override = tbcF2ToOverride({ pct_f2_commission: '1.5' } as never)
    expect(override.pct_f2_commission_spec?.mode).toBe(RateSpecMode.direct_pct)
    expect(override.pct_f2_commission_spec?.pct).toBe('1.5')
    expect(override.pct_f2_commission).toBeNull()
  })
})

describe('tbcCoreToConfig', () => {
  it('mang theo doanh thu KPI Sàn liên kết để payload full-replace không xoá mất', () => {
    const config = tbcCoreToConfig({ pct_kpi_revenue_slk: '6.00' } as never)
    expect(config?.pct_kpi_revenue_slk).toBe(6)
    expect(config?.amt_kpi_revenue_slk).toBeNull()
  })
})

describe('ladFilterCriteriaSchema', () => {
  it('keeps the pinned SA scope', () => {
    const result = ladFilterCriteriaSchema.safeParse({
      sales_allocation_id: 88,
      project_id: 12,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sales_allocation_id).toBe(88)
      expect(result.data.project_id).toBe(12)
    }
  })

  it('normalises a dd/MM/yyyy date to the API yyyy-MM-dd shape', () => {
    const result = ladFilterCriteriaSchema.safeParse({
      sales_allocation_id: 88,
      effective_from: '15/04/2026',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.effective_from).toBe('2026-04-15')
    }
  })
})
