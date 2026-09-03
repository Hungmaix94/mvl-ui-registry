import { describe, it, expect } from 'vitest'
import { payeeRefFromIdentityKey } from './share-payee-ref'

describe('payeeRefFromIdentityKey', () => {
  it('parses each payee kind', () => {
    expect(payeeRefFromIdentityKey('employee-13766')).toEqual({ employee_id: 13766 })
    expect(payeeRefFromIdentityKey('collaborator-136')).toEqual({ collaborator_id: 136 })
    expect(payeeRefFromIdentityKey('exchange-1936')).toEqual({ exchange_id: 1936 })
  })

  it('returns null for band-level (no row), name-only keys, or malformed keys', () => {
    expect(payeeRefFromIdentityKey(null)).toBeNull()
    expect(payeeRefFromIdentityKey(undefined)).toBeNull()
    expect(payeeRefFromIdentityKey('name-Nguyen Van A')).toBeNull()
    expect(payeeRefFromIdentityKey('employee-')).toBeNull()
    expect(payeeRefFromIdentityKey('employee-abc')).toBeNull()
  })
})
