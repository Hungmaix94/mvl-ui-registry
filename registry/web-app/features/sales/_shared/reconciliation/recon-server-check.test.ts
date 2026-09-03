import { describe, expect, it } from 'vitest'

import {
  effectiveReconMatch,
  formatReconCheckValue,
  pickReconCheckDisplay,
  reconCheckCompareUnit,
  reconCheckMismatches,
  reconCheckMvFlag,
  type ReconCheck,
  type ReconCheckEntry,
} from './recon-server-check'

const entry = (o: Partial<ReconCheckEntry>): ReconCheckEntry => ({
  submitted: null,
  mv_config: null,
  delta: null,
  match: null,
  ...o,
})

describe('reconCheckCompareUnit', () => {
  it('maps percent / currency fields to their compare unit', () => {
    expect(reconCheckCompareUnit('extra_bonus_pct')).toBe('percent')
    expect(reconCheckCompareUnit('pct_agency_fee')).toBe('percent')
    expect(reconCheckCompareUnit('extra_bonus_amount')).toBe('currency')
    expect(reconCheckCompareUnit('total_amount_with_vat')).toBe('currency')
  })

  it('returns null for boolean / unknown fields (no numeric delta to show)', () => {
    expect(reconCheckCompareUnit('is_agency_fee_include_vat')).toBeNull()
    expect(reconCheckCompareUnit('not_a_real_field')).toBeNull()
  })

  it('declares progress fields as percent (for the wired progress rows)', () => {
    expect(reconCheckCompareUnit('progress_from_pct')).toBe('percent')
    expect(reconCheckCompareUnit('progress_to_pct')).toBe('percent')
    expect(reconCheckCompareUnit('extra_bonus_progress_from_pct')).toBe('percent')
    expect(reconCheckCompareUnit('extra_bonus_progress_to_pct')).toBe('percent')
  })
})

describe('reconCheckMvFlag', () => {
  it('trả cờ theo MV config, KHÔNG lấy giá trị CĐT đề nghị (submitted)', () => {
    const check: ReconCheck = {
      is_agency_fee_include_vat: entry({ submitted: true, mv_config: false, match: false }),
    }
    expect(reconCheckMvFlag(check, 'is_agency_fee_include_vat')).toBe(false)
  })

  it('trả undefined khi thiếu recon_check / thiếu field / mv_config rỗng (ẩn nhãn thay vì đoán)', () => {
    const check: ReconCheck = { is_agency_fee_include_vat: entry({ submitted: true }) }
    expect(reconCheckMvFlag(null, 'is_agency_fee_include_vat')).toBeUndefined()
    expect(reconCheckMvFlag(check, 'is_shared_bonus_include_vat')).toBeUndefined()
    expect(reconCheckMvFlag(check, 'is_agency_fee_include_vat')).toBeUndefined()
  })

  it('chấp nhận boolean serialize dạng chuỗi/số', () => {
    const check: ReconCheck = {
      a: entry({ mv_config: 'true' }),
      b: entry({ mv_config: 'False' }),
      c: entry({ mv_config: 1 }),
    }
    expect(reconCheckMvFlag(check, 'a')).toBe(true)
    expect(reconCheckMvFlag(check, 'b')).toBe(false)
    expect(reconCheckMvFlag(check, 'c')).toBe(true)
  })
})

describe('reconCheckMismatches — cờ VAT của cả 3 cấu phần đều là nguyên nhân gốc', () => {
  it('nêu lệch cờ VAT cho phí đại lý, thưởng đại lý và phí tăng thêm', () => {
    const check: ReconCheck = {
      is_agency_fee_include_vat: entry({ submitted: true, mv_config: false, match: false }),
      is_shared_bonus_include_vat: entry({ submitted: true, mv_config: false, match: false }),
      is_extra_bonus_include_vat: entry({ submitted: true, mv_config: false, match: false }),
      // Hệ quả dẫn xuất — KHÔNG nằm trong PRIMARY_FIELDS nên không nhân bản thành 4 dòng lệch nữa.
      sub_total_commission: entry({ submitted: '54545455', mv_config: '60000000', match: false }),
      total_amount_with_vat: entry({ submitted: '60000000', mv_config: '66000000', match: false }),
    }

    expect(reconCheckMismatches(check).map((m) => m.field)).toEqual([
      'is_agency_fee_include_vat',
      'is_shared_bonus_include_vat',
      'is_extra_bonus_include_vat',
    ])
  })

  it('không nêu khi cả hai bên cùng "chưa gồm VAT" (false ≈ rỗng)', () => {
    const check: ReconCheck = {
      is_shared_bonus_include_vat: entry({ submitted: false, mv_config: false, match: false }),
    }
    expect(reconCheckMismatches(check)).toEqual([])
  })

  it('format cờ VAT thành Có/Không thay vì "true"/"false"', () => {
    expect(formatReconCheckValue('is_extra_bonus_include_vat', true)).toBe('Có')
    expect(formatReconCheckValue('is_extra_bonus_include_vat', false)).toBe('Không')
  })
})

