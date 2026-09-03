// @vitest-environment jsdom
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockUseDealPaymentProgress = vi.fn()
vi.mock('../services/commission-splits-service', () => ({
  useDealPaymentProgress: (...args: unknown[]) => mockUseDealPaymentProgress(...args),
}))

import { DealPaymentProgressTable } from './DealPaymentProgressTable'

/**
 * "Đang tải" KHÔNG được hiển thị ra thành "không có dữ liệu".
 *
 * Bug thực địa: đổi kỳ / mở màn lần đầu, các mục render nhánh empty state ("Chưa có dữ liệu",
 * "Chưa có kỳ đối chiếu nào cho căn này") trong lúc API còn đang bay. Người dùng đọc thành
 * "giao dịch này không có dữ liệu" rồi đi báo lỗi — màn nói SAI chứ không chỉ xấu.
 *
 * Test khoá đúng một mệnh đề đó: lúc `isLoading` thì phải ra khung xương, và tuyệt đối không
 * có câu empty state nào. Chọn `DealPaymentProgressTable` vì nó có đủ ba nhánh (loading /
 * rỗng / có dữ liệu) trong cùng một `<tbody>`, đúng chỗ dễ mắc lỗi nhất.
 */
const renderTable = () =>
  render(
    <MemoryRouter>
      <DealPaymentProgressTable dealId={1} />
    </MemoryRouter>
  )

const EMPTY_MESSAGE = /Chưa có kỳ đối chiếu nào cho căn này/

describe('Trạng thái đang tải không được biến thành empty state', () => {
  it('đang tải: hiện khung xương, KHÔNG hiện câu "chưa có dữ liệu"', () => {
    mockUseDealPaymentProgress.mockReturnValue({ data: undefined, isLoading: true })
    renderTable()

    expect(screen.queryByText(EMPTY_MESSAGE)).toBeNull()
    // Hàng khung xương gắn `aria-busy` để trình đọc màn hình không đọc ra một bảng rỗng giả
    // — nên tra đúng bằng vai trò + trạng thái, không thọc DOM.
    expect(screen.getAllByRole('row', { busy: true }).length).toBeGreaterThan(0)
  })

  it('tải xong mà thật sự rỗng: mới được hiện câu "chưa có dữ liệu", và hết khung xương', () => {
    mockUseDealPaymentProgress.mockReturnValue({
      data: { periods: [], summary: null, unassigned_received: 0 },
      isLoading: false,
    })
    renderTable()

    expect(screen.getByText(EMPTY_MESSAGE)).toBeTruthy()
    expect(screen.queryAllByRole('row', { busy: true })).toHaveLength(0)
  })
})
