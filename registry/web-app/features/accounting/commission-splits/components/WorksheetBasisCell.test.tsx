import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WorksheetBasisCell } from './WorksheetBasisCell'

/**
 * CR STT34 (`86eyf8grj`) — ô "Giá tính phí" của hai màn danh sách worksheet.
 *
 * Kiểm thử nghiệm thu của CR nằm ở đây: cảnh báo phải nói RÕ tăng hay giảm bao nhiêu (không chỉ
 * một icon "có gì đó đổi"), và phải im lặng khi giá không đổi hoặc chưa có kỳ nào để so.
 */
const row = (overrides: Partial<Parameters<typeof WorksheetBasisCell>[0]['row']> = {}) => ({
  basis: '1200000000',
  previous_basis: null,
  basis_delta: null,
  ...overrides,
})

describe('WorksheetBasisCell', () => {
  it('luôn hiện giá tính phí của kỳ', () => {
    render(<WorksheetBasisCell row={row()} />)

    expect(screen.getByText('1.200.000.000')).toBeInTheDocument()
  })

  it('kỳ đầu tiên → không có huy hiệu cảnh báo', () => {
    render(<WorksheetBasisCell row={row()} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('giá không đổi → không có huy hiệu cảnh báo', () => {
    render(<WorksheetBasisCell row={row({ previous_basis: '1200000000', basis_delta: '0' })} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('giá tăng → huy hiệu ghi dấu cộng kèm số chênh lệch', () => {
    render(
      <WorksheetBasisCell row={row({ previous_basis: '1000000000', basis_delta: '200000000' })} />
    )

    const badge = screen.getByRole('button')
    expect(badge).toHaveTextContent('+200.000.000')
    expect(badge).toHaveAccessibleName(/tăng 200\.000\.000 đồng/)
  })

  it('giá giảm → huy hiệu ghi dấu trừ kèm số chênh lệch', () => {
    render(
      <WorksheetBasisCell
        row={row({ basis: '800000000', previous_basis: '1000000000', basis_delta: '-200000000' })}
      />
    )

    const badge = screen.getByRole('button')
    expect(badge).toHaveTextContent('-200.000.000')
    expect(badge).toHaveAccessibleName(/giảm 200\.000\.000 đồng/)
  })

  it('bấm vào huy hiệu KHÔNG kích hoạt click của hàng', () => {
    // Hàng của cả hai bảng danh sách đều điều hướng sang màn chi tiết khi click. Không chặn
    // nổi bọt thì kế toán bấm vào cảnh báo để đọc lại bị quăng khỏi bảng đang đối chiếu.
    const onRowClick = vi.fn()
    render(
      <div onClick={onRowClick}>
        <WorksheetBasisCell row={row({ previous_basis: '1000000000', basis_delta: '200000000' })} />
      </div>
    )

    fireEvent.click(screen.getByRole('button'))

    expect(onRowClick).not.toHaveBeenCalled()
  })
})
