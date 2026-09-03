import { describe, expect, it } from 'vitest'
import { LadDebtRateSource } from '@/constants/api-schema-aliases'
import {
  buildLadDebtFilterParams,
  countActiveLadDebtFilters,
  parseLadDebtFilters,
} from './lad-debt-filters'

describe('parseLadDebtFilters', () => {
  it('returns all-null/false defaults for an empty query string', () => {
    expect(parseLadDebtFilters(new URLSearchParams())).toEqual({
      projectId: null,
      investorId: null,
      dealId: null,
      rateSource: null,
      hasOutstanding: false,
    })
  })

  it('parses valid numeric and enum values', () => {
    const params = new URLSearchParams(
      'project_id=12&investor_id=34&deal_id=56&rate_source=pending_lad&has_outstanding=1'
    )
    expect(parseLadDebtFilters(params)).toEqual({
      projectId: 12,
      investorId: 34,
      dealId: 56,
      rateSource: LadDebtRateSource.pending_lad,
      hasOutstanding: true,
    })
  })

  it('drops an unrecognised rate_source value instead of passing it through', () => {
    const params = new URLSearchParams('rate_source=not-a-real-source')
    expect(parseLadDebtFilters(params).rateSource).toBeNull()
  })
})

describe('buildLadDebtFilterParams', () => {
  it('writes only the truthy filters into the URL', () => {
    const result = buildLadDebtFilterParams(new URLSearchParams(), {
      projectId: 12,
      investorId: null,
      dealId: null,
      rateSource: LadDebtRateSource.current_config,
      hasOutstanding: true,
    })
    expect(result.get('project_id')).toBe('12')
    expect(result.has('investor_id')).toBe(false)
    expect(result.has('deal_id')).toBe(false)
    expect(result.get('rate_source')).toBe('current_config')
    expect(result.get('has_outstanding')).toBe('1')
  })

  it('deletes a previously-set filter when cleared to null/false', () => {
    const prev = new URLSearchParams('project_id=12&has_outstanding=1')
    const result = buildLadDebtFilterParams(prev, {
      projectId: null,
      investorId: null,
      dealId: null,
      rateSource: null,
      hasOutstanding: false,
    })
    expect(result.has('project_id')).toBe(false)
    expect(result.has('has_outstanding')).toBe(false)
  })
})

describe('countActiveLadDebtFilters', () => {
  it('counts 0 for an empty query string', () => {
    expect(countActiveLadDebtFilters(new URLSearchParams())).toBe(0)
  })

  it('counts each independently-set filter', () => {
    const params = new URLSearchParams('project_id=1&investor_id=2&has_outstanding=1')
    expect(countActiveLadDebtFilters(params)).toBe(3)
  })
})
