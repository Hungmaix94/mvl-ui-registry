import { describe, expect, it } from 'vitest'
import { ColoredValueVariant } from '@/api/schema.ts'
import { DepositContractApprovalStatus } from '@/constants/api-schema-aliases'
import {
  DEPOSIT_APPROVAL_STATUS_VARIANTS,
  getDepositApprovalStatusVariant,
} from './approval-status'

describe('getDepositApprovalStatusVariant', () => {
  it('phủ HẾT giá trị của enum phê duyệt — không giá trị nào rơi về xám', () => {
    const missing = Object.values(DepositContractApprovalStatus).filter(
      (value) => !(value in DEPOSIT_APPROVAL_STATUS_VARIANTS)
    )

    expect(missing).toEqual([])
  })

  it('mọi bàn đang chờ đều cùng một màu, kể cả `pending_admin_lead`', () => {
    const waiting = Object.values(DepositContractApprovalStatus).filter((value) =>
      value.startsWith('pending_')
    )

    expect(waiting.length).toBe(5)
    waiting.forEach((value) => {
      expect(getDepositApprovalStatusVariant(value)).toBe(ColoredValueVariant.ORANGE)
    })
  })

  it('phân biệt được kết thúc thuận và kết thúc từ chối', () => {
    expect(getDepositApprovalStatusVariant(DepositContractApprovalStatus.approved)).toBe(
      ColoredValueVariant.GREEN
    )
    expect(getDepositApprovalStatusVariant(DepositContractApprovalStatus.rejected)).toBe(
      ColoredValueVariant.RED
    )
  })

  it('giá trị lạ về xám thay vì vỡ giao diện', () => {
    expect(getDepositApprovalStatusVariant('trang_thai_khong_ton_tai')).toBe(
      ColoredValueVariant.GREY
    )
  })
})
