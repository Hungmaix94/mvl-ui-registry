import { describe, it, expect } from 'vitest'

import { toSelectId, mergeSelectOption } from '@/utils/select-option-utils.ts'
import type { SelectOption } from '@/components/ui/select/Select'

describe('toSelectId', () => {
  it('coerces a single string/number value to a number', () => {
    expect(toSelectId('42')).toBe(42)
    expect(toSelectId(42)).toBe(42)
  })

  it('takes the first element of an array (single-select semantics)', () => {
    expect(toSelectId(['7', '8'])).toBe(7)
  })

  it('returns null for null, empty string, or empty array (clearing)', () => {
    expect(toSelectId(null)).toBeNull()
    expect(toSelectId('')).toBeNull()
    expect(toSelectId([])).toBeNull()
  })
})

describe('mergeSelectOption', () => {
  const a: SelectOption = { value: '1', label: 'A' }
  const b: SelectOption = { value: '2', label: 'B' }

  it('prepends a new option', () => {
    expect(mergeSelectOption([a], b)).toEqual([b, a])
  })

  it('dedupes by value (replacing an existing option, still at the front)', () => {
    const updatedA: SelectOption = { value: '1', label: 'A (updated)' }
    expect(mergeSelectOption([a, b], updatedA)).toEqual([updatedA, b])
  })

  it('does not mutate the input array', () => {
    const input = [a]
    mergeSelectOption(input, b)
    expect(input).toEqual([a])
  })
})
