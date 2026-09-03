import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/firebase', () => ({ getFCMToken: vi.fn().mockResolvedValue(''), messaging: null }))
// Ô "Dự án" gọi API lấy danh sách khi mount; bộ test này chỉ nói về hình dạng của form.
vi.mock('@/hooks/useProjectSelect', () => ({
  useProjectSelect: () => ({
    loadProjectOptions: vi.fn().mockResolvedValue([]),
    loadInitialProjectOptions: vi.fn().mockResolvedValue([]),
  }),
}))

import ProjectReceivableFilter, {
  type ProjectReceivableFilterFormData,
  type ProjectReceivableFilterRef,
} from './ProjectReceivableFilter'

const DEFAULT_VALUES: ProjectReceivableFilterFormData = { project: null, hasDebt: true }

function renderFilter(initialValues: ProjectReceivableFilterFormData = DEFAULT_VALUES) {
  const ref = createRef<ProjectReceivableFilterRef>()
  const view = render(<ProjectReceivableFilter ref={ref} initialValues={initialValues} isOpen />)
  return { ref, view }
}

describe('ProjectReceivableFilter — hình dạng dialog', () => {
  it('ô tick có TIÊU ĐỀ VÙNG DỮ LIỆU gọi đúng tên cột nó lọc theo', () => {
    // Luật conventions.md: thả `Checkbox` trần vào lưới lọc là ô đó trôi lơ lửng, người dùng
    // không biết nó tác động vào cột nào. Tiêu đề phải trùng tên cột trên bảng ("Cuối kỳ"),
    // không phải một tên nghiệp vụ chung chung. Đây là test canh luật — nó đã tái phạm nhiều lần.
    renderFilter()

    const heading = screen.getByText('Cuối kỳ')
    expect(heading.tagName).toBe('SPAN')
    expect(heading).toBeInTheDocument()
  })

  it('ô tick chỉ có ĐÚNG MỘT nhãn, để trình đọc màn hình không đọc lặp tên control', () => {
    // Tiêu đề vùng phải là `span`: `Checkbox` đã tự gắn `<label htmlFor>` của nó rồi.
    renderFilter()

    const checkbox = screen.getByRole('checkbox', { name: 'Chỉ hiện dòng có Cuối kỳ > 0' })
    expect(checkbox).toBeInTheDocument()
    expect(screen.getAllByText('Chỉ hiện dòng có Cuối kỳ > 0')).toHaveLength(1)
  })

  it('mở màn ô tick BẬT sẵn — SRS 20.16 §2.2', () => {
    const { ref } = renderFilter()

    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(ref.current?.getValues()).toMatchObject({ hasDebt: true })
  })

  it('"Xoá bộ lọc" trả về mặc định của màn, không xoá trắng ô tick', () => {
    const { ref } = renderFilter({ project: 196, hasDebt: false })

    ref.current?.clearForm()

    expect(ref.current?.getValues()).toEqual({ project: null, hasDebt: true })
  })
})