describe('effectiveReconMatch', () => {
  it('keeps BE match when there is a real value', () => {
    expect(effectiveReconMatch(entry({ submitted: '1.00', mv_config: '0.00', match: false }))).toBe(
      false
    )
    expect(effectiveReconMatch(entry({ submitted: '6.00', mv_config: '6.00', match: true }))).toBe(
      true
    )
  })

  it('downgrades match=false to null when both sides are empty (0 ≈ null)', () => {
    expect(effectiveReconMatch(entry({ submitted: '0', mv_config: null, match: false }))).toBeNull()
  })

  it('returns null for a missing entry', () => {
    expect(effectiveReconMatch(undefined)).toBeNull()
    expect(effectiveReconMatch(null)).toBeNull()
  })
})

describe('pickReconCheckDisplay', () => {
  // Regression: phiếu VTDH-IRS1389 reconciliation 1424 — "Tổng phí tăng thêm (thỏa thuận)" maps the
  // %/₫ pair. The ₫ half is empty (null vs null, match=true) and MUST NOT shadow the % half which is a
  // real mismatch (1.00 vs 0.00, match=false). Previously the cell returned the first non-null match
  // (₫) → green "Khớp"; now it surfaces the % mismatch regardless of argument order.
  const reconCheck: ReconCheck = {
    extra_bonus_amount: entry({ submitted: null, mv_config: null, delta: null, match: true }),
    extra_bonus_pct: entry({ submitted: '1.00', mv_config: '0.00', delta: '1.00', match: false }),
  }

  it('surfaces the real mismatch even when an empty matching field is listed first', () => {
    expect(pickReconCheckDisplay(reconCheck, ['extra_bonus_amount', 'extra_bonus_pct'])).toEqual({
      match: false,
      delta: '1.00',
      unit: 'percent',
    })
  })

  it('is independent of field order', () => {
    expect(pickReconCheckDisplay(reconCheck, ['extra_bonus_pct', 'extra_bonus_amount'])).toEqual({
      match: false,
      delta: '1.00',
      unit: 'percent',
    })
  })

  it('returns the matching field when nothing mismatches', () => {
    const allMatch: ReconCheck = {
      pct_agency_fee: entry({ submitted: '6.00', mv_config: '6.00', delta: '0.00', match: true }),
      amt_agency_fee: entry({ submitted: null, mv_config: null, match: true }),
    }
    expect(pickReconCheckDisplay(allMatch, ['pct_agency_fee', 'amt_agency_fee'])).toEqual({
      match: true,
      delta: '0.00',
      unit: 'percent',
    })
  })

  it('carries the active field unit for a currency-side mismatch', () => {
    const amtMismatch: ReconCheck = {
      pct_agency_fee: entry({ submitted: null, mv_config: null, match: true }),
      amt_agency_fee: entry({
        submitted: '5000000',
        mv_config: '4000000',
        delta: '1000000',
        match: false,
      }),
    }
    expect(pickReconCheckDisplay(amtMismatch, ['pct_agency_fee', 'amt_agency_fee'])).toEqual({
      match: false,
      delta: '1000000',
      unit: 'currency',
    })
  })

  it('returns null when there is nothing to compare', () => {
    expect(pickReconCheckDisplay(undefined, ['extra_bonus_pct'])).toBeNull()
    expect(pickReconCheckDisplay({}, ['extra_bonus_pct'])).toBeNull()
    const emptyPair: ReconCheck = {
      extra_bonus_amount: entry({ submitted: '0', mv_config: null, delta: '0', match: false }),
      extra_bonus_pct: entry({ submitted: null, mv_config: null, match: null }),
    }
    expect(pickReconCheckDisplay(emptyPair, ['extra_bonus_amount', 'extra_bonus_pct'])).toBeNull()
  })

  // Progress rows are now wired to recon_check (no more hardcoded green "Khớp"). BE currently returns
  // match=null for progress ⇒ nothing to compare ⇒ cell shows muted "—".
  it('returns null for progress when BE has nothing to compare (match=null)', () => {
    const progress: ReconCheck = {
      progress_from_pct: entry({ submitted: '0.00', mv_config: null, match: null }),
      progress_to_pct: entry({ submitted: '10.00', mv_config: null, match: null }),
    }
    expect(pickReconCheckDisplay(progress, ['progress_from_pct'])).toBeNull()
    expect(pickReconCheckDisplay(progress, ['progress_to_pct'])).toBeNull()
  })

  // ...and auto-surfaces a percent-unit mismatch if BE ever starts comparing progress.
  it('surfaces a percent mismatch if BE later compares progress', () => {
    const progress: ReconCheck = {
      progress_to_pct: entry({
        submitted: '10.00',
        mv_config: '8.00',
        delta: '2.00',
        match: false,
      }),
    }
    expect(pickReconCheckDisplay(progress, ['progress_to_pct'])).toEqual({
      match: false,
      delta: '2.00',
      unit: 'percent',
    })
  })
})
