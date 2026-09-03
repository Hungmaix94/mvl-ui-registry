import { describe, it, expect } from 'vitest'
import { LinkedExchangeDeptCommissionStatus as StatusType } from '@/api/schema'
import { normalizeSlkStatus } from './slk-pool-utils'

describe('normalizeSlkStatus', () => {
  it('maps the UPPERCASE API values to the enum member', () => {
    // API returns BE TextChoices (uppercase); the generated enum is lowercase.
    expect(normalizeSlkStatus('DRAFT')).toBe(StatusType.DRAFT)
    expect(normalizeSlkStatus('REVIEWED')).toBe(StatusType.REVIEWED)
    expect(normalizeSlkStatus('POSTED')).toBe(StatusType.POSTED)
  })

  it('also accepts already-lowercase values (post schema realignment)', () => {
    expect(normalizeSlkStatus('draft')).toBe(StatusType.DRAFT)
  })

  it('returns undefined for unknown / empty input', () => {
    expect(normalizeSlkStatus('SOMETHING')).toBeUndefined()
    expect(normalizeSlkStatus(null)).toBeUndefined()
    expect(normalizeSlkStatus(undefined)).toBeUndefined()
  })
})
