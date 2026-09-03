import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useCollaboratorDelete } from './useCollaboratorDelete'

const { displayConfirm, setLoading, mutateAsync, invalidateByPrefix, toastSuccess } = vi.hoisted(
  () => ({
    displayConfirm: vi.fn(),
    setLoading: vi.fn(),
    mutateAsync: vi.fn(),
    invalidateByPrefix: vi.fn(),
    toastSuccess: vi.fn(),
  })
)

vi.mock('@/hooks/useDialog.ts', () => ({
  useDialog: () => ({ displayConfirm, setLoading }),
}))

vi.mock('@/hooks/useApiQuery.ts', () => ({
  useInvalidateQueries: () => ({ invalidateByPrefix }),
}))

vi.mock('@/services/toast-service.tsx', () => ({
  default: { success: toastSuccess, error: vi.fn() },
}))

vi.mock('@/features/accounting/collaborators/services/collaborator-service.ts', () => ({
  useDeleteCollaborator: () => ({ mutateAsync, isPending: false }),
}))

const collaborator = { id: 143, name: 'CTV UAT TC-01' } as any

describe('useCollaboratorDelete', () => {
  beforeEach(() => {
    displayConfirm.mockClear()
    setLoading.mockClear()
    mutateAsync.mockClear()
    invalidateByPrefix.mockClear()
    toastSuccess.mockClear()
  })

  it('mở dialog xác nhận với tên CTV cần xóa', () => {
    const { result } = renderHook(() => useCollaboratorDelete())

    act(() => {
      result.current.openDeleteDialog(collaborator)
    })

    expect(displayConfirm).toHaveBeenCalledTimes(1)
    expect(displayConfirm.mock.calls[0][0]).toMatchObject({
      title: 'Xóa cộng tác viên',
      confirmText: 'Xóa',
    })
  })

  it('xóa thành công thì gọi API đúng id, làm mới danh sách và báo toast', async () => {
    mutateAsync.mockResolvedValueOnce(undefined)
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useCollaboratorDelete(onSuccess))

    act(() => {
      result.current.openDeleteDialog(collaborator)
    })

    const { onConfirm } = displayConfirm.mock.calls[0][0]
    await act(async () => {
      await onConfirm()
    })

    expect(mutateAsync).toHaveBeenCalledWith(143)
    expect(invalidateByPrefix).toHaveBeenCalledWith('sales/collaborators')
    expect(toastSuccess).toHaveBeenCalledWith('Xóa cộng tác viên thành công')
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('xóa thất bại (vd bị chặn PROTECT) thì không báo thành công và không gọi onSuccess', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('conflict'))
    const onSuccess = vi.fn()
    const { result } = renderHook(() => useCollaboratorDelete(onSuccess))

    act(() => {
      result.current.openDeleteDialog(collaborator)
    })

    const { onConfirm } = displayConfirm.mock.calls[0][0]
    await act(async () => {
      await onConfirm()
    })

    expect(toastSuccess).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(setLoading).toHaveBeenCalledWith(false)
  })
})
