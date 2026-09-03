import { describe, it, expect } from 'vitest'
import { formatPct } from '@/utils/common'
import {
  getRecipientIdentity,
  getParticipantName,
  getRecipientKey,
  formatAmt,
  isSaleRecipient,
} from '../commission-recipient'

describe('commission-recipient utilities', () => {
  describe('getRecipientIdentity', () => {
    it('should return undefined for null or undefined share', () => {
      expect(getRecipientIdentity(null)).toBeUndefined()
      expect(getRecipientIdentity(undefined)).toBeUndefined()
    })

    it('should identify collaborator preferred kinds (ctv_with_source, f2_agency)', () => {
      const ctvShare = {
        recipient_kind: 'ctv_with_source',
        collaborator: { id: 123, name: 'CTV A' },
      }
      expect(getRecipientIdentity(ctvShare)).toEqual({
        kind: 'collaborator',
        id: '123',
      })

      const agencyShare = {
        recipient_kind: 'f2_agency',
        collaborator: { id: 456, name: 'Agency B' },
      }
      expect(getRecipientIdentity(agencyShare)).toEqual({
        kind: 'collaborator',
        id: '456',
      })
    })

    it('should identify exchange preferred kind (f2_exchange)', () => {
      const exchangeShare = {
        recipient_kind: 'f2_exchange',
        exchange: { id: 'ex-789', name: 'Exchange C' },
      }
      expect(getRecipientIdentity(exchangeShare)).toEqual({
        kind: 'exchange',
        id: 'ex-789',
      })
    })

    it('should identify employee when not an F2 collaborator kind', () => {
      const employeeShare = {
        recipient_kind: 'employee',
        employee: { id: 999, fullname: 'Staff X' },
      }
      expect(getRecipientIdentity(employeeShare)).toEqual({
        kind: 'employee',
        id: '999',
      })
    })

    it('should fall back to RECIPIENT_KIND_ORDER if preferred kind lacks an id', () => {
      const fallbackShare = {
        recipient_kind: 'ctv_with_source',
        collaborator: null, // lacks ID
        employee: { id: 111, fullname: 'Staff Fallback' },
      }
      expect(getRecipientIdentity(fallbackShare)).toEqual({
        kind: 'employee',
        id: '111',
      })
    })

    it('should scan RECIPIENT_KIND_ORDER when recipient_kind is not defined', () => {
      const scanShare = {
        exchange: { id: 555, name: 'Exchange' },
      }
      expect(getRecipientIdentity(scanShare)).toEqual({
        kind: 'exchange',
        id: '555',
      })
    })

    it('should return undefined when no recipient info has an ID', () => {
      const invalidShare = JSON.parse('{"employee": {"fullname": "No ID"}}')
      expect(getRecipientIdentity(invalidShare)).toBeUndefined()
    })
  })

  describe('getParticipantName', () => {
    it('should return default text when share is empty', () => {
      expect(getParticipantName(null)).toBe('Không xác định')
    })

    it('should resolve employee fullname or name correctly', () => {
      const shareWithFullname = {
        employee: { id: 1, fullname: 'Nguyễn Văn A' },
      }
      expect(getParticipantName(shareWithFullname)).toBe('Nguyễn Văn A')

      const shareWithName = {
        employee: { id: 2, name: 'Lê Văn B' },
      }
      expect(getParticipantName(shareWithName)).toBe('Lê Văn B')
    })

    it('should resolve name of non-employee recipients', () => {
      const shareCollaborator = {
        collaborator: { id: 10, name: 'Cộng Tác Viên X' },
      }
      expect(getParticipantName(shareCollaborator)).toBe('Cộng Tác Viên X')
    })

    it('should use basic scan fallback when getRecipientIdentity returns undefined', () => {
      const noIdentityShare = JSON.parse('{"employee": {"fullname": "Nguyễn Văn C"}}')
      expect(getParticipantName(noIdentityShare)).toBe('Nguyễn Văn C')
    })
  })

  describe('getRecipientKey', () => {
    it('should construct key using identity kind and id', () => {
      const share = {
        employee: { id: 123, fullname: 'Staff Name' },
      }
      expect(getRecipientKey(share)).toBe('employee_123')
    })

    it('should fall back to participant name if identity cannot be resolved', () => {
      const noIdShare = JSON.parse('{"employee": {"fullname": "No ID Staff"}}')
      expect(getRecipientKey(noIdShare)).toBe('name_No ID Staff')
    })
  })

  describe('formatAmt', () => {
    it('should return dash when value is empty, null, or undefined', () => {
      expect(formatAmt(null)).toBe('—')
      expect(formatAmt(undefined)).toBe('—')
      expect(formatAmt('')).toBe('—')
    })

    it('should format numeric values in VND currency format', () => {
      expect(formatAmt(1000000)).toContain('1.000.000')
      expect(formatAmt('2500000')).toContain('2.500.000')
    })
  })

  describe('formatPct', () => {
    it('should return dash when value is empty, null, or undefined', () => {
      expect(formatPct(null)).toBe('—')
      expect(formatPct(undefined)).toBe('—')
      expect(formatPct('')).toBe('—')
    })

    it('should append percentage suffix to numeric values', () => {
      expect(formatPct(15.5)).toBe('15,5%')
      expect(formatPct('20')).toBe('20%')
    })
  })

  describe('isSaleRecipient', () => {
    it('returns true for employee or collaborator shares', () => {
      expect(isSaleRecipient({ employee: { id: 1 } })).toBe(true)
      expect(isSaleRecipient({ recipient_kind: 'ctv_with_source', collaborator: { id: 2 } })).toBe(
        true
      )
    })

    it('returns false for exchange or missing shares', () => {
      expect(isSaleRecipient({ recipient_kind: 'f2_exchange', exchange: { id: 3 } })).toBe(false)
      expect(isSaleRecipient(null)).toBe(false)
    })
  })
})
