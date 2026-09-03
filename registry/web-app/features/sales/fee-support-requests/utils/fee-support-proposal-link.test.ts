import { describe, it, expect } from 'vitest'

import { FeeSupportRequestStatus } from '@/constants/api-schema-aliases'

import type { FeeSupportRequestBrief } from '../services/fee-support-request-service'
import {
  canOfferFeeSupportCreate,
  classifyFeeSupportUntick,
  hasActiveFeeSupport,
  isDepositFeeSupportBlocked,
  isFeeSupportGateBlocked,
} from './fee-support-proposal-link'

const brief = (id: number, status: FeeSupportRequestStatus): FeeSupportRequestBrief =>
  ({ id, status }) as FeeSupportRequestBrief

describe('classifyFeeSupportUntick', () => {
  it('free khi không có phiếu', () => {
    expect(classifyFeeSupportUntick([])).toEqual({ kind: 'free' })
  })

  it('free khi mọi phiếu đã rejected/withdrawn (không active)', () => {
    const reqs = [
      brief(1, FeeSupportRequestStatus.rejected),
      brief(2, FeeSupportRequestStatus.withdrawn),
    ]
    expect(classifyFeeSupportUntick(reqs)).toEqual({ kind: 'free' })
  })

  it('cancellable + trả id các phiếu draft/pending active', () => {
    const reqs = [
      brief(1, FeeSupportRequestStatus.withdrawn),
      brief(2, FeeSupportRequestStatus.draft),
      brief(3, FeeSupportRequestStatus.pending_tpkd),
    ]
    expect(classifyFeeSupportUntick(reqs)).toEqual({
      kind: 'cancellable',
      cancellableIds: [2, 3],
    })
  })

  it('blocked khi có phiếu approved (ưu tiên chặn hơn cancellable)', () => {
    const reqs = [
      brief(2, FeeSupportRequestStatus.pending_tpkd),
      brief(3, FeeSupportRequestStatus.approved),
    ]
    expect(classifyFeeSupportUntick(reqs)).toEqual({ kind: 'blocked' })
  })

  it('blocked khi approved_pending_deal', () => {
    const reqs = [brief(1, FeeSupportRequestStatus.approved_pending_deal)]
    expect(classifyFeeSupportUntick(reqs)).toEqual({ kind: 'blocked' })
  })
})

describe('hasActiveFeeSupport', () => {
  it('false khi rỗng hoặc chỉ rejected/withdrawn', () => {
    expect(hasActiveFeeSupport([])).toBe(false)
    expect(hasActiveFeeSupport([brief(1, FeeSupportRequestStatus.rejected)])).toBe(false)
  })

  it('true khi có phiếu draft/pending/approved', () => {
    expect(hasActiveFeeSupport([brief(1, FeeSupportRequestStatus.draft)])).toBe(true)
    expect(hasActiveFeeSupport([brief(2, FeeSupportRequestStatus.approved)])).toBe(true)
  })
})

describe('isFeeSupportGateBlocked', () => {
  it('false khi HĐ cọc không tick cờ — cổng là opt-in', () => {
    expect(
      isFeeSupportGateBlocked({
        hasFeeSupportProposal: false,
        requests: [brief(1, FeeSupportRequestStatus.pending_tpkd)],
      })
    ).toBe(false)
  })

  it('true khi tick cờ mà chưa có phiếu nào', () => {
    expect(isFeeSupportGateBlocked({ hasFeeSupportProposal: true, requests: [] })).toBe(true)
  })

  it('true khi phiếu còn đang trong thang duyệt', () => {
    expect(
      isFeeSupportGateBlocked({
        hasFeeSupportProposal: true,
        requests: [brief(1, FeeSupportRequestStatus.pending_gdkd)],
      })
    ).toBe(true)
  })

  it('true khi mọi phiếu đều rejected/withdrawn (coi như chưa có phiếu)', () => {
    expect(
      isFeeSupportGateBlocked({
        hasFeeSupportProposal: true,
        requests: [
          brief(1, FeeSupportRequestStatus.rejected),
          brief(2, FeeSupportRequestStatus.withdrawn),
        ],
      })
    ).toBe(true)
  })

  it('false khi có phiếu approved_pending_deal — phiếu neo vào cọc chưa duyệt chỉ park được ở đây', () => {
    expect(
      isFeeSupportGateBlocked({
        hasFeeSupportProposal: true,
        requests: [brief(1, FeeSupportRequestStatus.approved_pending_deal)],
      })
    ).toBe(false)
  })

  it('false khi có phiếu approved lẫn giữa phiếu hỏng', () => {
    expect(
      isFeeSupportGateBlocked({
        hasFeeSupportProposal: true,
        requests: [
          brief(1, FeeSupportRequestStatus.rejected),
          brief(2, FeeSupportRequestStatus.approved),
        ],
      })
    ).toBe(false)
  })
})

