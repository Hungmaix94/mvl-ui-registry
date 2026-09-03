import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { FEE_SUPPORT_GATE_ERROR_CODE } from '../constants/fee-support-request-constants'
import { FeeSupportGateNoticeFromError } from './FeeSupportGateNotice'

vi.mock('./FeeSupportRequestStatusBadge', () => ({
  FeeSupportRequestStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}))

const renderFromError = (extra: Parameters<typeof FeeSupportGateNoticeFromError>[0]['extra']) =>
  render(
    <MemoryRouter>
      <FeeSupportGateNoticeFromError extra={extra} onCreate={vi.fn()} />
    </MemoryRouter>
  )

describe('FeeSupportGateNoticeFromError', () => {
  it('chưa có phiếu → mời tạo phiếu', () => {
    renderFromError({ code: FEE_SUPPORT_GATE_ERROR_CODE.MISSING, blocking_proposals: [] })

    expect(screen.getByText(/Chưa có phiếu đề xuất nào/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tạo phiếu hỗ trợ bán hàng' })).toBeInTheDocument()
  })

  it('phiếu còn trong thang duyệt → liệt kê mã phiếu, KHÔNG mời tạo thêm', () => {
    renderFromError({
      code: FEE_SUPPORT_GATE_ERROR_CODE.NOT_APPROVED,
      blocking_proposals: [
        { code: 'FSR-2026-000012', status: 'pending_tpkd', status_display: 'Chờ TPKD' },
      ],
    })

    expect(screen.getByText('FSR-2026-000012')).toBeInTheDocument()
    expect(screen.getByText(/Duyệt nốt phiếu/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tạo phiếu hỗ trợ bán hàng' })).toBeNull()
  })

  // Ca này khác hẳn hai ca trên: phiếu ĐÃ duyệt xong nên đợi thêm không hết lỗi.
  // Hướng dẫn sai ở đây đẩy kế toán vào vòng chờ vô hạn.
  it('phiếu đã duyệt nhưng không còn khớp giao dịch → nêu lý do + bảo thu hồi', () => {
    renderFromError({
      code: FEE_SUPPORT_GATE_ERROR_CODE.DEFERRED_FAILED,
      blocking_proposals: [
        {
          code: 'FSR-2026-000012',
          status: 'approved_pending_deal',
          status_display: 'Đã duyệt, chờ giao dịch',
        },
      ],
      reasons: ['Deal revenue is FIXED — sale support must be a fixed amount (D9).'],
    })

    expect(screen.getByText(/không còn hợp lệ với giao dịch/)).toBeInTheDocument()
    expect(screen.getByText(/Thu hồi phiếu/)).toBeInTheDocument()
    expect(screen.getByText(/sale support must be a fixed amount/)).toBeInTheDocument()
    // Không mời tạo phiếu mới khi phiếu cũ còn sống — tạo sẽ bị P8 chặn.
    expect(screen.queryByRole('button', { name: 'Tạo phiếu hỗ trợ bán hàng' })).toBeNull()
  })
})
