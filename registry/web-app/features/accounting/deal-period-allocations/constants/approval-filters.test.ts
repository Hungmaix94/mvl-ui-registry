import { describe, test, expect } from 'vitest'
import {
  WORKSHEET_STATUS,
  buildWorksheetStatusOptions,
} from '@/features/accounting/commission-splits/components/WorksheetStatusChip'
import {
  DIAL_DEVIATES_OPTIONS,
  sanitizeDialDeviates,
  sanitizeWorksheetStatus,
} from './approval-filters'

describe('DIAL_DEVIATES_OPTIONS', () => {
  test('chỉ có 2 lựa chọn true/false — bộ lọc rời của Kế toán, không gộp trạng thái duyệt', () => {
    expect(DIAL_DEVIATES_OPTIONS.map((o) => o.value)).toEqual(['true', 'false'])
  })

  test('nhãn khớp đúng chip cột "Duyệt lệch tiền về" để popup và bảng không lệch chữ', () => {
    const labels = Object.fromEntries(DIAL_DEVIATES_OPTIONS.map((o) => [o.value, o.label]))
    expect(labels.true).toBe('Duyệt lệch')
    expect(labels.false).toBe('Không lệch')
  })

  test('KHÔNG lẫn nhãn trạng thái duyệt vào — hai ô lọc là hai chiều khác nhau', () => {
    const statusLabels = buildWorksheetStatusOptions({
      DRAFT: 'Chờ Thư ký duyệt chi',
      ADMIN_APPROVED: 'TK đã duyệt chi',
      APPROVED: 'KT đã duyệt thực nhận',
      VOIDED: 'Đã huỷ',
    }).map((o) => o.label)
    for (const option of DIAL_DEVIATES_OPTIONS) {
      expect(statusLabels).not.toContain(option.label)
    }
  })
})

describe('sanitizeWorksheetStatus', () => {
  test('giữ nguyên 4 trạng thái vòng đời hợp lệ', () => {
    for (const status of Object.values(WORKSHEET_STATUS)) {
      expect(sanitizeWorksheetStatus(status)).toBe(status)
    }
  })

  test('loại giá trị lạ gõ tay trên URL về null — tránh bộ lọc vô hình', () => {
    expect(sanitizeWorksheetStatus('LOCKED')).toBeNull()
    expect(sanitizeWorksheetStatus('approved')).toBeNull()
    expect(sanitizeWorksheetStatus('')).toBeNull()
    expect(sanitizeWorksheetStatus(null)).toBeNull()
    expect(sanitizeWorksheetStatus(undefined)).toBeNull()
  })
})

describe('sanitizeDialDeviates', () => {
  test('giữ nguyên 2 giá trị hợp lệ', () => {
    expect(sanitizeDialDeviates('true')).toBe('true')
    expect(sanitizeDialDeviates('false')).toBe('false')
  })

  test('loại giá trị lạ về null', () => {
    expect(sanitizeDialDeviates('1')).toBeNull()
    expect(sanitizeDialDeviates('True')).toBeNull()
    expect(sanitizeDialDeviates('')).toBeNull()
    expect(sanitizeDialDeviates(null)).toBeNull()
    expect(sanitizeDialDeviates(undefined)).toBeNull()
  })

  test('độc lập với trạng thái duyệt — đứng một mình vẫn là lựa chọn hợp lệ', () => {
    // Đây là điểm khác cốt lõi so với bản gộp dropdown: `dial_deviates` không còn bị buộc
    // phải đi kèm `worksheet_status`, đúng yêu cầu "2 điều kiện lọc" trên ticket.
    expect(sanitizeDialDeviates('false')).toBe('false')
    expect(sanitizeWorksheetStatus(null)).toBeNull()
  })
})

describe('3 nhóm nghiệp vụ CR STT20 diễn đạt bằng cách ghép 2 ô lọc', () => {
  const cases = [
    {
      name: 'TK đã duyệt chi — KT chưa duyệt',
      worksheet_status: WORKSHEET_STATUS.ADMIN_APPROVED,
      dial_deviates: null,
    },
    {
      name: 'KT duyệt luôn theo thông tin Thư ký',
      worksheet_status: WORKSHEET_STATUS.APPROVED,
      dial_deviates: 'false',
    },
    {
      name: 'KT duyệt nhưng có sửa %',
      worksheet_status: WORKSHEET_STATUS.APPROVED,
      dial_deviates: 'true',
    },
  ]

  test.each(cases)('$name giữ nguyên cặp param qua sanitize', (c) => {
    expect(sanitizeWorksheetStatus(c.worksheet_status)).toBe(c.worksheet_status)
    expect(sanitizeDialDeviates(c.dial_deviates)).toBe(c.dial_deviates)
  })
})
