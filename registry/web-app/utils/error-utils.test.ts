import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  extractBlockers,
  extractErrorExtra,
  extractFieldErrorDetail,
  handleApiError,
} from './error-utils'
import toastService from '@/services/toast-service'

// toast-service pulls in react-toastify + icon assets; replace it wholesale so the
// unit under test stays isolated and we can assert on the toast calls.
vi.mock('@/services/toast-service', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

const toastError = vi.mocked(toastService.error)

// Standard DRF validation_error envelope as re-thrown by base-service.ts (throw response.error).
function validationError(errors: Array<{ attr: string; detail: string; code?: string }>) {
  return {
    error: {
      type: 'validation_error',
      errors: errors.map((e) => ({ code: e.code ?? 'invalid', ...e })),
    },
  }
}

describe('handleApiError — server error visibility', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('sets the form error inline (no toast) when the attr has a rendered field', () => {
    const input = document.createElement('input')
    input.setAttribute('name', 'reconciliation_date')
    document.body.appendChild(input)

    const setError = vi.fn()
    handleApiError(
      validationError([{ attr: 'reconciliation_date', detail: 'Ngày không hợp lệ' }]),
      setError
    )

    expect(setError).toHaveBeenCalledWith('reconciliation_date', {
      type: 'invalid',
      message: 'Ngày không hợp lệ',
    })
    expect(toastError).not.toHaveBeenCalled()
  })

  it('shows a toast for server-only attrs with no rendered field (regression: created_by was swallowed)', () => {
    const setError = vi.fn()
    const detail = 'Người dùng hiện tại phải được liên kết với một nhân viên.'

    handleApiError(validationError([{ attr: 'created_by', detail }]), setError)

    expect(toastError).toHaveBeenCalledWith(detail)
  })

  it('still routes unmapped server-only attrs to a toast when a fieldMap is provided', () => {
    const setError = vi.fn()
    handleApiError(
      validationError([{ attr: 'created_by', detail: 'Lỗi liên kết nhân viên' }]),
      setError,
      {
        reconciliation_date: 'reconciliation_date',
      }
    )

    expect(setError).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith('Lỗi liên kết nhân viên')
  })

  it('shows an inline error (no toast) for an unmapped attr that IS a rendered field, even with a fieldMap present (regression: real fields were being toasted)', () => {
    // Arrange — the field is rendered; the fieldMap only remaps an unrelated attr,
    // exactly like InvestorForm's `{ 'files.attachments': 'attachment_tokens' }`.
    const input = document.createElement('input')
    input.setAttribute('name', 'tax_code')
    document.body.appendChild(input)

    const setError = vi.fn()

    // Act
    handleApiError(
      validationError([{ attr: 'tax_code', detail: 'Mã số thuế đã tồn tại' }]),
      setError,
      { 'files.attachments': 'attachment_tokens' }
    )

    // Assert
    expect(setError).toHaveBeenCalledWith('tax_code', {
      type: 'invalid',
      message: 'Mã số thuế đã tồn tại',
    })
    expect(toastError).not.toHaveBeenCalled()
  })

  it('does not throw and falls back to a toast when an attr breaks CSS selector syntax', () => {
    const setError = vi.fn()

    expect(() =>
      handleApiError(validationError([{ attr: 'a"b', detail: 'Lỗi ký tự lạ' }]), setError)
    ).not.toThrow()
    expect(toastError).toHaveBeenCalledWith('Lỗi ký tự lạ')
  })

  it('remaps a mapped attr to its form field name when a fieldMap is provided', () => {
    const input = document.createElement('input')
    input.setAttribute('name', 'attachment_tokens')
    document.body.appendChild(input)

    const setError = vi.fn()
    handleApiError(
      validationError([{ attr: 'files.attachments', detail: 'Tệp không hợp lệ' }]),
      setError,
      { 'files.attachments': 'attachment_tokens' }
    )

    expect(setError).toHaveBeenCalledWith('attachment_tokens', {
      type: 'invalid',
      message: 'Tệp không hợp lệ',
    })
    expect(toastError).not.toHaveBeenCalled()
  })
})

