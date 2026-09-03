import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LeaderEmployee } from '@/features/employee/services/employee-service'

const mockMutateAsync = vi.fn()
vi.mock('@/features/employee/services/employee-service', () => ({
  useSetLeadershipAppointedDate: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}))

const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock('@/services/toast-service', () => ({
  default: {
    success: (...a: unknown[]) => mockToastSuccess(...a),
    error: (...a: unknown[]) => mockToastError(...a),
  },
}))

// Stub the calendar popover — only its `value`/`onChange` contract matters here, not the UI.
vi.mock('@/components/ui/calendar/date-single-picker/date-picker', () => ({
  DatePicker: (props: { value?: string; onChange?: (v: string) => void }) => (
    <div>
      <span data-testid="date-value">{props.value}</span>
      <button type="button" data-testid="date-set" onClick={() => props.onChange?.('21/09/2020')}>
        set
      </button>
      <button type="button" data-testid="date-clear" onClick={() => props.onChange?.('')}>
        clear
      </button>
    </div>
  ),
}))

import EditLeadershipAppointedDateDialog from './EditLeadershipAppointedDateDialog'

function makeEmployee(overrides: Partial<LeaderEmployee> = {}): LeaderEmployee {
  return {
    id: 1,
    fullname: 'Nguyễn Văn A',
    leadership_appointed_date: '2023-06-15',
    ...overrides,
  } as LeaderEmployee
}

beforeEach(() => {
  mockMutateAsync.mockReset().mockResolvedValue(makeEmployee())
  mockToastSuccess.mockReset()
  mockToastError.mockReset()
})

describe('EditLeadershipAppointedDateDialog — HR chỉnh tay ngày bổ nhiệm (5.6 fsd.md §2.1, §3.2)', () => {
  it('hiện tiêu đề kèm tên nhân viên và ngày hiện tại (định dạng hiển thị)', () => {
    render(<EditLeadershipAppointedDateDialog isOpen onClose={vi.fn()} employee={makeEmployee()} />)

    expect(
      screen.getByText('Sửa ngày bổ nhiệm lên ban lãnh đạo - Nguyễn Văn A')
    ).toBeInTheDocument()
    expect(screen.getByTestId('date-value')).toHaveTextContent('15/06/2023')
  })

  it('gửi ngày mới dạng yyyy-MM-dd khi lưu mà không đổi gì khác', async () => {
    render(<EditLeadershipAppointedDateDialog isOpen onClose={vi.fn()} employee={makeEmployee()} />)

    fireEvent.click(screen.getByText('Xác nhận'))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 1,
        data: { leadership_appointed_date: '2023-06-15', note: '' },
      })
    })
  })

  it('xoá trắng ngày thì gửi null (không phải chuỗi rỗng)', async () => {
    render(<EditLeadershipAppointedDateDialog isOpen onClose={vi.fn()} employee={makeEmployee()} />)

    fireEvent.click(screen.getByTestId('date-clear'))
    fireEvent.click(screen.getByText('Xác nhận'))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 1,
        data: { leadership_appointed_date: null, note: '' },
      })
    })
  })

  it('nhập ngày mới + ghi chú thì gửi đúng cả hai, và báo thành công + đóng dialog', async () => {
    const onClose = vi.fn()
    render(<EditLeadershipAppointedDateDialog isOpen onClose={onClose} employee={makeEmployee()} />)

    fireEvent.click(screen.getByTestId('date-set'))
    fireEvent.change(screen.getByPlaceholderText('Lý do điều chỉnh (không bắt buộc)...'), {
      target: { value: 'Theo hồ sơ giấy' },
    })
    fireEvent.click(screen.getByText('Xác nhận'))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: 1,
      data: { leadership_appointed_date: '2020-09-21', note: 'Theo hồ sơ giấy' },
    })
    expect(mockToastSuccess).toHaveBeenCalled()
  })

  it('báo lỗi và KHÔNG đóng dialog khi API thất bại', async () => {
    mockMutateAsync.mockReset().mockRejectedValue(new Error('Không có quyền'))
    const onClose = vi.fn()
    render(<EditLeadershipAppointedDateDialog isOpen onClose={onClose} employee={makeEmployee()} />)

    fireEvent.click(screen.getByText('Xác nhận'))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Không có quyền')
    })
    expect(onClose).not.toHaveBeenCalled()
  })
})