describe('isDepositFeeSupportBlocked', () => {
  it('ưu tiên cờ của server, kể cả khi trái với dữ liệu phiếu trên detail', () => {
    const deposit = {
      fee_support_gate_blocked: false,
      has_fee_support_proposal: true,
      fee_support_requests: [brief(1, FeeSupportRequestStatus.pending_tpkd)],
    }
    expect(isDepositFeeSupportBlocked(deposit)).toBe(false)
  })

  it('rơi về dựng lại phía client khi BE chưa trả cờ (endpoint chưa deploy)', () => {
    expect(
      isDepositFeeSupportBlocked({
        has_fee_support_proposal: true,
        fee_support_requests: [brief(1, FeeSupportRequestStatus.pending_tpkd)],
      })
    ).toBe(true)
    expect(
      isDepositFeeSupportBlocked({
        has_fee_support_proposal: true,
        fee_support_requests: [brief(1, FeeSupportRequestStatus.approved_pending_deal)],
      })
    ).toBe(false)
  })

  it('không vỡ khi detail thiếu hẳn danh sách phiếu', () => {
    expect(isDepositFeeSupportBlocked({ has_fee_support_proposal: true })).toBe(true)
    expect(isDepositFeeSupportBlocked({})).toBe(false)
  })
})

describe('canOfferFeeSupportCreate', () => {
  it('false khi HĐ cọc không tick cờ đề xuất', () => {
    expect(
      canOfferFeeSupportCreate({
        hasFeeSupportProposal: false,
        requests: [],
        depositStatus: 'pending_approval',
      })
    ).toBe(false)
  })

  it('true khi tick cờ mà chưa có phiếu nào — case kẹt duyệt kế toán', () => {
    expect(
      canOfferFeeSupportCreate({
        hasFeeSupportProposal: true,
        requests: [],
        depositStatus: 'pending_approval',
      })
    ).toBe(true)
  })

  it('true khi phiếu cũ đều rejected/withdrawn (được tạo lại)', () => {
    expect(
      canOfferFeeSupportCreate({
        hasFeeSupportProposal: true,
        requests: [
          brief(1, FeeSupportRequestStatus.rejected),
          brief(2, FeeSupportRequestStatus.withdrawn),
        ],
        depositStatus: 'approved',
      })
    ).toBe(true)
  })

  it('false khi đã có phiếu còn sống (tránh tạo trùng)', () => {
    expect(
      canOfferFeeSupportCreate({
        hasFeeSupportProposal: true,
        requests: [brief(1, FeeSupportRequestStatus.pending_tpkd)],
        depositStatus: 'pending_approval',
      })
    ).toBe(false)
    expect(
      canOfferFeeSupportCreate({
        hasFeeSupportProposal: true,
        requests: [brief(1, FeeSupportRequestStatus.approved_pending_deal)],
        depositStatus: 'approved',
      })
    ).toBe(false)
  })

  it('false khi HĐ cọc đã đóng (rejected/abandoned/refunded)', () => {
    for (const depositStatus of ['rejected', 'abandoned', 'refunded']) {
      expect(
        canOfferFeeSupportCreate({ hasFeeSupportProposal: true, requests: [], depositStatus })
      ).toBe(false)
    }
  })

  it('true khi chưa biết status (detail chưa trả status)', () => {
    expect(canOfferFeeSupportCreate({ hasFeeSupportProposal: true, requests: [] })).toBe(true)
  })
})