describe('handleApiError — lỗi theo dòng trong mảng', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  const F2_DETAIL =
    "Sàn 'EX0013 - Sàn A' chưa có cấu hình hoa hồng F2 (TBC-F2) hiệu lực vào ngày 2026-06-05."

  it('map key có chỉ số của DRF sang đường dẫn field của react-hook-form', () => {
    const setError = vi.fn()

    handleApiError(
      validationError([{ attr: 'sales_staff[0].exchange_id', detail: F2_DETAIL }]),
      setError,
      { 'sales_staff[].exchange_id': 'sales_staff.{index}.exchange' }
    )

    expect(setError).toHaveBeenCalledWith('sales_staff.0.exchange', {
      type: 'invalid',
      message: F2_DETAIL,
    })
    expect(toastError).not.toHaveBeenCalled()
  })

  it('giữ nguyên chỉ số của đúng dòng bị lỗi', () => {
    const setError = vi.fn()

    handleApiError(
      validationError([{ attr: 'sales_staff[2].exchange_id', detail: F2_DETAIL }]),
      setError,
      { 'sales_staff[].exchange_id': 'sales_staff.{index}.exchange' }
    )

    expect(setError).toHaveBeenCalledWith('sales_staff.2.exchange', expect.anything())
  })

  it('map lỗi thiếu tỷ lệ hoa hồng về đúng dòng nhân sự và dòng CTV', () => {
    // BE gắn lỗi "TBC để trống tỷ lệ" theo loại người tham gia: MV -> employee_id,
    // CTV -> collaborator_id, sàn -> exchange_id. Cả ba phải rơi đúng dòng, nếu
    // không người dùng chỉ thấy toast và không biết dòng nào hỏng.
    const setError = vi.fn()
    const detail =
      "'MV000000002 - Đinh Văn Tuấn' chưa có tỷ lệ hoa hồng: cấu hình TBC hiệu lực vào ngày 2026-06-05 đang để trống tỷ lệ."
    const map = {
      'sales_staff[].employee_id': 'sales_staff.{index}.employee',
      'sales_staff[].collaborator_id': 'sales_staff.{index}.collaborator',
    }

    handleApiError(validationError([{ attr: 'sales_staff[1].employee_id', detail }]), setError, map)
    handleApiError(
      validationError([{ attr: 'sales_staff[3].collaborator_id', detail }]),
      setError,
      map
    )

    expect(setError).toHaveBeenNthCalledWith(1, 'sales_staff.1.employee', {
      type: 'invalid',
      message: detail,
    })
    expect(setError).toHaveBeenNthCalledWith(2, 'sales_staff.3.collaborator', {
      type: 'invalid',
      message: detail,
    })
    expect(toastError).not.toHaveBeenCalled()
  })

  it('không khai báo template thì rơi về toast, không nuốt lỗi', () => {
    const setError = vi.fn()

    handleApiError(
      validationError([{ attr: 'sales_staff[0].exchange_id', detail: F2_DETAIL }]),
      setError,
      { product_inventory_id: 'product_inventory' }
    )

    expect(setError).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith(F2_DETAIL)
  })

  it('key phẳng vẫn tra bảng như cũ', () => {
    const setError = vi.fn()
    const detail = 'Đã tồn tại một hợp đồng đặt cọc đang hoạt động cho sản phẩm này (DC-2026-000003).'

    handleApiError(validationError([{ attr: 'product_inventory_id', detail }]), setError, {
      product_inventory_id: 'product_inventory',
      'sales_staff[].exchange_id': 'sales_staff.{index}.exchange',
    })

    expect(setError).toHaveBeenCalledWith('product_inventory', { type: 'invalid', message: detail })
  })
})

describe('extractFieldErrorDetail', () => {
  it('returns the detail for the matching attr (bug 86expaf56 warning field)', () => {
    const detail = extractFieldErrorDetail(
      validationError([
        {
          attr: 'confirm_unpaid_reconciliation',
          detail: 'Thương vụ này đang có đối chiếu đã xác nhận nhưng chưa phát sinh thanh toán.',
        },
      ]),
      'confirm_unpaid_reconciliation'
    )

    expect(detail).toBe(
      'Thương vụ này đang có đối chiếu đã xác nhận nhưng chưa phát sinh thanh toán.'
    )
  })

  it('returns undefined when the attr is not present among the errors', () => {
    const detail = extractFieldErrorDetail(
      validationError([{ attr: 'note', detail: 'Bắt buộc nhập lý do.' }]),
      'confirm_unpaid_reconciliation'
    )

    expect(detail).toBeUndefined()
  })

  it('returns undefined for a falsy or unrecognized error shape', () => {
    expect(extractFieldErrorDetail(null, 'confirm_unpaid_reconciliation')).toBeUndefined()
    expect(
      extractFieldErrorDetail(new Error('network down'), 'confirm_unpaid_reconciliation')
    ).toBeUndefined()
  })
})

