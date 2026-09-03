import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { vi } from 'vitest'

import CollaboratorCreatePage from './CollaboratorCreatePage'

vi.mock('@/components/ui', () => ({
  PageTitle: ({ title }: { title: string }) => <h1>{title}</h1>,
}))

// Chỉ cần biết page truyền `initialValues` nào xuống form.
vi.mock('@/features/accounting/collaborators/_shares/components/CollaboratorForm.tsx', () => ({
  default: ({ initialValues }: { initialValues?: Record<string, unknown> }) => (
    <span data-testid="initial-values">{JSON.stringify(initialValues ?? null)}</span>
  ),
}))

const PATH = '/accounting/collaborator/manage/new'

function renderPage(search = '', state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: PATH, search, state }]}>
      <Routes>
        <Route path={PATH} element={<CollaboratorCreatePage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CollaboratorCreatePage — prefill từ picker CTV (CR STT26)', () => {
  it('không có query param → không prefill', () => {
    renderPage()

    expect(screen.getByTestId('initial-values')).toHaveTextContent('null')
    expect(screen.getByRole('heading')).toHaveTextContent('Thêm Cộng tác viên')
  })

  it('prefill CCCD từ `id_number`', () => {
    renderPage('?id_number=079123456789')

    expect(screen.getByTestId('initial-values')).toHaveTextContent('"id_number":"079123456789"')
  })

  it('prefill họ tên từ `name` (kể cả có dấu)', () => {
    renderPage(`?name=${encodeURIComponent('Nguyễn Văn Hoàng')}`)

    expect(screen.getByTestId('initial-values')).toHaveTextContent('"name":"Nguyễn Văn Hoàng"')
  })

  // Nhân bản CTV đi qua `location.state`; param URL không được ghi đè dữ liệu nhân bản.
  it('state nhân bản thắng query param và đổi tiêu đề trang', () => {
    renderPage('?name=Gõ%20nhầm', { initialValues: { name: 'CTV gốc', phone: '0901234567' } })

    expect(screen.getByTestId('initial-values')).toHaveTextContent('"name":"CTV gốc"')
    expect(screen.getByRole('heading')).toHaveTextContent('Nhân bản Cộng tác viên')
  })
})
