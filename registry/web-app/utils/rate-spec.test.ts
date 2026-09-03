import { describe, expect, it } from 'vitest'
import { RateSpecBase_unit, RateSpecMode } from '@/api/schema'
import {
  formatRateSpecEquivalent,
  formatRateSpecFraction,
  formatRateSpecWithEquivalent,
  fromRateSpec,
  rateSpecToPair,
  resolveRateTriple,
  toRateSpecPayload,
  resolveRowIsAmt,
} from './rate-spec'

describe('toRateSpecPayload', () => {
  it('returns all-null for nullish / empty / not-ready / errored input', () => {
    expect(toRateSpecPayload(null)).toEqual({ spec: null, pct: null, amt: null })
    expect(toRateSpecPayload(undefined)).toEqual({ spec: null, pct: null, amt: null })

    const errored = fromRateSpec({ mode: RateSpecMode.direct_pct, pct: '2' }, null, null)!
    expect(toRateSpecPayload({ ...errored, error: 'Mẫu số phải lớn hơn 0' })).toEqual({
      spec: null,
      pct: null,
      amt: null,
    })
  })

  it('maps direct percent → direct_pct spec, caches null (BE forbids spec + pct/amt together)', () => {
    const resolved = fromRateSpec({ mode: RateSpecMode.direct_pct, pct: '2' }, null, null)!
    const { spec, pct, amt } = toRateSpecPayload(resolved)
    expect(spec).toEqual({ mode: RateSpecMode.direct_pct, pct: '2' })
    expect(pct).toBeNull()
    expect(amt).toBeNull()
  })

  it('maps direct ₫ amount → spec null + amt cache (no RateSpec direct-VND mode)', () => {
    const resolved = fromRateSpec(null, null, 5_000_000)!
    expect(resolved.directUnit).toBe('đ')
    const { spec, pct, amt } = toRateSpecPayload(resolved)
    expect(spec).toBeNull()
    expect(pct).toBeNull()
    expect(amt).toBe(5_000_000)
  })

  it('maps fraction of a % base → fraction spec (base_unit pct), caches null', () => {
    const resolved = fromRateSpec(
      {
        mode: RateSpecMode.fraction,
        num: 1,
        den: 3,
        base_value: '4',
        base_unit: RateSpecBase_unit.pct,
      },
      null,
      null
    )!
    const { spec, pct, amt } = toRateSpecPayload(resolved)
    expect(spec).toEqual({
      mode: RateSpecMode.fraction,
      pct: null,
      num: 1,
      den: 3,
      base_value: '4',
      base_unit: RateSpecBase_unit.pct,
    })
    // Có spec ⇒ cache pct/amt phải null (BE chỉ chấp nhận spec HOẶC cache).
    expect(pct).toBeNull()
    expect(amt).toBeNull()
  })

  it('maps fraction of a ₫ base → fraction spec (base_unit vnd), caches null', () => {
    const resolved = fromRateSpec(
      {
        mode: RateSpecMode.fraction,
        num: 1,
        den: 2,
        base_value: '300000000',
        base_unit: RateSpecBase_unit.vnd,
      },
      null,
      null
    )!
    const { spec, pct, amt } = toRateSpecPayload(resolved)
    expect(spec?.base_unit).toBe(RateSpecBase_unit.vnd)
    expect(spec?.base_value).toBe('300000000')
    expect(pct).toBeNull()
    expect(amt).toBeNull()
  })
})

describe('fromRateSpec', () => {
  it('returns null when there is no spec and no caches', () => {
    expect(fromRateSpec(null, null, null)).toBeNull()
    expect(fromRateSpec(undefined, '', '')).toBeNull()
  })

  it('coerces decimal-string caches and prefers amount over percent', () => {
    const r = fromRateSpec(null, '2.5', '1000000')!
    expect(r.directUnit).toBe('đ')
    expect(r.fixedAmount).toBe(1_000_000)
  })

  it('round-trips a direct_pct spec', () => {
    const r = fromRateSpec({ mode: RateSpecMode.direct_pct, pct: '2.00' }, null, null)!
    expect(r.mode).toBe('percent')
    expect(r.directUnit).toBe('%')
    expect(r.percent).toBe(2)
    const back = toRateSpecPayload(r)
    expect(back.spec).toEqual({ mode: RateSpecMode.direct_pct, pct: '2' })
  })

  it('round-trips a fraction spec (% base) preserving num/den/base', () => {
    const spec = {
      mode: RateSpecMode.fraction,
      num: 1,
      den: 3,
      base_value: '4',
      base_unit: RateSpecBase_unit.pct,
    }
    const r = fromRateSpec(spec, null, null)!
    const back = toRateSpecPayload(r)
    expect(back.spec).toEqual({ ...spec, pct: null })
  })
})

