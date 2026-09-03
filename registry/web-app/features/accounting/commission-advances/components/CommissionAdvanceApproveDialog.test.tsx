// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

/**
 * Dialog duyệt tạm ứng — bộ test canh cho việc DÙNG CHUNG giữa màn Chi tiết và duyệt nhanh
 * ngoài màn Danh sách (ClickUp 86eympqft vòng 3).
 *
 * Thứ đắt nhất ở đây không phải giao diện mà là **payload**: trước 19/08 duyệt nhanh ngoài list
 * gửi `data: {}`, tức mất cả số tiền duyệt từng người lẫn nguồn tiền. Nên phần lớn assert dưới
 * đây soi đúng object đi vào `mutateAsync`, không phải soi chữ trên màn.
 */

const approveMutate = vi.fn().mockResolvedValue({})
const adminLeadMutate = vi.fn().mockResolvedValue({})

let mockRecord: unknown = null
let mockShares: unknown = undefined
let mockWallets: unknown = undefined

vi.mock('@/features/accounting/commission-advances/services/commission-advance-service', () => ({
  useCommissionAdvance: () => ({ data: mockRecord }),
  useApproveCommissionAdvance: () => ({ mutateAsync: approveMutate, isPending: false }),
  useAdminLeadApproveCommissionAdvance: () => ({ mutateAsync: adminLeadMutate, isPending: false }),
}))

let mockSharesLoading = false
let mockWalletLoading = false

vi.mock('@/features/sales/deals/services/deal-service', () => ({
  useDealCommissionShares: () => ({ data: mockShares, isLoading: mockSharesLoading }),
}))

vi.mock('@/features/accounting/investor-advances/services/investor-advance-service', () => ({
  useInvestorAdvanceAccounts: () => ({ data: mockWallets, isLoading: mockWalletLoading }),
}))

const toastError = vi.fn()
vi.mock('@/services/toast-service', () => ({
  default: { success: vi.fn(), error: (...args: unknown[]) => toastError(...args) },
}))

// Rút AppDialog về đúng những mảnh component này điều khiển — dialog thật dựng qua portal của
// Radix và không thêm gì cho phép kiểm ở đây.
vi.mock('@/components/dialog/AppDialog', () => ({
  default: ({
    open,
    content,
    onConfirm,
    onCancel,
    title,
    confirmText,
    loading,
    disableConfirm,
  }: any) =>
    open ? (
      <div>
        <div data-testid="title">{title}</div>
        <div data-testid="content">{content}</div>
        <button data-testid="confirm" disabled={loading || disableConfirm} onClick={onConfirm}>
          {confirmText}
        </button>
        <button data-testid="cancel" onClick={onCancel}>
          cancel
        </button>
      </div>
    ) : null,
}))

import CommissionAdvanceApproveDialog from './CommissionAdvanceApproveDialog'

const LINE_DUY = 101
const LINE_MY = 102

function recordWithDeal() {
  return {
    id: 43,
    code: 'ADV000000043',
    deal: 7,
    deal_detail: { project: { id: 3 }, investor: { id: 5 } },
    recipient_lines: [
      {
        id: LINE_DUY,
        recipient_employee: 11,
        recipient_employee_detail: { fullname: 'Nguyễn Quang Duy' },
        requested_amount: '20000000',
      },
      {
        id: LINE_MY,
        recipient_employee: 12,
        recipient_employee_detail: { fullname: 'Võ Yến My' },
        requested_amount: '15000000',
      },
    ],
  }
}

/** Bảng chia của giao dịch: Duy 71.880.000 — Yến My 95.840.000 (số thật lấy từ phiếu ADV000000043). */
function sharesForDeal() {
  return {
    commission_shares: [
      { employee: { id: 11 }, calculated_amount: '71880000' },
      { employee: { id: 12 }, calculated_amount: '95840000' },
    ],
  }
}

function renderDialog(mode: 'APPROVE' | 'ADMIN_LEAD_APPROVE' = 'APPROVE', advanceId = 43) {
  const onOpenChange = vi.fn()
  const onSuccess = vi.fn()
  const utils = render(
    <CommissionAdvanceApproveDialog
      open
      advanceId={advanceId}
      mode={mode}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />
  )
  return { ...utils, onOpenChange, onSuccess }
}

