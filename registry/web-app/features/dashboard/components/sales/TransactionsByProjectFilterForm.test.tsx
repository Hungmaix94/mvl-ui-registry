import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const PROJECT_ITEMS = [
  { value: '1', label: 'Dự án A' },
  { value: '2', label: 'Dự án B' },
]

vi.mock('@/hooks/useProjectSelect', () => ({
  useProjectSelect: () => ({
    loadProjectOptions: () =>
      Promise.resolve({ items: PROJECT_ITEMS, hasNextPage: false, nextPage: null }),
    loadInitialProjectOptions: (values: (string | number)[]) =>
      Promise.resolve(PROJECT_ITEMS.filter((item) => values.map(String).includes(item.value))),
  }),
}))

// Imported after the mock above is registered.
import TransactionsByProjectFilterForm, {
  type TransactionsByProjectFilterFormRef,
} from './TransactionsByProjectFilterForm'

/** Dựng form và trả về ref — KHÔNG phải render result, nên không đặt tên `render*`. */
const mountForm = () => {
  const ref = createRef<TransactionsByProjectFilterFormRef>()
  render(<TransactionsByProjectFilterForm ref={ref} />)
  return ref
}

describe('TransactionsByProjectFilterForm — nhãn ô ngày nói ra căn cứ tính', () => {
  // Phản hồi người dùng 2026-08-26: dialog có HAI ô khoảng ngày, ô TTGD thì rõ, ô còn lại
  // tên là "Khoảng thời gian" — đọc xong vẫn không biết nó lọc theo ngày nào. Cùng chữ với
  // màn Tổng quan bán hàng để bốn màn đọc như một.
  it('ô ngày cọc nêu rõ căn cứ, không còn tên chung chung "Khoảng thời gian"', () => {
    mountForm()

    expect(screen.getByText('Thời gian (tính theo ngày cọc)')).toBeTruthy()
    expect(screen.queryByText('Khoảng thời gian')).toBeNull()
  })

  it('vẫn giữ nguyên ô ngày làm phiếu TTGD bên cạnh', () => {
    mountForm()

    expect(screen.getByText('Ngày làm phiếu TTGD')).toBeTruthy()
  })
})
