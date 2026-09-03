import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

const mockUpdateLine = vi.fn().mockResolvedValue({})
vi.mock(
  '@/features/accounting/employee-payout-batches/services/employee-payout-batch-service',
  () => ({
    useUpdatePayoutBatchLine: () => ({ mutateAsync: mockUpdateLine }),
  })
)

const mockUseBankOptions = vi.fn(() => ({
  bankOptions: [{ value: 'Techcombank', label: 'TCB - Techcombank' }],
  isLoadingBanks: false,
}))
vi.mock('@/hooks/useBankOptions', () => ({
  default: () => mockUseBankOptions(),
}))

vi.mock('@/services/toast-service', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const mockCan = vi.fn().mockReturnValue(true)
vi.mock('@/lib/ability', () => ({
  useAbility: () => ({ can: mockCan }),
}))

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import { EmployeePayoutBatchDetailLines } from './EmployeePayoutBatchDetailLines'
import { PROPAGATION_NOTE } from './EditPayoutLineBankDialog'
import type { EmployeeCommissionPayoutBatch } from '../services/employee-payout-batch-service'

type Line = {
  id: number
  amount: string
  payment_voucher: number | null
  payee_name_snapshot: string
  payee_account_snapshot: string
  payee_bank_name_snapshot: string
}

function makeBatch(status: string, lineOverrides: Partial<Line> = {}) {
  return {
    id: 7,
    status,
    lines: [
      {
        id: 101,
        amount: '9000000',
        payment_voucher: null,
        payee_name_snapshot: 'Nguyễn Văn A',
        payee_account_snapshot: '0123456789',
        payee_bank_name_snapshot: 'Vietcombank',
        ...lineOverrides,
      },
    ],
  } as unknown as EmployeeCommissionPayoutBatch
}

function renderLines(record: EmployeeCommissionPayoutBatch) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <EmployeePayoutBatchDetailLines record={record} />
      </SidebarProvider>
    </QueryClientProvider>
  )
}

