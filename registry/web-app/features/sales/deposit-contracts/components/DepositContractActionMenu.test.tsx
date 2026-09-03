import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DepositContractActionMenu } from './DepositContractActionMenu'

// Nút "Tạo phiếu hỗ trợ bán hàng" là lối ra DUY NHẤT khi HĐ cọc tick cờ đề xuất mà
// chưa có phiếu và đã trôi tới pending_accountant (màn Sửa bị ẩn từ trạng thái này).
// Quên cộng handler vào `hasActions` là menu biến mất sạch ⇒ kẹt lại như cũ.
describe('DepositContractActionMenu — tạo phiếu hỗ trợ bán hàng', () => {
  it('hiện menu + mục tạo phiếu khi CHỈ có handler hỗ trợ bán hàng', async () => {
    const onCreateFeeSupportRequest = vi.fn()
    render(<DepositContractActionMenu onCreateFeeSupportRequest={onCreateFeeSupportRequest} />)

    // Radix khoá pointer-events trên nền khi popover mở → userEvent.click từ chối
    // bấm mục bên trong; fireEvent bỏ qua kiểm tra đó.
    await userEvent.click(screen.getByRole('button', { name: 'Thao tác' }))
    fireEvent.click(screen.getByText('Tạo phiếu hỗ trợ bán hàng'))

    expect(onCreateFeeSupportRequest).toHaveBeenCalledTimes(1)
  })

  it('không hiện mục tạo phiếu khi không truyền handler', async () => {
    render(<DepositContractActionMenu onEdit={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Thao tác' }))

    expect(screen.queryByText('Tạo phiếu hỗ trợ bán hàng')).not.toBeInTheDocument()
  })
})

// Cọc vướng cổng đề xuất hỗ trợ phí: khoá 3 mục DUYỆT nhưng phải GIỮ mục TỪ CHỐI —
// từ chối chính là một trong hai lối thoát khi tick nhầm cờ.
describe('DepositContractActionMenu — cổng đề xuất hỗ trợ phí', () => {
  const reason = 'Phiếu đề xuất hỗ trợ phí chưa được duyệt.'

  const renderBlocked = (onApprove = vi.fn(), onReject = vi.fn()) => {
    render(
      <DepositContractActionMenu
        onApprove={onApprove}
        onReject={onReject}
        onAccountantApprove={vi.fn()}
        onAdminLeadApprove={vi.fn()}
        approveDisabledReason={reason}
      />
    )
    return { onApprove, onReject }
  }

  it('khoá đúng 3 mục duyệt và nêu lý do', async () => {
    const { onApprove } = renderBlocked()
    await userEvent.click(screen.getByRole('button', { name: 'Thao tác' }))

    // Tooltip lý do chỉ gắn trên mục bị khoá ⇒ đếm nó là đếm đúng phạm vi khoá.
    const blocked = screen.getAllByTitle(reason)
    expect(blocked).toHaveLength(3)
    blocked.forEach((button) => expect(button).toBeDisabled())

    fireEvent.click(screen.getByText('Phê duyệt'))
    expect(onApprove).not.toHaveBeenCalled()
  })

  it('vẫn cho từ chối — đó là lối thoát', async () => {
    const { onReject } = renderBlocked()
    await userEvent.click(screen.getByRole('button', { name: 'Thao tác' }))

    fireEvent.click(screen.getByText('Từ chối'))
    expect(onReject).toHaveBeenCalledTimes(1)
  })

  it('không khoá gì khi không truyền lý do', async () => {
    const onApprove = vi.fn()
    render(<DepositContractActionMenu onApprove={onApprove} />)
    await userEvent.click(screen.getByRole('button', { name: 'Thao tác' }))

    fireEvent.click(screen.getByText('Phê duyệt'))
    expect(onApprove).toHaveBeenCalledTimes(1)
  })
})
