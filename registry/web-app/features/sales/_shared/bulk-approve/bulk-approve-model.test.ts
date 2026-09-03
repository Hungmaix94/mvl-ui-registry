import { describe, it, expect } from 'vitest'

import {
  BULK_APPROVE_STEP,
  BULK_APPROVE_STEP_LABEL,
  BULK_APPROVE_STEP_TONE,
  buildBulkApproveOutcome,
  type BulkApproveCandidate,
} from './bulk-approve-model'

const CANDIDATES: BulkApproveCandidate[] = [
  { id: 1, code: 'HD-001', subject: 'Khách A · A-01', step: BULK_APPROVE_STEP.ADMIN },
  { id: 2, code: 'HD-002', subject: 'Khách B', step: BULK_APPROVE_STEP.ACCOUNTANT },
]

describe('buildBulkApproveOutcome', () => {
  it('tách kết quả thành hai nhóm đã duyệt / bỏ qua', () => {
    const outcome = buildBulkApproveOutcome(
      {
        approved: [{ id: 1, code: 'HD-001', step: BULK_APPROVE_STEP.ADMIN }],
        skipped: [{ id: 2, code: 'HD-002', reason: 'Không nằm trong luồng duyệt' }],
      },
      CANDIDATES
    )

    expect(outcome.approvedRows).toEqual([
      { id: 1, code: 'HD-001', subject: 'Khách A · A-01', step: BULK_APPROVE_STEP.ADMIN },
    ])
    expect(outcome.skippedRows).toEqual([
      { id: 2, code: 'HD-002', subject: 'Khách B', reason: 'Không nằm trong luồng duyệt' },
    ])
  })

  it('dùng mã đã biết lúc tích chọn khi BE trả code rỗng', () => {
    // BE trả code rỗng khi không đọc được bản ghi (đã bị xoá, hoặc ngoài phạm vi dự án).
    // Hiện `#id` thay vì mã người dùng vừa thấy trên bảng là bắt họ tự tra lại.
    const outcome = buildBulkApproveOutcome(
      { approved: [], skipped: [{ id: 1, code: '', reason: 'Không tìm thấy bản ghi' }] },
      CANDIDATES
    )
    expect(outcome.skippedRows[0].code).toBe('HD-001')
  })

  it('mã của BE thắng khi hai bên lệch nhau', () => {
    // BE đọc thẳng từ DB nên là nguồn chuẩn; mã ở `candidates` chỉ là ảnh chụp lúc tải danh sách
    // và có thể đã cũ. `subject` thì BE không trả nên vẫn lấy từ `candidates`.
    const outcome = buildBulkApproveOutcome(
      {
        approved: [{ id: 1, code: 'HD-001-DA-DOI', step: BULK_APPROVE_STEP.ADMIN }],
        skipped: [],
      },
      CANDIDATES
    )
    expect(outcome.approvedRows[0].code).toBe('HD-001-DA-DOI')
    expect(outcome.approvedRows[0].subject).toBe('Khách A · A-01')
  })

  it('lùi về #id khi cả BE lẫn danh sách chọn đều không có mã', () => {
    const outcome = buildBulkApproveOutcome(
      { approved: [], skipped: [{ id: 99, code: '', reason: 'Không tìm thấy bản ghi' }] },
      CANDIDATES
    )
    expect(outcome.skippedRows[0].code).toBe('#99')
    expect(outcome.skippedRows[0].subject).toBe('')
  })

  it('chịu được payload thiếu mảng', () => {
    const outcome = buildBulkApproveOutcome({} as never, CANDIDATES)
    expect(outcome.approvedRows).toEqual([])
    expect(outcome.skippedRows).toEqual([])
  })
})

describe('bảng bàn duyệt', () => {
  it('ba bàn duyệt đều có nhãn và màu', () => {
    const steps = Object.values(BULK_APPROVE_STEP)
    expect(steps).toHaveLength(3)
    for (const step of steps) {
      expect(BULK_APPROVE_STEP_LABEL[step]).toBeTruthy()
      expect(BULK_APPROVE_STEP_TONE[step].rail).toBeTruthy()
      expect(BULK_APPROVE_STEP_TONE[step].chip).toBeTruthy()
    }
  })

  it('giá trị bàn duyệt trùng khít tên action của BE', () => {
    // Chuỗi này vừa là `approved[].step` BE trả về, vừa là hậu tố quyền `<entity>.<step>`.
    // Lệch một ký tự là FE cho tích dòng mà BE sẽ từ chối vì thiếu quyền.
    expect(BULK_APPROVE_STEP.ADMIN).toBe('approve')
    expect(BULK_APPROVE_STEP.ADMIN_LEAD).toBe('admin_lead_approve')
    expect(BULK_APPROVE_STEP.ACCOUNTANT).toBe('accountant_approve')
  })
})
