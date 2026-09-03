import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useProjectDocumentsShareState } from './useProjectDocumentsShareState'
import { type components } from '@/api/schema'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import { ElibraryNodeType, ElibraryVisibility } from '@/constants/api-schema-aliases'

const currentUser = { id: 1 }

vi.mock('@/store/auth-store', () => ({
  useUserInfo: () => currentUser,
}))

vi.mock('@/hooks/useDialog', () => ({
  useDialog: () => ({ displayCustom: vi.fn(), setLoading: vi.fn() }),
}))

vi.mock('@/hooks/useAppConstant.ts', () => ({
  default: () => ({ keysMapOptions: new Map() }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

const toastError = vi.fn()
vi.mock('@/services/toast-service', () => ({
  default: {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

const writeText = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  writable: true,
  configurable: true,
})

function makeItem(id: number, name: string): RealestateLibraryFileRead {
  return {
    id,
    name,
    owner: currentUser.id,
    node_type: ElibraryNodeType.file,
    visibility: ElibraryVisibility.company,
  } as unknown as RealestateLibraryFileRead
}

function makeToken(token: string) {
  return { token } as unknown as components['schemas']['LibraryAccessTokenRead']
}

describe('useProjectDocumentsShareState — handleCopyLinks (copy link không kèm tên file)', () => {
  beforeEach(() => {
    writeText.mockClear()
    toastError.mockClear()
  })

  it('chỉ copy URL thuần vào clipboard, không kèm tên file (bug 86eyg05gu)', async () => {
    const items = [makeItem(1, 'test_sample'), makeItem(2, 'other_doc')]
    const openShareDialog = vi.fn()

    const { result } = renderHook(() =>
      useProjectDocumentsShareState({
        projectId: 1,
        items,
        selectedIds: [1, 2],
        selectedPrimaryItem: null,
        updateMutation: { mutateAsync: vi.fn() },
        shareMutation: { mutateAsync: vi.fn() },
        createShareLinkMutation: { mutateAsync: vi.fn() },
        openShareDialog,
        listInvalidateQueryKey: () => ['elibrary', 'list'],
      })
    )

    act(() => {
      result.current.handleOpenShare()
    })

    const { onCopyLinks } = openShareDialog.mock.calls[0][0]

    await act(async () => {
      await onCopyLinks({
        itemIds: [1, 2],
        existingLinksByItemId: new Map([
          [1, makeToken('tok-1')],
          [2, makeToken('tok-2')],
        ]),
      })
    })

    expect(writeText).toHaveBeenCalledTimes(1)
    const copiedText = writeText.mock.calls[0][0] as string

    expect(copiedText).not.toContain('test_sample')
    expect(copiedText).not.toContain('other_doc')
    expect(copiedText.split('\n')).toEqual([
      `${window.location.origin}/docs/tok-1/`,
      `${window.location.origin}/docs/tok-2/`,
    ])
  })
})
