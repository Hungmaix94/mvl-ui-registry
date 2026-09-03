import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Theme } from '@radix-ui/themes'

import { ConfirmationLogsTable, type ConfirmationLogEntry } from './ConfirmationLogsTable'

/**
 * Bảng người xác nhận dùng chung cho HĐ cọc / Phiếu TT giao dịch / Hoàn cọc, và
 * từ 86ey4vjmp thêm cả Đề xuất hỗ trợ phí. Mỗi loại phiếu có bộ
 * `confirmation_type` RIÊNG, nên bộ nhãn hardcode trong file không thể phủ hết —
 * `roleLabels` là đường để từng màn truyền nhãn app-constant của mình vào.
 */
function renderTable(logs: ConfirmationLogEntry[], roleLabels?: Record<string, string>) {
  return render(
    <MemoryRouter>
      <Theme>
        <ConfirmationLogsTable logs={logs} roleLabels={roleLabels} />
      </Theme>
    </MemoryRouter>
  )
}

const logCreator: ConfirmationLogEntry = {
  id: 1,
  employee_detail: { id: 7, fullname: 'Nguyễn Thị Thanh H', code: 'MV000001028' },
  confirmation_type: 'creator',
  performed_at: '2026-08-07T16:52:00+07:00',
  is_approved: false,
  note: 'Rút phiếu',
}

describe('ConfirmationLogsTable — roleLabels (86ey4vjmp)', () => {
  it('KHÔNG truyền roleLabels thì `creator` rơi về mã thô — đây là hiện trạng cần vá', () => {
    // Bộ hardcode trong file chỉ có sale/manager/admin/admin_lead/accountant/treasurer.
    // `creator` chiếm 7/43 log thật trên dev, nên nếu không có đường truyền nhãn
    // thì màn hỗ trợ phí in ra chữ tiếng Anh giữa bảng tiếng Việt.
    renderTable([logCreator])
    expect(screen.getByText(/creator/)).toBeInTheDocument()
  })

  it('truyền roleLabels thì hiện nhãn tiếng Việt của app-constant', () => {
    renderTable([logCreator], { creator: 'Người tạo (rút)' })
    expect(screen.getByText(/Người tạo \(rút\)/)).toBeInTheDocument()
    expect(screen.queryByText(/creator/)).not.toBeInTheDocument()
  })

  it('roleLabels ĐÈ lên bộ mặc định cho cùng một key', () => {
    // Hỗ trợ phí gọi accountant là "Kế toán (duyệt hồ sơ)", khác "Kế toán" mặc định.
    renderTable([{ ...logCreator, confirmation_type: 'accountant' }], {
      accountant: 'Kế toán (duyệt hồ sơ)',
    })
    expect(screen.getByText(/Kế toán \(duyệt hồ sơ\)/)).toBeInTheDocument()
  })

  it('key nào roleLabels THIẾU thì vẫn dùng nhãn mặc định — không làm hỏng 3 màn cũ', () => {
    // Đây là điều kiện để thay đổi này an toàn với HĐ cọc / TT giao dịch / hoàn cọc:
    // truyền một map chỉ có `creator` không được làm mất nhãn `sale`.
    renderTable([{ ...logCreator, confirmation_type: 'sale' }], { creator: 'Người tạo (rút)' })
    expect(screen.getByText(/Nhân viên sale/)).toBeInTheDocument()
  })

  it('không có log nào thì hiện "Không có dữ liệu" chứ không biến mất', () => {
    // Phiếu duyệt trước khi có cơ chế log (FSR-2026-000002) rơi vào đúng ca này.
    renderTable([])
    expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument()
  })
})
