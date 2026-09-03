import { describe, it, expect } from 'vitest'

import {
  buildExchangeLabel,
  buildExchangeOption,
  isSourceExchangeQueryKey,
} from '@/features/exchange/_shares/utils/exchange-option.ts'

describe('buildExchangeLabel', () => {
  it('formats "name (code)" when both are present (trimmed)', () => {
    expect(buildExchangeLabel({ id: 3, name: '  Sàn ABC ', code: ' EX01 ' })).toBe('Sàn ABC (EX01)')
  })

  it('falls back to name / code / id when parts are missing', () => {
    expect(buildExchangeLabel({ id: 3, name: 'Sàn ABC' })).toBe('Sàn ABC')
    expect(buildExchangeLabel({ id: 3, code: 'EX01' })).toBe('EX01')
    expect(buildExchangeLabel({ id: 3 })).toBe('3')
    expect(buildExchangeLabel({ id: 9, name: null, code: null })).toBe('9')
  })
})

describe('buildExchangeOption', () => {
  it('builds { value: stringified id, label: buildExchangeLabel }', () => {
    expect(buildExchangeOption({ id: 42, name: 'Sàn X', code: 'X' })).toEqual({
      value: '42',
      label: 'Sàn X (X)',
    })
  })
})

describe('isSourceExchangeQueryKey', () => {
  it('matches only source-exchange (F0) caches under the realestate namespace', () => {
    expect(isSourceExchangeQueryKey(['realestate', 'source-exchanges', 'dropdown', '{}'])).toBe(
      true
    )
    expect(isSourceExchangeQueryKey(['realestate', 'source-exchanges', 'detail', 5])).toBe(true)
  })

  it('does NOT match the F2 exchange cache nor the sale-allocation detail cache', () => {
    expect(isSourceExchangeQueryKey(['realestate', 'exchanges', 'list', '{}'])).toBe(false)
    expect(isSourceExchangeQueryKey(['realestate', 'sale-allocations', 'detail', 5])).toBe(false)
  })

  it('is safe on non-array / unrelated keys', () => {
    expect(isSourceExchangeQueryKey('source-exchanges')).toBe(false)
    expect(isSourceExchangeQueryKey(undefined)).toBe(false)
  })
})