describe('rateSpecToPair', () => {
  it('returns all-null for nullish spec', () => {
    expect(rateSpecToPair(null)).toEqual({ pct: null, amt: null })
    expect(rateSpecToPair(undefined)).toEqual({ pct: null, amt: null })
  })

  it('derives % from a direct_pct spec', () => {
    expect(rateSpecToPair({ mode: RateSpecMode.direct_pct, pct: '2.5' })).toEqual({
      pct: 2.5,
      amt: null,
    })
  })

  it('derives % from a fraction-of-% spec (1/3 of 4% = 1.333…)', () => {
    const pair = rateSpecToPair({
      mode: RateSpecMode.fraction,
      num: 1,
      den: 3,
      base_value: '4',
      base_unit: RateSpecBase_unit.pct,
    })
    expect(pair.amt).toBeNull()
    expect(pair.pct).toBeCloseTo(1.3333, 4)
  })

  it('rounds the derived % to 4 dp for display (2/3 of 4% = 2.6667, not 2.6666…65)', () => {
    const pair = rateSpecToPair({
      mode: RateSpecMode.fraction,
      num: 2,
      den: 3,
      base_value: '4',
      base_unit: RateSpecBase_unit.pct,
    })
    expect(pair.pct).toBe(2.6667)
  })

  it('prefers the BE-provided display_pct over the recomputed fraction', () => {
    const pair = rateSpecToPair({
      mode: RateSpecMode.fraction,
      num: 2,
      den: 3,
      base_value: '4',
      base_unit: RateSpecBase_unit.pct,
      display_pct: '2.6667',
    })
    expect(pair.pct).toBe(2.6667)
  })

  it('derives ₫ from a fraction-of-₫ spec (1/2 of 300tr = 150tr)', () => {
    expect(
      rateSpecToPair({
        mode: RateSpecMode.fraction,
        num: 1,
        den: 2,
        base_value: '300000000',
        base_unit: RateSpecBase_unit.vnd,
      })
    ).toEqual({ pct: null, amt: 150_000_000 })
  })
})

describe('resolveRateTriple', () => {
  it('returns all-null when spec + both caches are empty', () => {
    expect(resolveRateTriple(null, null, null)).toEqual({ pct: null, amt: null })
    expect(resolveRateTriple(undefined, '', '')).toEqual({ pct: null, amt: null })
  })

  it('prefers the spec over flat caches (fraction → derived %, 4 dp)', () => {
    const pair = resolveRateTriple(
      {
        mode: RateSpecMode.fraction,
        num: 2,
        den: 3,
        base_value: '4',
        base_unit: RateSpecBase_unit.pct,
      },
      // caches that would be ignored because the spec wins
      99,
      88
    )
    expect(pair).toEqual({ pct: 2.6667, amt: null })
  })

  it('derives % / đ from a spec even with null caches (flattened response)', () => {
    expect(resolveRateTriple({ mode: RateSpecMode.direct_pct, pct: '2.5' }, null, null)).toEqual({
      pct: 2.5,
      amt: null,
    })
  })

  it('falls back to the flat pct cache (rounded 4 dp) when spec is null', () => {
    expect(resolveRateTriple(null, '2.66666666', null)).toEqual({ pct: 2.6667, amt: null })
    expect(resolveRateTriple(null, 3, null)).toEqual({ pct: 3, amt: null })
  })

  it('falls back to the flat amt cache when spec + pct are null', () => {
    expect(resolveRateTriple(null, null, '5000000')).toEqual({ pct: null, amt: 5_000_000 })
  })

  it('prefers pct over amt when both flat caches are present (XOR violated defensively)', () => {
    expect(resolveRateTriple(null, '2', '5000000')).toEqual({ pct: 2, amt: null })
  })

  it('prefers amt over pct when pct is 0 (or 0.00) and amt is positive (fixed amount commission)', () => {
    expect(resolveRateTriple(null, '0.00', '5000000')).toEqual({ pct: null, amt: 5_000_000 })
    expect(resolveRateTriple(null, 0, '5000000')).toEqual({ pct: null, amt: 5_000_000 })
  })

  it('falls back to flat caches when spec is direct_pct but has no pct value (empty spec)', () => {
    expect(
      resolveRateTriple({ mode: RateSpecMode.direct_pct, pct: null }, null, '5000000')
    ).toEqual({ pct: null, amt: 5_000_000 })
  })
})

