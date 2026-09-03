// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import DealRecipientEditableCell from './DealRecipientEditableCell'
import { getEmployeeService } from '@/features/employee/services/employee-service'

// The real picker opens its own dialog with cascade-select org filters and an ability check —
// none of that is under test here. Stub it down to a button that fires onChange with a fixed id,
// same technique as PooledSplitDialog's tests mock the payee pickers.
vi.mock(
  '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog',
  () => ({
    default: ({ onChange }: { onChange: (value: number | null) => void }) => (
      <button type="button" onClick={() => onChange(99)}>
        Pick employee 99
      </button>
    ),
  })
)

vi.mock('@/features/employee/services/employee-service', () => ({
  getEmployeeService: vi.fn(),
}))

const mockGetEmployeeService = vi.mocked(getEmployeeService)

function openPopover() {
  fireEvent.click(screen.getByRole('button', { name: 'Sửa người nhận mail' }))
}

describe('DealRecipientEditableCell', () => {
  beforeEach(() => {
    mockGetEmployeeService.mockReset()
  })

  it('shows the current recipient name and opens the edit popover on the pencil button', () => {
    render(
      <DealRecipientEditableCell
        dealCode="HD001"
        recipientEmployee={{ type: 'employee', id: 1, name: 'Nguyễn Văn A' }}
        recipientEmail="a@mvl.vn"
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText('Nguyễn Văn A')).toBeTruthy()

    openPopover()
    expect(screen.getByText('Người nhận mail đối chiếu — HD001')).toBeTruthy()
  })

  it('auto-fills the email from the newly picked employee, then still lets the accountant edit it', async () => {
    mockGetEmployeeService.mockReturnValue({
      getEmployee: vi.fn().mockResolvedValue({ id: 99, email: 'line-owner@mvl.vn' }),
    } as any)

    const onConfirm = vi.fn()
    render(
      <DealRecipientEditableCell
        dealCode="HD001"
        recipientEmployee={{ type: 'employee', id: 1, name: 'Nguyễn Văn A' }}
        recipientEmail="a@mvl.vn"
        onConfirm={onConfirm}
      />
    )

    openPopover()
    fireEvent.click(screen.getByText('Pick employee 99'))

    const emailInput = (await screen.findByDisplayValue('line-owner@mvl.vn')) as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: 'edited-by-hand@mvl.vn' } })

    fireEvent.click(screen.getByText('Xác nhận'))

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith({
        recipientEmployeeId: 99,
        recipientEmail: 'edited-by-hand@mvl.vn',
      })
    })
  })

  it('keeps the drafted email when the employee lookup fails, instead of clearing it', async () => {
    mockGetEmployeeService.mockReturnValue({
      getEmployee: vi.fn().mockRejectedValue(new Error('network error')),
    } as any)

    render(
      <DealRecipientEditableCell
        dealCode="HD001"
        recipientEmployee={{ type: 'employee', id: 1, name: 'Nguyễn Văn A' }}
        recipientEmail="a@mvl.vn"
        onConfirm={vi.fn()}
      />
    )

    openPopover()
    fireEvent.click(screen.getByText('Pick employee 99'))

    await waitFor(() => {
      expect(screen.getByDisplayValue('a@mvl.vn')).toBeTruthy()
    })
  })

  it('discards draft changes on Huỷ — a re-open shows the original values, not the abandoned draft', async () => {
    mockGetEmployeeService.mockReturnValue({
      getEmployee: vi.fn().mockResolvedValue({ id: 99, email: 'line-owner@mvl.vn' }),
    } as any)

    const onConfirm = vi.fn()
    render(
      <DealRecipientEditableCell
        dealCode="HD001"
        recipientEmployee={{ type: 'employee', id: 1, name: 'Nguyễn Văn A' }}
        recipientEmail="a@mvl.vn"
        onConfirm={onConfirm}
      />
    )

    openPopover()
    fireEvent.click(screen.getByText('Pick employee 99'))
    await screen.findByDisplayValue('line-owner@mvl.vn')

    fireEvent.click(screen.getByText('Huỷ'))
    expect(onConfirm).not.toHaveBeenCalled()

    openPopover()
    expect(screen.getByDisplayValue('a@mvl.vn')).toBeTruthy()
  })

  it('disables the edit trigger when the caller marks the cell disabled (no permission)', () => {
    render(
      <DealRecipientEditableCell
        dealCode="HD001"
        recipientEmployee={{ type: 'employee', id: 1, name: 'Nguyễn Văn A' }}
        recipientEmail="a@mvl.vn"
        disabled
        onConfirm={vi.fn()}
      />
    )

    const trigger = screen.getByRole('button', { name: 'Sửa người nhận mail' }) as HTMLButtonElement
    expect(trigger.disabled).toBe(true)
  })
})
