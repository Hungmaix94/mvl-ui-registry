import { describe, it, expect, vi, beforeEach } from 'vitest'

const setMembers = vi.fn()
const cacheUserProfile = vi.fn()
const send = vi.fn()
const getUserProfiles = vi.fn().mockResolvedValue([])

vi.mock('../services/chat-ws-service', () => ({
  chatWsService: { send: (...args: any[]) => send(...args) },
}))
vi.mock('../services/chat-service', () => ({
  chatService: { getUserProfiles: (...args: any[]) => getUserProfiles(...args) },
}))
vi.mock('../store/chat-store', () => ({
  useChatStore: { getState: () => ({ setMembers, cacheUserProfile }) },
}))

import { loadChannelMembers } from './load-channel-members'

describe('loadChannelMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserProfiles.mockResolvedValue([])
  })

  it('loads members via WS list_members and maps role/joined_at', async () => {
    send.mockResolvedValue({
      members: [
        { user_id: 1, role: 'owner', joined_at: '2026-01-01T00:00:00Z' },
        { user_id: 2, role: 'member', joined_at: '2026-01-02T00:00:00Z' },
      ],
    })

    await loadChannelMembers('chan-1')

    expect(send).toHaveBeenCalledWith('list_members', { channel_id: 'chan-1' })
    const [channelId, mapped] = setMembers.mock.calls[0]
    expect(channelId).toBe('chan-1')
    expect(mapped).toHaveLength(2)
    expect(mapped[0]).toMatchObject({ user_id: 1, role: 'owner', channel_id: 'chan-1' })
    expect(mapped[1]).toMatchObject({ user_id: 2, role: 'member' })
  })

  it('skips setMembers when WS returns no member list', async () => {
    send.mockResolvedValue({})
    await loadChannelMembers('chan-2')
    expect(setMembers).not.toHaveBeenCalled()
  })

  it('swallows WS errors without throwing', async () => {
    send.mockRejectedValue(new Error('WebSocket request timeout'))
    await expect(loadChannelMembers('chan-3')).resolves.toBeUndefined()
    expect(setMembers).not.toHaveBeenCalled()
  })
})
