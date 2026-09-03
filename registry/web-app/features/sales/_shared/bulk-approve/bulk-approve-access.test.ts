import { describe, it, expect } from 'vitest'

import { resolveBulkApproveAccess } from './bulk-approve-access'
import { BULK_APPROVE_STEP } from './bulk-approve-model'

/** Giả lập `ability.can` từ một danh sách mã quyền `subject.action`. */
const canFrom = (codes: readonly string[]) => (action: string, subject: string) =>
  codes.includes(`${subject}.${action}`)

describe('resolveBulkApproveAccess', () => {
  it('bật khi có quyền endpoint VÀ ít nhất một bàn duyệt', () => {
    const access = resolveBulkApproveAccess(
      canFrom(['deposit_contract.bulk_approve', 'deposit_contract.accountant_approve']),
      'deposit_contract'
    )
    expect(access.enabled).toBe(true)
    expect(access.canRunStep(BULK_APPROVE_STEP.ACCOUNTANT)).toBe(true)
    expect(access.canRunStep(BULK_APPROVE_STEP.ADMIN)).toBe(false)
  })

  it('TẮT khi có quyền bàn duyệt nhưng CHƯA có quyền bulk_approve', () => {
    // Đây là trạng thái MẶC ĐỊNH ngay sau deploy: `collect_permissions` tạo ra ba quyền
    // `*.bulk_approve` nhưng không gán cho role nào. Nếu FE chỉ kiểm quyền bàn duyệt thì
    // checkbox hiện ra rồi bấm vào là 403 — UI mời một hành động mà BE từ chối.
    const access = resolveBulkApproveAccess(
      canFrom(['deposit_contract.accountant_approve', 'deposit_contract.admin_lead_approve']),
      'deposit_contract'
    )
    expect(access.enabled).toBe(false)
  })

  it('TẮT khi có quyền bulk_approve nhưng không có bàn duyệt nào', () => {
    // Bật checkbox lúc này là vô nghĩa: không dòng nào tích được.
    const access = resolveBulkApproveAccess(canFrom(['booking.bulk_approve']), 'booking')
    expect(access.enabled).toBe(false)
  })

  it('TẮT khi không có quyền gì', () => {
    expect(resolveBulkApproveAccess(canFrom([]), 'booking_refund').enabled).toBe(false)
  })

  it('quyền của subject khác KHÔNG bắc cầu sang subject này', () => {
    // `booking.bulk_approve` không được mở cửa cho `booking_refund`.
    const access = resolveBulkApproveAccess(
      canFrom(['booking.bulk_approve', 'booking.approve']),
      'booking_refund'
    )
    expect(access.enabled).toBe(false)
    expect(access.canRunStep(BULK_APPROVE_STEP.ADMIN)).toBe(false)
  })

  it('superuser (can trả true cho mọi thứ) thì bật đủ ba bàn', () => {
    const access = resolveBulkApproveAccess(() => true, 'deposit_contract')
    expect(access.enabled).toBe(true)
    expect(Object.values(BULK_APPROVE_STEP).every(access.canRunStep)).toBe(true)
  })
})
