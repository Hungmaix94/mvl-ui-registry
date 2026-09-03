import { describe, expect, it } from 'vitest'
import { CommissionAdvanceStatus } from '@/features/accounting/commission-advances/components/CommissionAdvanceStatusBadge'
import {
  isAwaitingAccountant,
  isAdminApprovable,
  isRejectable,
  isDeletable,
} from './commission-advance-row-actions'

const S = CommissionAdvanceStatus

describe('commission-advance row-action predicates', () => {
  describe('isAwaitingAccountant', () => {
    it('is true for PENDING_ACCOUNTANT and DRAFT only', () => {
      expect(isAwaitingAccountant(S.PENDING_ACCOUNTANT)).toBe(true)
      expect(isAwaitingAccountant(S.DRAFT)).toBe(true)
      expect(isAwaitingAccountant(S.PENDING_ADMIN)).toBe(false)
      expect(isAwaitingAccountant(S.PENDING_ADMIN_LEAD)).toBe(false)
      expect(isAwaitingAccountant(S.APPROVED)).toBe(false)
    })
  })

  describe('isAdminApprovable (TKKD step)', () => {
    it('is true only at PENDING_ADMIN — the mobile-initiated TKKD tier', () => {
      expect(isAdminApprovable(S.PENDING_ADMIN)).toBe(true)
      expect(isAdminApprovable(S.PENDING_ADMIN_LEAD)).toBe(false)
      expect(isAdminApprovable(S.PENDING_ACCOUNTANT)).toBe(false)
      expect(isAdminApprovable(S.DRAFT)).toBe(false)
    })
  })

  describe('isRejectable', () => {
    it('covers every pending ladder tier the backend reject accepts, including PENDING_ADMIN', () => {
      expect(isRejectable(S.PENDING_ADMIN)).toBe(true)
      expect(isRejectable(S.PENDING_ADMIN_LEAD)).toBe(true)
      expect(isRejectable(S.PENDING_ACCOUNTANT)).toBe(true)
      expect(isRejectable(S.DRAFT)).toBe(true)
    })

    it('is false once the advance has left the pending ladder', () => {
      expect(isRejectable(S.APPROVED)).toBe(false)
      expect(isRejectable(S.REJECTED)).toBe(false)
      expect(isRejectable(S.PAID)).toBe(false)
      expect(isRejectable(S.CANCELLED)).toBe(false)
    })
  })

  describe('isDeletable', () => {
    it('allows the web-side tiers and a returned (REJECTED) advance', () => {
      expect(isDeletable(S.PENDING_ADMIN_LEAD)).toBe(true)
      expect(isDeletable(S.PENDING_ACCOUNTANT)).toBe(true)
      expect(isDeletable(S.DRAFT)).toBe(true)
      expect(isDeletable(S.REJECTED)).toBe(true)
    })

    it('excludes PENDING_ADMIN (creator-only delete on the backend) and disbursed states', () => {
      expect(isDeletable(S.PENDING_ADMIN)).toBe(false)
      expect(isDeletable(S.APPROVED)).toBe(false)
      expect(isDeletable(S.PAID)).toBe(false)
      expect(isDeletable(S.CANCELLED)).toBe(false)
    })
  })
})