// Bug 86expaf56: hủy/hoàn cọc bị chặn vì hóa đơn đầu ra trả về 400 kèm blockers[].
// Toast chỉ hiện `detail` tóm tắt nên mã hóa đơn + việc cần làm bị mất — caller phải
// đọc được blockers để render danh sách.
function invoiceBlockedError(wrapper: 'error' | 'server') {
  const payload = {
    detail: 'This deposit contract cannot be abandoned or refunded yet.',
    code: 'invoice_blocked',
    blockers: [
      {
        code: 'sales_invoice_paid',
        severity: 'blocker',
        title: 'Money has already been received for this deal',
        detail: 'Invoice HDOUT000001448 has been paid 120.000.000.',
        remediation: 'Cancel the receipt vouchers of invoice HDOUT000001448 first.',
        entity: { type: 'sales_invoice', id: 1448, label: 'HDOUT000001448', status: 'PAID' },
        auto_fixable: false,
      },
    ],
  }
  return wrapper === 'error' ? { error: payload } : { server: payload }
}

describe('extractBlockers', () => {
  // base-service.ts throws the wrapped body → blockers sit on `.error`.
  it('reads blockers from the `error` envelope', () => {
    const blockers = extractBlockers(invoiceBlockedError('error'))

    expect(blockers).toHaveLength(1)
    expect(blockers[0].code).toBe('sales_invoice_paid')
    // The invoice code must survive — it is the whole point of rendering the list.
    expect(blockers[0].detail).toContain('HDOUT000001448')
    expect(blockers[0].remediation).toContain('receipt vouchers')
  })

  // extractApiData throws with the payload on `.server` instead.
  it('reads blockers from the `server` envelope', () => {
    expect(extractBlockers(invoiceBlockedError('server'))).toHaveLength(1)
  })

  it('returns an empty array for errors that carry no blockers', () => {
    expect(extractBlockers(null)).toEqual([])
    expect(extractBlockers(new Error('network down'))).toEqual([])
    expect(
      extractBlockers(validationError([{ attr: 'note', detail: 'Bắt buộc nhập lý do.' }]))
    ).toEqual([])
  })

  it('returns an empty array when blockers is present but not an array', () => {
    expect(extractBlockers({ error: { blockers: 'nope' } })).toEqual([])
  })
})

// Cổng đề xuất hỗ trợ phí (fee_support_gate) trả 400 kèm `extra` máy-đọc-được: màn HĐ
// cọc dựa vào `extra.code` để chọn hộp thoại và `blocking_proposals` để in mã phiếu.
function feeSupportGateError(wrapper: 'error' | 'server') {
  const payload = {
    type: 'validation_error',
    errors: [
      {
        code: 'fee_support_proposal_not_approved',
        detail: 'Đề xuất hỗ trợ phí FSR-2026-000012 chưa được duyệt.',
        attr: 'fee_support_proposal',
      },
    ],
    extra: {
      code: 'fee_support_proposal_not_approved',
      blocking_proposals: [
        { code: 'FSR-2026-000012', status: 'pending_tpkd', status_display: 'Chờ TPKD' },
      ],
    },
  }
  return wrapper === 'error' ? { error: payload } : { server: payload }
}

describe('extractErrorExtra', () => {
  it('reads extra from the `error` envelope', () => {
    const extra = extractErrorExtra<{
      code: string
      blocking_proposals: { code: string }[]
    }>(feeSupportGateError('error'))

    expect(extra?.code).toBe('fee_support_proposal_not_approved')
    expect(extra?.blocking_proposals[0].code).toBe('FSR-2026-000012')
  })

  it('reads extra from the `server` envelope', () => {
    expect(extractErrorExtra(feeSupportGateError('server'))).toBeDefined()
  })

  it('returns undefined when the error carries no extra', () => {
    expect(extractErrorExtra(null)).toBeUndefined()
    expect(extractErrorExtra(new Error('network down'))).toBeUndefined()
    expect(
      extractErrorExtra(validationError([{ attr: 'note', detail: 'Bắt buộc nhập lý do.' }]))
    ).toBeUndefined()
  })

  it('returns undefined when extra is present but not an object', () => {
    expect(extractErrorExtra({ error: { extra: 'nope' } })).toBeUndefined()
  })
})
