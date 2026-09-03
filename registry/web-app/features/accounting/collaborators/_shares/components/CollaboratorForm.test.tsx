import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import CollaboratorForm from './CollaboratorForm'

// jsdom không có ResizeObserver; `Select` dùng nó qua `useMatchTriggerWidth`.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

const { createMock, updateMock, invalidateByPrefixMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateMock: vi.fn(),
  invalidateByPrefixMock: vi.fn(),
}))

vi.mock('@/features/accounting/collaborators/services/collaborator-service.ts', () => ({
  useCollaborator: () => ({ data: undefined, isLoading: false }),
  useCreateCollaborator: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdateCollaborator: () => ({ mutateAsync: updateMock, isPending: false }),
}))

vi.mock('@/hooks/useApiQuery.ts', () => ({
  useInvalidateQueries: () => ({ invalidateByPrefix: invalidateByPrefixMock }),
}))

vi.mock('@/services/common-service', () => ({ useBanks: () => ({ data: { results: [] } }) }))

vi.mock('@/services/toast-service.tsx', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

describe('CollaboratorForm', () => {
  beforeEach(() => {
    createMock.mockReset().mockResolvedValue({ id: 1 })
    updateMock.mockReset()
    invalidateByPrefixMock.mockReset()
  })

  // Điều hướng do nơi gọi quyết định (`onSuccess`/`onCancel` — cả hai BẮT BUỘC), form không được
  // đụng hook router: từng có lúc form bị render ngoài Router (dialog toàn cục) và `useNavigate()`
  // làm nổ cả cây component.
  it('render được khi KHÔNG có Router bao ngoài', () => {
    expect(() => render(<CollaboratorForm onSuccess={vi.fn()} onCancel={vi.fn()} />)).not.toThrow()
    expect(screen.getByText('Họ tên')).toBeInTheDocument()
  })

  it('nút "Huỷ" gọi onCancel do nơi gọi truyền vào', async () => {
    const user = userEvent.setup()
    const handleCancel = vi.fn()
    render(<CollaboratorForm onSuccess={vi.fn()} onCancel={handleCancel} />)

    await user.click(screen.getByRole('button', { name: 'Huỷ' }))

    expect(handleCancel).toHaveBeenCalledTimes(1)
  })

  it('tự tạo CTV rồi gọi onSuccess (page lo điều hướng)', async () => {
    const user = userEvent.setup()
    const handleSuccess = vi.fn()
    render(
      <CollaboratorForm
        initialValues={{ name: 'Nguyễn Văn Hoàng' }}
        onSuccess={handleSuccess}
        onCancel={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'Nguyễn Văn Hoàng' }))
    expect(invalidateByPrefixMock).toHaveBeenCalledWith('sales/collaborators')
    expect(handleSuccess).toHaveBeenCalledTimes(1)
  })
})
