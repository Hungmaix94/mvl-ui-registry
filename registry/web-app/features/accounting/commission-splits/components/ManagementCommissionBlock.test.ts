import { describe, expect, it, vi } from 'vitest'

// Mock Firebase dependencies which require browser environment
vi.mock('@/lib/firebase', () => ({
  messaging: null,
  getFCMToken: vi.fn(),
}))
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}))
vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
}))
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  onMessage: vi.fn(),
}))

import {
  getPositionAmount,
  getPositionConfigured,
  getPositionHold,
  sumPositionConfigured,
} from './ManagementCommissionBlock'

describe('ManagementCommissionBlock calculations', () => {
  describe('getPositionAmount', () => {
    it('returns actual_amount if no recipients are provided', () => {
      const position = {
        posData: {
          actual_amount: 150000,
          recipients: null,
        },
      }
      expect(getPositionAmount(position)).toBe(150000)
    })

    it('sums recipient amounts when they exist', () => {
      const position = {
        posData: {
          actual_amount: 150000,
          recipients: [{ amount: '50000' }, { amount: '60000' }],
        },
      }
      expect(getPositionAmount(position)).toBe(110000)
    })

    it('returns actual_amount if recipients exist but sum is 0', () => {
      const position = {
        posData: {
          actual_amount: 150000,
          recipients: [{ amount: '0' }, { amount: '' }],
        },
      }
      expect(getPositionAmount(position)).toBe(150000)
    })
  })

  describe('getPositionHold', () => {
    it('returns admin_hold if no recipients exist', () => {
      const position = {
        posData: {
          admin_hold: 25000,
          recipients: null,
        },
      }
      expect(getPositionHold(position)).toBe(25000)
    })

    it('sums recipient account_hold_amount/hold_amount when they exist', () => {
      const position = {
        posData: {
          admin_hold: 25000,
          recipients: [{ account_hold_amount: '10000' }, { hold_amount: '15000' }],
        },
      }
      expect(getPositionHold(position)).toBe(25000)
    })

    it('returns admin_hold if recipients hold amounts sum is 0', () => {
      const position = {
        posData: {
          admin_hold: 25000,
          recipients: [{ hold_amount: '0' }, { account_hold_amount: '' }],
        },
      }
      expect(getPositionHold(position)).toBe(25000)
    })
  })

  // Số cấu hình là mẫu của chú thích "cấu hình × % TT phí" dưới mỗi ô hạng mục — thiếu nó
  // thì con số tiền lại thành một chỗ trống để người đọc tự suy diễn, đúng cái bug của
  // bảng "(2) Thưởng HH quản lý" bên màn 20.14.
  describe('getPositionConfigured', () => {
    it('reads the whole-unit configured amount of the share', () => {
      expect(getPositionConfigured({ posData: { share_full_amount: '1000000' } })).toBe(1000000)
    })

    it('returns null when BE served no base, so the caption is hidden instead of faked', () => {
      expect(getPositionConfigured({ posData: {} })).toBeNull()
      expect(getPositionConfigured({ posData: { share_full_amount: '' } })).toBeNull()
      expect(getPositionConfigured({ posData: { share_full_amount: 'n/a' } })).toBeNull()
      expect(getPositionConfigured({})).toBeNull()
    })
  })

  describe('sumPositionConfigured', () => {
    it('sums every position of one category', () => {
      expect(
        sumPositionConfigured([
          { posData: { share_full_amount: '50000' } },
          { posData: { share_full_amount: '100000' } },
        ])
      ).toBe(150000)
    })

    it('stays null when no position carries a base', () => {
      expect(sumPositionConfigured([{ posData: {} }, {}])).toBeNull()
      expect(sumPositionConfigured([])).toBeNull()
    })

    it('sums the positions that DO have a base and ignores the rest', () => {
      expect(
        sumPositionConfigured([{ posData: { share_full_amount: '50000' } }, { posData: {} }])
      ).toBe(50000)
    })
  })
})