describe('EmployeePayoutBatchDetailLines — editable payee bank details (CR STT13)', () => {
  beforeEach(() => {
    mockUpdateLine.mockClear()
    mockUseBankOptions.mockClear()
    mockCan.mockReturnValue(true)
  })

  const EDIT_LABEL = 'Sửa số tài khoản và ngân hàng'

  function openDialog(view: ReturnType<typeof renderLines>) {
    fireEvent.click(view.getAllByLabelText(EDIT_LABEL)[0])
    return view.getByLabelText('Số tài khoản') as HTMLInputElement
  }

  it('opens the edit dialog from the row pencil and patches only the changed field', async () => {
    const view = renderLines(makeBatch('CONFIRMED'))
    const input = openDialog(view)
    expect(input.value).toBe('0123456789')

    fireEvent.change(input, { target: { value: ' 0987654321 ' } })
    fireEvent.click(view.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => {
      expect(mockUpdateLine).toHaveBeenCalledWith({
        id: 101,
        patch: { payee_account_snapshot: '0987654321' },
      })
    })
  })

  // Since 86eykeg1c one save also rewrites the payee's own profile and their lines in every open
  // batch. Nothing in the two fields hints at that, so the warning is the only disclosure the
  // accountant gets — guard it here rather than trusting it to survive the next dialog reshuffle.
  it('warns that saving also updates the payee profile and their other open batches', () => {
    const view = renderLines(makeBatch('CONFIRMED'))
    openDialog(view)

    expect(view.getByText(PROPAGATION_NOTE)).toBeInTheDocument()
  })

  it('keeps the bank columns read-only in the grid — editing goes through the dialog', () => {
    const { queryByLabelText, getByText } = renderLines(makeBatch('DRAFT'))

    expect(queryByLabelText('Số tài khoản')).toBeNull()
    expect(getByText('0123456789')).toBeInTheDocument()
    expect(getByText('Vietcombank')).toBeInTheDocument()
  })

  it('shows the BE rejection message on the form and keeps the typed value', async () => {
    mockUpdateLine.mockRejectedValueOnce({
      error: { detail: 'Line already has a posted voucher; its bank details are locked.' },
    })
    const view = renderLines(makeBatch('DRAFT'))
    const input = openDialog(view)

    fireEvent.change(input, { target: { value: '0987654321' } })
    fireEvent.click(view.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => {
      expect(
        view.getByText('Line already has a posted voucher; its bank details are locked.')
      ).toBeInTheDocument()
    })
    // The dialog stays open with the input intact so the accountant can correct and retry.
    expect(view.getByRole('button', { name: 'Lưu' })).toBeInTheDocument()
    expect((view.getByPlaceholderText('Nhập số tài khoản') as HTMLInputElement).value).toBe(
      '0987654321'
    )
  })

  it('disables Lưu until something actually changes', () => {
    const view = renderLines(makeBatch('DRAFT'))
    openDialog(view)

    expect(view.getByRole('button', { name: 'Lưu' })).toBeDisabled()
  })

  // The BE regex requires an alphanumeric first character, so a blank account comes back as a
  // regex-shaped 400. Refuse it here where the message can say what is actually wrong.
  it('refuses to save a cleared account number', () => {
    const view = renderLines(makeBatch('DRAFT'))
    const input = openDialog(view)

    fireEvent.change(input, { target: { value: '' } })

    expect(view.getByText('Số tài khoản không được để trống.')).toBeInTheDocument()
    expect(view.getByRole('button', { name: 'Lưu' })).toBeDisabled()
    expect(mockUpdateLine).not.toHaveBeenCalled()
  })

  // The bank master is a network call; a view-only visit must not pay for it.
  it('does not load the bank master until a row is actually opened', () => {
    const view = renderLines(makeBatch('DRAFT'))
    expect(mockUseBankOptions).not.toHaveBeenCalled()

    openDialog(view)
    expect(mockUseBankOptions).toHaveBeenCalled()
  })

  // A line can carry a payment_voucher while its batch sits below PAID when the batch was rolled
  // back out of PAID. Those are the rows accounting has to correct, so the voucher FK must not
  // lock the row — only the batch status does.
  it('still offers the edit action on a DRAFT batch whose line already has a voucher', async () => {
    const view = renderLines(makeBatch('DRAFT', { payment_voucher: 55 }))
    const input = openDialog(view)

    fireEvent.change(input, { target: { value: '0987654321' } })
    fireEvent.click(view.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => {
      expect(mockUpdateLine).toHaveBeenCalledWith({
        id: 101,
        patch: { payee_account_snapshot: '0987654321' },
      })
    })
  })

  it('still offers the edit action on a SENT_TO_BANK batch (bank rejected the transfer)', () => {
    const { getAllByLabelText } = renderLines(makeBatch('SENT_TO_BANK', { payment_voucher: 55 }))

    expect(getAllByLabelText(EDIT_LABEL).length).toBe(1)
  })

  it('hides the edit action on a CANCELLED batch', () => {
    const { queryAllByLabelText, getByText } = renderLines(makeBatch('CANCELLED'))

    expect(queryAllByLabelText(EDIT_LABEL)).toHaveLength(0)
    expect(getByText('Vietcombank')).toBeInTheDocument()
  })

  it('hides the edit action on a PAID batch', () => {
    const { queryAllByLabelText, getByText } = renderLines(
      makeBatch('PAID', { payment_voucher: 55 })
    )

    expect(queryAllByLabelText(EDIT_LABEL)).toHaveLength(0)
    expect(getByText('0123456789')).toBeInTheDocument()
    expect(getByText('Vietcombank')).toBeInTheDocument()
  })

  it('hides the edit action without the employeepayoutbatchline.partial_update permission', () => {
    mockCan.mockReturnValue(false)

    const { queryAllByLabelText, getByText } = renderLines(makeBatch('DRAFT'))

    expect(mockCan).toHaveBeenCalledWith('partial_update', 'employeepayoutbatchline')
    expect(queryAllByLabelText(EDIT_LABEL)).toHaveLength(0)
    expect(getByText('0123456789')).toBeInTheDocument()
  })

  it('strips characters Excel would read as a formula from the account number', async () => {
    const view = renderLines(makeBatch('DRAFT'))
    const input = openDialog(view)

    fireEvent.change(input, { target: { value: '=cmd|0987654321' } })
    expect(input.value).toBe('cmd0987654321')

    fireEvent.click(view.getByRole('button', { name: 'Lưu' }))
    await waitFor(() => {
      expect(mockUpdateLine).toHaveBeenCalledWith({
        id: 101,
        patch: { payee_account_snapshot: 'cmd0987654321' },
      })
    })
  })
})
