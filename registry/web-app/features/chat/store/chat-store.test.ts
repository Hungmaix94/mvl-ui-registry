import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from './chat-store'
import type { ChatMembership } from '../types/channel'

const CHANNEL_ID = 'chan-1'

const makeMembership = (overrides: Partial<ChatMembership> = {}): ChatMembership => ({
  user_id: 1,
  channel_id: CHANNEL_ID,
  role: 'member',
  is_muted: false,
  notify_new_messages: false,
  last_read_message_id: null,
  joined_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('chat-store — updateMemberNotifyPreference', () => {
  beforeEach(() => {
    useChatStore.setState({ members: { [CHANNEL_ID]: [makeMembership()] } })
  })

  it('flips notify_new_messages for the targeted member only', () => {
    useChatStore.setState({
      members: {
        [CHANNEL_ID]: [makeMembership({ user_id: 1 }), makeMembership({ user_id: 2 })],
      },
    })

    useChatStore.getState().updateMemberNotifyPreference(CHANNEL_ID, 1, true)

    const members = useChatStore.getState().members[CHANNEL_ID]
    expect(members.find((m) => m.user_id === 1)?.notify_new_messages).toBe(true)
    expect(members.find((m) => m.user_id === 2)?.notify_new_messages).toBe(false)
  })

  it('leaves is_muted untouched — the two preferences are independent', () => {
    useChatStore.setState({
      members: { [CHANNEL_ID]: [makeMembership({ user_id: 1, is_muted: true })] },
    })

    useChatStore.getState().updateMemberNotifyPreference(CHANNEL_ID, 1, true)

    const member = useChatStore.getState().members[CHANNEL_ID][0]
    expect(member.notify_new_messages).toBe(true)
    expect(member.is_muted).toBe(true)
  })

  it('is a no-op when the channel has no members loaded', () => {
    useChatStore.getState().updateMemberNotifyPreference('missing-channel', 1, true)
    expect(useChatStore.getState().members['missing-channel']).toEqual([])
  })
})