/** Ô nhập số tiền duyệt của một người — `aria-label` là thứ duy nhất phân biệt được hai ô. */
function amountInput(name: string) {
  return screen.getByLabelText(`Số tiền duyệt cho ${name}`)
}

/**
 * Giá trị của một nhãn trong khối `<dl>` của một người thụ hưởng.
 *
 * `dt` map sang role `term`, `dd` sang `definition`, và trong một khối chúng đi theo cặp cùng
 * thứ tự — nên tra chỉ số của `term` rồi lấy `definition` cùng chỉ số. Ném lỗi khi không tìm
 * thấy nhãn: nếu trả về `undefined` thì assert kiểu `toBe('71.880.000')` vẫn đỏ đúng, nhưng
 * assert kiểu `not.toBe(...)` sẽ XANH khi cả dòng đã biến mất — đúng loại test rỗng cần tránh.
 */
function figureFor(lineId: number, label: string): string {
  const block = within(screen.getByTestId(`advance-recipient-${lineId}`))
  const terms = block.getAllByRole('term')
  const idx = terms.findIndex((t) => t.textContent?.trim() === label)
  if (idx < 0) throw new Error(`khối của dòng #${lineId} không có nhãn "${label}"`)
  return (block.getAllByRole('definition')[idx].textContent ?? '').trim()
}

beforeEach(() => {
  vi.clearAllMocks()
  mockRecord = recordWithDeal()
  mockShares = sharesForDeal()
  mockWallets = { results: [{ id: 9, balance: '500000000' }] }
  mockSharesLoading = false
  mockWalletLoading = false
})

