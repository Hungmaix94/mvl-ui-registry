// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Dialog sửa nhanh người đại diện MVL (86eynadnn) — chỉ cần soi đúng payload PATCH gửi đi
 * (chọn nhân viên bắt buộc, D12) và việc đóng dialog sau khi thành công, không cần dựng lại
 * toàn bộ F2ReconciliationForm hay EmployeeSelectWithDialog thật (đã có test riêng).
 */

const mutateAsync = vi.fn().mockResolvedValue({})
vi.mock('../services/f2-reconciliation-service', () => ({
  usePartialUpdateF2ReconciliationSheet: () => ({ mutateAsync, isPending: false }),
}))

const displayClose = vi.fn()
vi.mock('@/hooks/useDialog', () => ({
  useDialog: () => ({ displayClose }),
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('@/services/toast-service', () => ({
  default: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}))

vi.mock(
  '@/features/decision-and-proposal/decision/_shares/components/EmployeeSelectWithDialog',
  () => ({
    default: ({
      value,
      onChange,
      error,
      label,
    }: {
      value: number | null
      onChange: (value: number | null) => void
      error?: string
      label?: string
    }) => (
      <div>
        <label htmlFor="mvl-representative-stub">{label}</label>
        <input
          id="mvl-representative-stub"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        />
        {error && <span>{error}</span>}
      </div>
    ),
  })
)

import F2RepresentativeEditForm from './F2RepresentativeEditForm'

function renderForm(
  initialValues: { mvl_representative: number | null } = { mvl_representative: 42 }
) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <F2RepresentativeEditForm sheetId={7} initialValues={initialValues} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('F2RepresentativeEditForm', () => {
  it('điền sẵn nhân viên hiện tại của phiếu', () => {
    renderForm()

    expect(screen.getByDisplayValue('42')).toBeInTheDocument()
  })

  it('gửi PATCH đúng id và payload rồi đóng dialog khi thành công', async () => {
    renderForm()

    fireEvent.change(screen.getByDisplayValue('42'), { target: { value: '99' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync).toHaveBeenCalledWith({
      id: 7,
      data: {
        mvl_representative: 99,
      },
    })
    await waitFor(() => expect(displayClose).toHaveBeenCalled())
  })

  it('chặn submit khi chưa chọn nhân viên — không gọi API', async () => {
    renderForm({ mvl_representative: null })

    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    await screen.findByText('Vui lòng chọn người đại diện')
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('báo lỗi qua toast khi BE từ chối (vd sheet đã CONFIRMED), không đóng dialog', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('Locked'))
    renderForm()

    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(displayClose).not.toHaveBeenCalled()
  })
})
