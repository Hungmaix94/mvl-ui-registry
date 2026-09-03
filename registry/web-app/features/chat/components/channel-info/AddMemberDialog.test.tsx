import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const MOCK_USERS = [
  { user_id: 2, display_name: 'Alice' },
  { user_id: 3, display_name: 'Bob' },
  { user_id: 4, display_name: 'Carol' },
]

// Return a fixed user list regardless of the search query.
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: { users: MOCK_USERS }, isFetching: false }),
}))
vi.mock('usehooks-ts', () => ({ useDebounceValue: (v: string) => [v] }))
vi.mock('@/components/ui/avatar/Avatar', () => ({ default: () => <div data-testid="avatar" /> }))
vi.mock('@/config/environment', () => ({ getChatApiBaseUrl: () => '' }))
vi.mock('@/utils/auth', () => ({ getStoredToken: () => '' }))

// Reduce AppDialog to just the pieces the component drives.
vi.mock('@/components/dialog/AppDialog', () => ({
  default: ({ content, onConfirm, onCancel, disableConfirm, confirmText }: any) => (
    <div>
      <div data-testid="content">{content}</div>
      <button data-testid="confirm" disabled={disableConfirm} onClick={onConfirm}>
        {confirmText}
      </button>
      <button data-testid="cancel" onClick={onCancel}>
        cancel
      </button>
    </div>
  ),
}))

import { AddMemberDialog, normalizeChatUsers } from './AddMemberDialog'

describe('AddMemberDialog (multi-select)', () => {
  beforeEach(() => vi.clearAllMocks())

  const setup = (existingUserIds: number[] = []) => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(
      <AddMemberDialog
        open
        onClose={onClose}
        onConfirm={onConfirm}
        existingUserIds={existingUserIds}
      />
    )
    return { onConfirm, onClose }
  }

  it('excludes existing members from the suggestion list', () => {
    setup([4]) // Carol already a member
    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByText('Bob')).toBeTruthy()
    expect(screen.queryByText('Carol')).toBeNull()
  })

  it('disables confirm until at least one user is selected', () => {
    setup()
    const confirm = screen.getByTestId('confirm') as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    fireEvent.click(screen.getByText('Alice'))
    expect(confirm.disabled).toBe(false)
  })

  it('selects multiple users and confirms with all their ids', () => {
    const { onConfirm } = setup()
    fireEvent.click(screen.getByText('Alice'))
    fireEvent.click(screen.getByText('Bob'))
    // Confirm label reflects the count.
    expect(screen.getByTestId('confirm').textContent).toContain('2')
    fireEvent.click(screen.getByTestId('confirm'))
    expect(onConfirm).toHaveBeenCalledWith([2, 3])
  })

  it('removes a user from the pending list via its (x) button', () => {
    const { onConfirm } = setup()
    fireEvent.click(screen.getByText('Alice'))
    // One chip with a remove button now exists.
    fireEvent.click(screen.getByTitle('Bỏ khỏi danh sách'))
    const confirm = screen.getByTestId('confirm') as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    fireEvent.click(confirm)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('toggles a user off when clicked again in the list', () => {
    const { onConfirm } = setup()
    fireEvent.click(screen.getByText('Bob')) // select (unique before selection)
    // Now "Bob" appears twice: the pending chip and the list row.
    const bobEls = screen.getAllByText('Bob')
    fireEvent.click(bobEls[bobEls.length - 1]) // click the list row → toggle off
    const confirm = screen.getByTestId('confirm') as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

// Regression cho bug 86eybb5zn: search API trả field `id`, không phải `user_id`.
// Nếu không chuẩn hoá → mọi user_id = undefined → chọn 1 người thì cả danh sách bị
// coi là đã chọn và click xoá sạch. normalizeChatUsers phải map id → user_id.
describe('normalizeChatUsers', () => {
  it('maps the API `id` field to `user_id` with distinct, defined ids', () => {
    const raw = {
      users: [
        { id: 2, display_name: 'Alice' },
        { id: 3, display_name: 'Bob' },
        { id: 4, display_name: 'Carol' },
      ],
    }
    const out = normalizeChatUsers(raw)
    expect(out.map((u) => u.user_id)).toEqual([2, 3, 4])
    expect(out.every((u) => typeof u.user_id === 'number')).toBe(true)
    // Không phần tử nào undefined → không còn hiện tượng "tất cả đều được chọn".
    expect(new Set(out.map((u) => u.user_id)).size).toBe(3)
  })

  it('prefers an explicit user_id when the API already provides one', () => {
    const out = normalizeChatUsers({ users: [{ user_id: 9, id: 999, display_name: 'X' }] })
    expect(out[0].user_id).toBe(9)
  })

  it('carries avatar fields and tolerates empty / malformed payloads', () => {
    const out = normalizeChatUsers({
      users: [{ id: 5, display_name: 'Y', avatar_url: 'u', avatar_file_id: 7 }],
    })
    expect(out[0]).toMatchObject({ user_id: 5, avatar_url: 'u', avatar_file_id: 7 })
    expect(normalizeChatUsers({})).toEqual([])
    expect(normalizeChatUsers(null)).toEqual([])
    expect(normalizeChatUsers({ users: 'nope' })).toEqual([])
  })
})
