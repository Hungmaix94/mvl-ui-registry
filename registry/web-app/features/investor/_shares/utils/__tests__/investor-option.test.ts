import { describe, it, expect } from 'vitest'

import {
  buildInvestorLabel,
  buildInvestorOption,
  isInvestorQueryKey,
  mergeInvestorOption,
  toInvestorId,
} from '@/features/investor/_shares/utils/investor-option.ts'
import type { SelectOption } from '@/components/ui/select/Select'

describe('buildInvestorLabel', () => {
  it('formats "code - name" when both are present (trimmed)', () => {
    expect(buildInvestorLabel({ id: 7, code: '  CDT001 ', name: ' Vinhomes ' })).toBe(
      'CDT001 - Vinhomes'
    )
  })

  it('falls back to name / code / id when parts are missing', () => {
    expect(buildInvestorLabel({ id: 7, name: 'Vinhomes' })).toBe('Vinhomes')
    expect(buildInvestorLabel({ id: 7, code: 'CDT001' })).toBe('CDT001')
    expect(buildInvestorLabel({ id: 7 })).toBe('7')
    expect(buildInvestorLabel({ id: 9, code: null, name: null })).toBe('9')
  })
})

describe('buildInvestorOption', () => {
  it('builds { value: stringified id, label: buildInvestorLabel }', () => {
    expect(buildInvestorOption({ id: 42, code: 'X', name: 'Y' })).toEqual({
      value: '42',
      label: 'X - Y',
    })
  })
})

describe('toInvestorId', () => {
  it('coerces a single string/number value to a number', () => {
    expect(toInvestorId('42')).toBe(42)
    expect(toInvestorId(42)).toBe(42)
  })

  it('takes the first element of an array (single-select semantics)', () => {
    expect(toInvestorId(['7', '8'])).toBe(7)
  })

  it('returns null for null, empty string, or empty array (clearing)', () => {
    expect(toInvestorId(null)).toBeNull()
    expect(toInvestorId('')).toBeNull()
    expect(toInvestorId([])).toBeNull()
  })
})

describe('isInvestorQueryKey', () => {
  it('matches only investor caches under the realestate namespace', () => {
    expect(isInvestorQueryKey(['realestate', 'investors', 'dropdown', '{}'])).toBe(true)
    expect(isInvestorQueryKey(['realestate', 'investors', 'detail', 5])).toBe(true)
  })

  it('does NOT match the project detail cache (guards the ProjectForm-clobber fix)', () => {
    expect(isInvestorQueryKey(['realestate', 'projects', 'detail', 5])).toBe(false)
  })

  it('is safe on non-array / unrelated keys', () => {
    expect(isInvestorQueryKey('investors')).toBe(false)
    expect(isInvestorQueryKey(['sales', 'customers'])).toBe(false)
    expect(isInvestorQueryKey(undefined)).toBe(false)
  })
})

describe('mergeInvestorOption', () => {
  const a: SelectOption = { value: '1', label: 'A' }
  const b: SelectOption = { value: '2', label: 'B' }

  it('prepends a new option', () => {
    expect(mergeInvestorOption([a], b)).toEqual([b, a])
  })

  it('dedupes by value (replacing an existing option, still at the front)', () => {
    const updatedA: SelectOption = { value: '1', label: 'A (updated)' }
    expect(mergeInvestorOption([a, b], updatedA)).toEqual([updatedA, b])
  })

  it('does not mutate the input array', () => {
    const input = [a]
    mergeInvestorOption(input, b)
    expect(input).toEqual([a])
  })
})
