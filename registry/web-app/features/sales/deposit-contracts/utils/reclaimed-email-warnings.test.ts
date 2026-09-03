import { describe, expect, it } from 'vitest'

import { extractReclaimedEmailWarnings } from './reclaimed-email-warnings'

describe('extractReclaimedEmailWarnings', () => {
  it('lấy ra câu cảnh báo của từng bên thiếu email', () => {
    const response = {
      total_recipients: 2,
      warnings: [
        { code: 'missing_recipient_email', detail: 'Nguyễn Văn A chưa có email.' },
        { code: 'missing_recipient_email', detail: 'Sàn F2 Đất Xanh chưa có email.' },
      ],
    }

    expect(extractReclaimedEmailWarnings(response)).toEqual([
      'Nguyễn Văn A chưa có email.',
      'Sàn F2 Đất Xanh chưa có email.',
    ])
  })

  it('trả mảng rỗng khi gửi cho đủ mọi bên', () => {
    expect(extractReclaimedEmailWarnings({ total_recipients: 4, warnings: [] })).toEqual([])
  })

  // Backend cũ chưa trả trường này — màn hình không được vỡ vì thế.
  it('trả mảng rỗng khi payload không có warnings', () => {
    expect(extractReclaimedEmailWarnings({ total_recipients: 1 })).toEqual([])
    expect(extractReclaimedEmailWarnings(undefined)).toEqual([])
    expect(extractReclaimedEmailWarnings(null)).toEqual([])
    expect(extractReclaimedEmailWarnings('không phải object')).toEqual([])
  })

  it('bỏ qua phần tử rỗng và chấp nhận cảnh báo dạng chuỗi', () => {
    const response = {
      warnings: ['CTV chưa có email.', { detail: '   ' }, { code: 'x' }, ''],
    }

    expect(extractReclaimedEmailWarnings(response)).toEqual(['CTV chưa có email.'])
  })
})