describe('CommissionAdvanceApproveDialog — bước kế toán duyệt', () => {
  it('hiện đủ Nguồn tiền, Thuế suất tạm tính và số tiền của từng người thụ hưởng', () => {
    renderDialog('APPROVE')

    expect(screen.getByText('Nguồn tiền')).toBeTruthy()
    expect(screen.getByText('Thuế suất tạm tính')).toBeTruthy()
    expect(screen.getByText('Người thụ hưởng (2)')).toBeTruthy()
    // Quỹ CĐT phải nêu số dư, không phải chỉ có tên — kế toán quyết định dựa vào số dư.
    expect(screen.getByText(/Quỹ tạm ứng chủ đầu tư \(số dư 500\.000\.000 VNĐ\)/)).toBeTruthy()

    expect(figureFor(LINE_DUY, 'Số tiền đề xuất')).toBe('20.000.000')
    expect(figureFor(LINE_DUY, 'HH cả căn')).toBe('71.880.000')
    // 71.880.000 × (1 − 10%) = 64.692.000
    expect(figureFor(LINE_DUY, 'Tối đa có thể ứng sau thuế')).toBe('64.692.000')
  })

  it('đổi thuế suất chỉ đổi "Tối đa có thể ứng sau thuế", KHÔNG đổi "HH cả căn"', () => {
    renderDialog('APPROVE')

    fireEvent.click(screen.getByLabelText('Tăng 5%'))
    fireEvent.click(screen.getByLabelText('Tăng 5%'))

    expect((screen.getByLabelText('Thuế suất tạm tính') as HTMLInputElement).value).toBe('20')
    // Hoa hồng gốc không phụ thuộc thuế suất — đây chính là lý do BA đòi thay dòng
    // "Ước tính thực nhận" bằng "HH cả căn".
    expect(figureFor(LINE_DUY, 'HH cả căn')).toBe('71.880.000')
    // 71.880.000 × (1 − 20%) = 57.504.000
    expect(figureFor(LINE_DUY, 'Tối đa có thể ứng sau thuế')).toBe('57.504.000')
  })

  it('cảnh báo khi số tiền duyệt vượt trần nhưng VẪN cho duyệt', async () => {
    renderDialog('APPROVE')

    // 18.000.000 < 20.000.000 đề xuất (BE cho qua) nhưng > 0 nên hợp lệ; đẩy lên sát trần
    // thực nhận bằng cách hạ thuế suất thì không tái hiện được — nên chỉnh thẳng số tiền.
    fireEvent.change(amountInput('Nguyễn Quang Duy'), { target: { value: '20000000' } })
    // Trần sau thuế 10% của Duy là 64.692.000 nên 20tr chưa vượt; đẩy thuế lên 100% để trần về 0.
    fireEvent.change(screen.getByLabelText('Thuế suất tạm tính'), { target: { value: '100' } })

    // Thuế 100% ⇒ trần của CẢ HAI người về 0, nên cả hai dòng cùng cảnh báo.
    expect(
      screen.getAllByText('Số tiền duyệt đang vượt mức tối đa có thể ứng sau thuế.')
    ).toHaveLength(2)

    const confirm = screen.getByTestId('confirm') as HTMLButtonElement
    expect(confirm.disabled).toBe(false)
    fireEvent.click(confirm)
    await vi.waitFor(() => expect(approveMutate).toHaveBeenCalledTimes(1))
  })

  it('gửi approved_amounts của từng người kèm nguồn tiền mặc định là tiền MV', async () => {
    const { onSuccess } = renderDialog('APPROVE')

    fireEvent.change(amountInput('Nguyễn Quang Duy'), { target: { value: '18000000' } })
    fireEvent.click(screen.getByTestId('confirm'))

    await vi.waitFor(() => expect(approveMutate).toHaveBeenCalledTimes(1))
    expect(approveMutate).toHaveBeenCalledWith({
      id: 43,
      data: {
        approved_amounts: [
          { recipient_line_id: LINE_DUY, approved_amount: '18000000' },
          { recipient_line_id: LINE_MY, approved_amount: '15000000' },
        ],
        funding_investor_advance_account_id: null,
      },
    })
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('chọn quỹ chủ đầu tư thì gửi đúng id quỹ đó', async () => {
    renderDialog('APPROVE')

    fireEvent.click(screen.getByRole('radio', { name: /Quỹ tạm ứng chủ đầu tư/ }))
    fireEvent.click(screen.getByTestId('confirm'))

    await vi.waitFor(() => expect(approveMutate).toHaveBeenCalledTimes(1))
    expect(approveMutate.mock.calls[0][0].data.funding_investor_advance_account_id).toBe(9)
  })

  it('chặn số tiền duyệt vượt số đề xuất trước khi gọi API', async () => {
    renderDialog('APPROVE')

    fireEvent.change(amountInput('Nguyễn Quang Duy'), { target: { value: '25000000' } })
    fireEvent.click(screen.getByTestId('confirm'))

    await vi.waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(approveMutate).not.toHaveBeenCalled()
  })

  it('phiếu KHÔNG gắn giao dịch thì không có dòng HH cả căn / Tối đa, vẫn duyệt được', async () => {
    mockRecord = { ...recordWithDeal(), deal: null, deal_detail: null }
    mockShares = undefined
    renderDialog('APPROVE')

    expect(screen.queryByText('HH cả căn')).toBeNull()
    expect(screen.queryByText('Tối đa có thể ứng sau thuế')).toBeNull()
    // Không có cơ sở so sánh thì KHÔNG được bịa cảnh báo.
    expect(screen.queryByText(/vượt mức tối đa/)).toBeNull()

    fireEvent.click(screen.getByTestId('confirm'))
    await vi.waitFor(() => expect(approveMutate).toHaveBeenCalledTimes(1))
  })
})

describe('CommissionAdvanceApproveDialog — phiếu chưa về', () => {
  it('tắt nút Duyệt khi chưa có phiếu, thay vì để nút bấm không xảy ra gì', () => {
    mockRecord = undefined
    renderDialog('APPROVE')

    expect((screen.getByTestId('confirm') as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('CommissionAdvanceApproveDialog — đang tải bảng chia', () => {
  /**
   * Đo thật 19/08 trên localhost: giây đầu sau khi bấm "Phê duyệt" ngoài màn Danh sách, bảng chia
   * và quỹ CĐT chưa về. Nếu khi đó ẩn hẳn hai dòng thì màn hình đọc y hệt "phiếu không gắn giao
   * dịch", và nhãn quỹ đọc thành "giao dịch này chưa có quỹ" — hai lời khẳng định SAI về nghiệp vụ,
   * không phải chỉ là chậm.
   */
  it('phiếu CÓ giao dịch mà bảng chia chưa về thì vẫn hiện nhãn kèm "—", không ẩn dòng', () => {
    mockShares = undefined
    mockSharesLoading = true
    renderDialog('APPROVE')

    expect(figureFor(LINE_DUY, 'HH cả căn')).toBe('—')
    expect(figureFor(LINE_DUY, 'Tối đa có thể ứng sau thuế')).toBe('—')
    // Chưa biết trần thì KHÔNG được bịa cảnh báo vượt trần.
    expect(screen.queryByText(/vượt mức tối đa/)).toBeNull()
  })

  it('quỹ CĐT đang tải thì nhãn nói "đang tải số dư", KHÔNG nói "chưa có quỹ"', () => {
    mockWallets = undefined
    mockWalletLoading = true
    renderDialog('APPROVE')

    expect(screen.getByText(/Quỹ tạm ứng chủ đầu tư \(đang tải số dư/)).toBeTruthy()
    expect(screen.queryByText(/giao dịch này chưa có quỹ/)).toBeNull()
  })

  it('quỹ CĐT đã tải xong mà không có thì mới nói "chưa có quỹ"', () => {
    mockWallets = { results: [] }
    mockWalletLoading = false
    renderDialog('APPROVE')

    expect(screen.getByText(/giao dịch này chưa có quỹ/)).toBeTruthy()
  })
})

describe('CommissionAdvanceApproveDialog — bước TP TKKD duyệt', () => {
  it('không có Nguồn tiền, không có thuế suất, không có HH cả căn', () => {
    renderDialog('ADMIN_LEAD_APPROVE')

    expect(screen.queryByText('Nguồn tiền')).toBeNull()
    expect(screen.queryByText('Thuế suất tạm tính')).toBeNull()
    expect(screen.queryByText('HH cả căn')).toBeNull()
    // Nhưng vẫn phải sửa được số tiền duyệt — đó là việc của bậc này.
    expect(amountInput('Nguyễn Quang Duy')).toBeTruthy()
  })

  it('gọi admin-lead-approve và KHÔNG kèm nguồn tiền', async () => {
    renderDialog('ADMIN_LEAD_APPROVE')

    fireEvent.click(screen.getByTestId('confirm'))

    await vi.waitFor(() => expect(adminLeadMutate).toHaveBeenCalledTimes(1))
    expect(approveMutate).not.toHaveBeenCalled()
    expect(adminLeadMutate.mock.calls[0][0].data).not.toHaveProperty(
      'funding_investor_advance_account_id'
    )
  })
})

describe('CommissionAdvanceApproveDialog — dọn state giữa hai phiếu', () => {
  /**
   * Ngoài màn Danh sách người dùng mở dialog cho nhiều phiếu liên tiếp, mà quỹ CĐT gắn với
   * (chủ đầu tư, dự án) của TỪNG phiếu. Giữ lại lựa chọn cũ là định tuyến tiền của phiếu sau
   * vào quỹ của phiếu trước.
   */
  it('đóng dialog thì trả nguồn tiền và thuế suất về mặc định', async () => {
    const { rerender } = renderDialog('APPROVE')

    fireEvent.click(screen.getByRole('radio', { name: /Quỹ tạm ứng chủ đầu tư/ }))
    fireEvent.click(screen.getByLabelText('Tăng 5%'))
    fireEvent.click(screen.getByTestId('cancel'))

    rerender(
      <CommissionAdvanceApproveDialog
        open
        advanceId={44}
        mode="APPROVE"
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />
    )

    expect((screen.getByLabelText('Thuế suất tạm tính') as HTMLInputElement).value).toBe('10')
    fireEvent.click(screen.getByTestId('confirm'))
    await vi.waitFor(() => expect(approveMutate).toHaveBeenCalledTimes(1))
    expect(approveMutate.mock.calls[0][0].data.funding_investor_advance_account_id).toBe(null)
  })
})