describe('formatRateSpecFraction', () => {
  it('returns null for nullish / non-fraction specs', () => {
    expect(formatRateSpecFraction(null)).toBeNull()
    expect(formatRateSpecFraction({ mode: RateSpecMode.direct_pct, pct: '2' })).toBeNull()
  })

  it('formats a fraction-of-% spec as "x / y của z%"', () => {
    expect(
      formatRateSpecFraction({
        mode: RateSpecMode.fraction,
        num: 1,
        den: 3,
        base_value: '4',
        base_unit: RateSpecBase_unit.pct,
      })
    ).toBe('1 / 3 của 4%')
  })

  it('formats a fraction-of-₫ spec with thousand separators', () => {
    expect(
      formatRateSpecFraction({
        mode: RateSpecMode.fraction,
        num: 1,
        den: 2,
        base_value: '300000000',
        base_unit: RateSpecBase_unit.vnd,
      })
    ).toBe('1 / 2 của 300.000.000 đ')
  })
})

describe('formatRateSpecEquivalent', () => {
  it('returns null for nullish / non-fraction specs', () => {
    expect(formatRateSpecEquivalent(null)).toBeNull()
    expect(formatRateSpecEquivalent(undefined)).toBeNull()
    expect(formatRateSpecEquivalent({ mode: RateSpecMode.direct_pct, pct: '2' })).toBeNull()
  })

  it('renders a %-base fraction as a rate, preferring the BE display_pct over recomputation', () => {
    // 2/3 × 4 = 2.6666666666666665 khi tự nhân; BE chốt 2.6667 ⇒ phải lấy của BE.
    expect(
      formatRateSpecEquivalent({
        mode: RateSpecMode.fraction,
        num: 2,
        den: 3,
        base_value: '4',
        base_unit: RateSpecBase_unit.pct,
        display_pct: '2.6667',
      })
    ).toBe('2,667%')
  })

  it('keeps the 2-decimal minimum so a clean half still reads as a rate', () => {
    expect(
      formatRateSpecEquivalent({
        mode: RateSpecMode.fraction,
        num: 1,
        den: 2,
        base_value: '6',
        base_unit: RateSpecBase_unit.pct,
        display_pct: '3.0000',
      })
    ).toBe('3,00%')
  })

  it('renders a ₫-base fraction as MONEY, not a percentage', () => {
    // Payload thật trên dev 26/08/2026: BE để display_pct null cho base vnd, nên nhánh này phải tự
    // tính từ phân số. Nếu ghép cứng '%' thì dòng này in ra "33.333.333%".
    expect(
      formatRateSpecEquivalent({
        mode: RateSpecMode.fraction,
        num: 1,
        den: 3,
        base_value: '100000000.0000',
        base_unit: RateSpecBase_unit.vnd,
        // Schema khai `display_pct: string` KHÔNG nullable, nhưng BE trả null thật cho base vnd
        // (kiểm dev 26/08/2026). Cast tại chỗ thay vì nới type dùng chung; khi BE sửa serializer
        // cho đúng nullable thì dòng này gãy và nhắc gỡ cast.
        display_pct: null as unknown as string,
      })
    ).toBe('33.333.333 đ')
  })

  it('returns null when the fraction is missing the pieces needed to resolve it', () => {
    expect(
      formatRateSpecEquivalent({
        mode: RateSpecMode.fraction,
        num: 1,
        den: null,
        base_value: '6',
        base_unit: RateSpecBase_unit.pct,
      })
    ).toBeNull()
  })
})

