import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import DashboardTablePagination from './DashboardTablePagination'

const setup = (props: Partial<Parameters<typeof DashboardTablePagination>[0]> = {}) => {
  const onPageChange = vi.fn()
  render(
    <DashboardTablePagination
      page={1}
      pageSize={10}
      totalCount={31}
      unitLabel="dòng"
      onPageChange={onPageChange}
      {...props}
    />
  )
  return { onPageChange }
}

describe('DashboardTablePagination', () => {
  it('không hiện gì khi tổng số dòng không vượt quá một trang', () => {
    setup({ totalCount: 10 })

    expect(screen.queryByRole('button', { name: 'Trang sau' })).not.toBeInTheDocument()
  })

  it('hiện số trang và tổng số dòng kèm đơn vị', () => {
    setup({ page: 2, totalCount: 31 })

    expect(screen.getByText('Trang 2/4 · 31 dòng')).toBeInTheDocument()
  })

  it('khoá nút lùi ở trang đầu và nút tiến ở trang cuối', () => {
    const { onPageChange } = setup({ page: 1 })
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeEnabled()
    expect(onPageChange).not.toHaveBeenCalled()

    screen.getByRole('button', { name: 'Trang sau' })

    render(
      <DashboardTablePagination
        page={4}
        pageSize={10}
        totalCount={31}
        unitLabel="dòng"
        onPageChange={vi.fn()}
      />
    )
    const lastPageButtons = screen.getAllByRole('button', { name: 'Trang sau' })
    expect(lastPageButtons[lastPageButtons.length - 1]).toBeDisabled()
  })

  it('bấm tiến/lùi trả về đúng số trang kế tiếp', async () => {
    const user = userEvent.setup()
    const { onPageChange } = setup({ page: 2 })

    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(onPageChange).toHaveBeenCalledWith(3)

    await user.click(screen.getByRole('button', { name: 'Trang trước' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})
