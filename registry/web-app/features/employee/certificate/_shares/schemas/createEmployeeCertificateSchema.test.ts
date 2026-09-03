import { describe, expect, it } from 'vitest'

import { createEmployeeCertificateSchema } from '@/features/employee/certificate/_shares/schemas/createEmployeeCertificateSchema'
import { EmployeeCertificateType as CertType } from '@/constants/api-schema-aliases'

// The "phiếu chờ cấp" (pending issuance) flow: an employee who passed the broker exam but whose
// certificate has not been issued yet — so there is no issue number/date/expiry. These tests pin
// the conditional validation seam around `issuance_status`.

const baseIssued = {
  employee: 1,
  issuance_status: 'issued' as const,
  certificate_type: CertType.diploma,
  issue_date: '01/06/2024',
}

describe('createEmployeeCertificateSchema — issuance_status', () => {
  it('defaults issuance_status to "issued" when omitted', () => {
    const parsed = createEmployeeCertificateSchema.parse({
      employee: 1,
      certificate_type: CertType.diploma,
      issue_date: '01/06/2024',
    })
    expect(parsed.issuance_status).toBe('issued')
  })

  it('requires issue_date when NOT pending', () => {
    const result = createEmployeeCertificateSchema.safeParse({
      ...baseIssued,
      issue_date: undefined,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('issue_date'))).toBe(true)
    }
  })

  it('accepts a pending certificate with no issue_date / number / expiry', () => {
    const result = createEmployeeCertificateSchema.safeParse({
      employee: 1,
      issuance_status: 'pending',
      certificate_type: CertType.real_estate_practice_license,
      expected_issue_date: '01/09/2026',
      notes: 'Đã thi đỗ ngày 20/07/2026',
    })
    expect(result.success).toBe(true)
  })

  it('skips the practice-license expiry requirement when pending', () => {
    const result = createEmployeeCertificateSchema.safeParse({
      employee: 1,
      issuance_status: 'pending',
      certificate_type: CertType.real_estate_practice_license,
    })
    expect(result.success).toBe(true)
  })

  it('still enforces the practice-license expiry requirement when NOT pending', () => {
    const result = createEmployeeCertificateSchema.safeParse({
      employee: 1,
      issuance_status: 'issued',
      certificate_type: CertType.real_estate_practice_license,
      issue_date: '01/06/2024',
      // expiry_date missing
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('expiry_date'))).toBe(true)
    }
  })
})

// CR STT53 — "Số thứ tự thực tế": số tuỳ chọn, không unique, ghi theo sổ cấp phát bản cứng.
// Cả cụm này tồn tại để ghim lý do KHÔNG dùng `z.coerce.number()`: coerce biến ô xoá trắng
// thành 0 và nuốt luôn số thập phân, hai thứ đều sai với một số thứ tự.
describe('createEmployeeCertificateSchema — actual_sequence_number', () => {
  it('parses a numeric string into a number', () => {
    const parsed = createEmployeeCertificateSchema.parse({
      ...baseIssued,
      actual_sequence_number: '53',
    })
    expect(parsed.actual_sequence_number).toBe(53)
  })

  it('keeps 0 as 0 — a valid sequence number, not "empty"', () => {
    const parsed = createEmployeeCertificateSchema.parse({
      ...baseIssued,
      actual_sequence_number: '0',
    })
    expect(parsed.actual_sequence_number).toBe(0)
  })

  it('turns a cleared input into undefined, NOT 0', () => {
    const parsed = createEmployeeCertificateSchema.parse({
      ...baseIssued,
      actual_sequence_number: '',
    })
    expect(parsed.actual_sequence_number).toBeUndefined()
  })

  it('treats a whitespace-only input as cleared', () => {
    const parsed = createEmployeeCertificateSchema.parse({
      ...baseIssued,
      actual_sequence_number: '   ',
    })
    expect(parsed.actual_sequence_number).toBeUndefined()
  })

  it('is optional — omitting it still parses', () => {
    const result = createEmployeeCertificateSchema.safeParse({ ...baseIssued })
    expect(result.success).toBe(true)
  })

  it.each([
    ['a negative number', '-1'],
    ['a decimal', '12.5'],
    ['a non-numeric string', 'abc'],
  ])('rejects %s', (_label, value) => {
    const result = createEmployeeCertificateSchema.safeParse({
      ...baseIssued,
      actual_sequence_number: value,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('actual_sequence_number'))).toBe(true)
    }
  })
})
