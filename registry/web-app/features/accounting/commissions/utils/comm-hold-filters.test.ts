import { describe, expect, it } from 'vitest'

import {
  splitTaxBaseLabel,
  buildCommHoldApiParams,
  countActiveCommHoldFilters,
  heldAtRangeToParams,
  paramsToHeldAtRange,
  type CommHoldFilterValues,
} from './comm-hold-filters'
import {
  CommissionHoldReason as HoldReason,
  CommissionHoldStatus as HoldStatus,
  CommissionHoldTaxBase as TaxBase,
} from '@/constants/api-schema-aliases'

describe('buildCommHoldApiParams', () => {
  it('omits tax_base when not filtered so PRE_TAX + POST_TAX are merged into one list', () => {
    const params = buildCommHoldApiParams({ filters: {}, page: 1, pageSize: 20 })

    expect(params).toEqual({ page: 1, page_size: 20 })
    expect('tax_base' in params!).toBe(false)
  })

  it('sends tax_base only when the user explicitly filters by it', () => {
    const params = buildCommHoldApiParams({
      filters: { tax_base: TaxBase.POST_TAX },
      page: 2,
      pageSize: 50,
    })

    expect(params!.tax_base).toBe(TaxBase.POST_TAX)
    expect(params!.page).toBe(2)
    expect(params!.page_size).toBe(50)
  })

  it('passes the held date range params through (held_at_after / held_at_before)', () => {
    const params = buildCommHoldApiParams({
      filters: { held_at_after: '2026-01-01', held_at_before: '2026-01-31' },
      page: 1,
      pageSize: 20,
    })

    expect(params!.held_at_after).toBe('2026-01-01')
    expect(params!.held_at_before).toBe('2026-01-31')
  })

  it('maps org + status + reason + employee_code + search into API params', () => {
    const filters: CommHoldFilterValues = {
      status: HoldStatus.RELEASED,
      branch_id: 3,
      block_id: 4,
      department_id: 5,
      employee_code: 'NV001',
      hold_reason: HoldReason.CARRYOVER,
    }

    const params = buildCommHoldApiParams({ filters, page: 1, pageSize: 20, search: 'abc' })

    expect(params).toMatchObject({
      page: 1,
      page_size: 20,
      status: HoldStatus.RELEASED,
      branch: 3,
      block: 4,
      department: 5,
      employee_code: 'NV001',
      hold_reason: HoldReason.CARRYOVER,
      search: 'abc',
    })
  })

  it('drops falsy / empty filters (empty string, undefined, null, 0)', () => {
    const params = buildCommHoldApiParams({
      filters: {
        status: null,
        branch_id: 0,
        employee_code: '',
        hold_reason: undefined,
        tax_base: '',
      },
      page: 1,
      pageSize: 20,
      search: '',
    })

    expect(params).toEqual({ page: 1, page_size: 20 })
  })
})

describe('countActiveCommHoldFilters', () => {
  it('returns 0 for an empty filter set', () => {
    expect(countActiveCommHoldFilters({})).toBe(0)
  })

  it('counts each active filter once (org counts branch/block/department separately)', () => {
    const filters: CommHoldFilterValues = {
      status: HoldStatus.ACTIVE,
      branch_id: 1,
      block_id: 2,
      department_id: 3,
      employee_code: 'NV9',
      hold_reason: HoldReason.MANUAL,
      tax_base: TaxBase.PRE_TAX,
    }

    expect(countActiveCommHoldFilters(filters)).toBe(7)
  })

  it('ignores falsy values (0 / empty string / null)', () => {
    expect(countActiveCommHoldFilters({ branch_id: 0, employee_code: '', status: null })).toBe(0)
  })

  it('counts the held date range as a single filter (either end active)', () => {
    expect(countActiveCommHoldFilters({ held_at_after: '2026-01-01' })).toBe(1)
    expect(countActiveCommHoldFilters({ held_at_before: '2026-01-31' })).toBe(1)
    expect(
      countActiveCommHoldFilters({ held_at_after: '2026-01-01', held_at_before: '2026-01-31' })
    ).toBe(1)
  })
})

describe('held date range <-> params converters', () => {
  it('heldAtRangeToParams serialises from/to to yyyy-MM-dd', () => {
    const params = heldAtRangeToParams({
      from: new Date(2026, 0, 5),
      to: new Date(2026, 0, 20),
    })

    expect(params).toEqual({ held_at_after: '2026-01-05', held_at_before: '2026-01-20' })
  })

  it('heldAtRangeToParams omits missing ends and returns {} for undefined', () => {
    expect(heldAtRangeToParams({ from: new Date(2026, 0, 5), to: undefined })).toEqual({
      held_at_after: '2026-01-05',
    })
    expect(heldAtRangeToParams(undefined)).toEqual({})
  })

  it('paramsToHeldAtRange round-trips back to a DateRange', () => {
    const range = paramsToHeldAtRange({ held_at_after: '2026-01-05', held_at_before: '2026-01-20' })

    expect(heldAtRangeToParams(range)).toEqual({
      held_at_after: '2026-01-05',
      held_at_before: '2026-01-20',
    })
  })

  it('paramsToHeldAtRange returns undefined when both ends are empty', () => {
    expect(paramsToHeldAtRange({})).toBeUndefined()
    expect(paramsToHeldAtRange({ held_at_after: null, held_at_before: null })).toBeUndefined()
  })
})

describe('splitTaxBaseLabel', () => {
  it('splits the parenthetical note off the head label', () => {
    expect(splitTaxBaseLabel('Sau thuế (tính thuế ngay; giữ lại từ số ròng)')).toEqual({
      head: 'Sau thuế',
      note: 'tính thuế ngay; giữ lại từ số ròng',
    })
    expect(splitTaxBaseLabel('Trước thuế (giữ trên số gộp)')).toEqual({
      head: 'Trước thuế',
      note: 'giữ trên số gộp',
    })
  })

  it('keeps labels without a note intact', () => {
    expect(splitTaxBaseLabel('Sau thuế')).toEqual({ head: 'Sau thuế', note: null })
    expect(splitTaxBaseLabel('  Trước thuế  ')).toEqual({ head: 'Trước thuế', note: null })
  })

  it('falls back to the raw label when the parentheses are unbalanced', () => {
    expect(splitTaxBaseLabel('Sau thuế (chưa đóng')).toEqual({
      head: 'Sau thuế (chưa đóng',
      note: null,
    })
  })

  it('keeps a note-only label raw so the cell never renders an empty first line', () => {
    expect(splitTaxBaseLabel(' (tính thuế ngay)')).toEqual({
      head: '(tính thuế ngay)',
      note: null,
    })
  })

  it('keeps nested parentheses inside the note', () => {
    expect(splitTaxBaseLabel('Sau thuế (gồm TNCN (10%))')).toEqual({
      head: 'Sau thuế',
      note: 'gồm TNCN (10%)',
    })
  })
})
