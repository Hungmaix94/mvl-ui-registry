import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

import EmployeeCertificateDetail from './EmployeeCertificateDetail'
import type { EmployeeCertificate } from '@/features/employee/services/employee-certificate-service'

// Loose overrides + a single cast keep the factory terse (e.g. colored_status variant as a plain
// string) — the real EmployeeCertificate shape is enforced at the cast boundary.
function makeCertificate(overrides: Record<string, unknown> = {}): EmployeeCertificate {
  return {
    id: 4,
    code: 'CCBDS000000004',
    employee: { id: 1, code: 'MV0001', fullname: 'Nguyễn Văn A' },
    certificate_type: 'real_estate_practice_license',
    certificate_type_display: 'Chứng chỉ hành nghề môi giới Bất động sản',
    certificate_code: '',
    certificate_name: 'Chứng chỉ môi giới',
    issue_date: null,
    is_pending_issuance: false,
    expected_issue_date: null,
    effective_date: null,
    expiry_date: null,
    issuing_organization: 'Sở Xây dựng',
    attachment: null,
    notes: '',
    training_specialization: null,
    graduation_diploma: null,
    actual_sequence_number: null,
    status: 'Valid',
    status_display: 'Còn hiệu lực',
    colored_status: { value: 'Valid', variant: 'GREEN' },
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
    ...overrides,
  } as unknown as EmployeeCertificate
}

describe('EmployeeCertificateDetail', () => {
  it('shows "Ngày dự kiến cấp" and hides issued-only fields for a phiếu chờ cấp', () => {
    const certificate = makeCertificate({
      is_pending_issuance: true,
      expected_issue_date: '2026-09-01',
      status: 'Pending Issuance',
      status_display: 'Chờ cấp',
      colored_status: { value: 'Pending Issuance', variant: 'BLUE' },
    })
    const { getByText, queryByText } = render(
      <EmployeeCertificateDetail certificate={certificate} />
    )

    expect(getByText('Ngày dự kiến cấp')).toBeInTheDocument()
    expect(getByText('01/09/2026')).toBeInTheDocument()
    expect(getByText('Chờ cấp')).toBeInTheDocument()
    // Issued-only rows must not render for a pending record.
    expect(queryByText('Ngày cấp')).not.toBeInTheDocument()
    expect(queryByText('Số bằng cấp')).not.toBeInTheDocument()
    expect(queryByText('Ngày hết hiệu lực')).not.toBeInTheDocument()
  })

  it('shows issued fields and hides "Ngày dự kiến cấp" for an issued certificate', () => {
    const certificate = makeCertificate({
      is_pending_issuance: false,
      issue_date: '2026-06-01',
      certificate_code: 'BDS-123',
    })
    const { getByText, queryByText } = render(
      <EmployeeCertificateDetail certificate={certificate} />
    )

    expect(getByText('Ngày cấp')).toBeInTheDocument()
    expect(getByText('01/06/2026')).toBeInTheDocument()
    expect(getByText('Số bằng cấp')).toBeInTheDocument()
    expect(queryByText('Ngày dự kiến cấp')).not.toBeInTheDocument()
  })

  // CR STT53. `InfoRow` render `value || '-'`, nên số 0 là ca duy nhất có thể im lặng biến mất;
  // `getByText('0')` bên dưới CHÍNH LÀ chốt chặn đó (gỡ `String()` ở component ⇒ ca này đỏ với
  // "Unable to find an element with the text: 0").
  // Cố ý KHÔNG chốt số dấu '-' trên màn: đó là hành vi dùng chung của InfoRow, không phải logic
  // của CR này, và một con số tuyệt đối sẽ vỡ ngay khi ai đó thêm một dòng InfoRow mới.
  describe('Số thứ tự thực tế', () => {
    const fullyFilled = {
      certificate_code: 'BC-01',
      certificate_name: 'Bằng đại học',
      issuing_organization: 'ĐH Kinh tế',
      training_specialization: 'Quản trị kinh doanh',
      graduation_diploma: 'Loại giỏi',
      notes: 'Ghi chú nội bộ',
      issue_date: '2026-06-01',
      effective_date: '2026-06-02',
      expiry_date: '2030-06-01',
    }

    const renderWith = (actual_sequence_number: number | null) =>
      render(
        <EmployeeCertificateDetail
          certificate={makeCertificate({ ...fullyFilled, actual_sequence_number })}
        />
      )

    it('shows the value when set', () => {
      const { getByText } = renderWith(53)

      expect(getByText('Số thứ tự thực tế')).toBeInTheDocument()
      expect(getByText('53')).toBeInTheDocument()
    })

    it('keeps 0 visible instead of collapsing it to "-"', () => {
      const { getByText } = renderWith(0)

      expect(getByText('0')).toBeInTheDocument()
    })

    it('still renders the row when the field is null', () => {
      const { getByText, queryByText } = renderWith(null)

      expect(getByText('Số thứ tự thực tế')).toBeInTheDocument()
      expect(queryByText('53')).not.toBeInTheDocument()
    })
  })
})