describe('formatRateSpecWithEquivalent', () => {
  it('returns null for nullish / non-fraction specs so callers fall back to plain %/₫', () => {
    expect(formatRateSpecWithEquivalent(null)).toBeNull()
    expect(formatRateSpecWithEquivalent({ mode: RateSpecMode.direct_pct, pct: '2' })).toBeNull()
  })

  it('joins the fraction with its resolved rate', () => {
    expect(
      formatRateSpecWithEquivalent({
        mode: RateSpecMode.fraction,
        num: 1,
        den: 2,
        base_value: '6',
        base_unit: RateSpecBase_unit.pct,
        display_pct: '3.0000',
      })
    ).toBe('1 / 2 của 6% ≈ 3,00%')
  })

  it('joins a ₫-base fraction with its resolved amount', () => {
    expect(
      formatRateSpecWithEquivalent({
        mode: RateSpecMode.fraction,
        num: 1,
        den: 3,
        base_value: '100000000.0000',
        base_unit: RateSpecBase_unit.vnd,
        // Schema khai `display_pct: string` KHÔNG nullable, nhưng BE trả null thật cho base vnd
        // (kiểm dev 26/08/2026). Cast tại chỗ thay vì nới type dùng chung; khi BE sửa serializer
        // cho đúng nullable thì dòng này gãy và nhắc gỡ cast.
        display_pct: null as unknown as string,
      })
    ).toBe('1 / 3 của 100.000.000 đ ≈ 33.333.333 đ')
  })

  it('degrades to the bare fraction when the equivalent cannot be resolved', () => {
    // Mẫu số rỗng: vẫn cho người đọc thấy phân số đang cấu hình, chỉ không có phần "≈".
    expect(
      formatRateSpecWithEquivalent({
        mode: RateSpecMode.fraction,
        num: 1,
        den: 0,
        base_value: '6',
        base_unit: RateSpecBase_unit.pct,
      })
    ).toBe('1 / 0 của 6%')
  })
})

describe('resolveRowIsAmt', () => {
  describe('partner or collaborator staff type', () => {
    it('returns true when amt_commission is set as a non-empty string or number', () => {
      const staffPartnerAmt = {
        sale_type: 'partner',
        amt_commission: '50000000',
        pct_commission: null,
      }
      expect(resolveRowIsAmt(staffPartnerAmt, 'booking', false)).toBe(true)
      expect(resolveRowIsAmt(staffPartnerAmt, 'deposit', false)).toBe(true)

      const staffColAmt = { sale_type: 'collaborator', amt_commission: 1000000 }
      expect(resolveRowIsAmt(staffColAmt, 'booking', false)).toBe(true)
    })

    it('returns false when pct_commission is set as a non-empty string or number', () => {
      const staffPartnerPct = { sale_type: 'partner', pct_commission: '2.5', amt_commission: null }
      expect(resolveRowIsAmt(staffPartnerPct, 'booking', true)).toBe(false)
      expect(resolveRowIsAmt(staffPartnerPct, 'deposit', true)).toBe(false)

      const staffColPct = { sale_type: 'collaborator', pct_commission: 3 }
      expect(resolveRowIsAmt(staffColPct, 'booking', true)).toBe(false)
    })
  })

  describe('internal mv staff or others', () => {
    it('forces global isAmtCommission when module is booking', () => {
      const staffMvAmt = { sale_type: 'mv', amt_commission: '1000000' }
      // Booking module forces it to follow global isAmtCommission (false)
      expect(resolveRowIsAmt(staffMvAmt, 'booking', false)).toBe(false)
      // Deposit module respects the row-level amt_commission
      expect(resolveRowIsAmt(staffMvAmt, 'deposit', false)).toBe(true)
    })

    it('falls back to global isAmtCommission when neither is set', () => {
      const staffEmpty = { sale_type: 'mv', amt_commission: null, pct_commission: null }
      expect(resolveRowIsAmt(staffEmpty, 'booking', true)).toBe(true)
      expect(resolveRowIsAmt(staffEmpty, 'booking', false)).toBe(false)
      expect(resolveRowIsAmt(staffEmpty, 'deposit', true)).toBe(true)
      expect(resolveRowIsAmt(staffEmpty, 'deposit', false)).toBe(false)
    })
  })
})
