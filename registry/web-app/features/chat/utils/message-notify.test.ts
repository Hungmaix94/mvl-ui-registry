import { describe, it, expect } from 'vitest'
import { isMessageMentioningUser, shouldPlayMessageSound } from './message-notify'
import type { Message } from '../types/channel'

const CURRENT_USER_ID = 42

const makeMessage = (mentions?: Message['metadata']): Pick<Message, 'metadata'> => ({
  metadata: mentions,
})

describe('isMessageMentioningUser', () => {
  it('returns false when message has no mentions', () => {
    expect(isMessageMentioningUser(makeMessage(undefined), CURRENT_USER_ID)).toBe(false)
    expect(isMessageMentioningUser(makeMessage({ mentions: [] }), CURRENT_USER_ID)).toBe(false)
  })

  it('returns true when mentions include the current user directly', () => {
    const msg = makeMessage({ mentions: [{ type: 'user', user_id: CURRENT_USER_ID }] })
    expect(isMessageMentioningUser(msg, CURRENT_USER_ID)).toBe(true)
  })

  it('returns false when mentions target a different user', () => {
    const msg = makeMessage({ mentions: [{ type: 'user', user_id: 999 }] })
    expect(isMessageMentioningUser(msg, CURRENT_USER_ID)).toBe(false)
  })

  it('returns true for @all mentions regardless of target user', () => {
    const msg = makeMessage({ mentions: [{ type: 'all' }] })
    expect(isMessageMentioningUser(msg, CURRENT_USER_ID)).toBe(true)
  })
})

describe('shouldPlayMessageSound', () => {
  it('plays for a direct mention even without opt-in membership', () => {
    const msg = makeMessage({ mentions: [{ type: 'user', user_id: CURRENT_USER_ID }] })
    expect(shouldPlayMessageSound(msg, CURRENT_USER_ID, undefined)).toBe(true)
  })

  it('does not play a plain message when membership is unknown', () => {
    const msg = makeMessage(undefined)
    expect(shouldPlayMessageSound(msg, CURRENT_USER_ID, undefined)).toBe(false)
  })

  it('does not play a plain message when not opted in', () => {
    const msg = makeMessage(undefined)
    expect(
      shouldPlayMessageSound(msg, CURRENT_USER_ID, {
        is_muted: false,
        notify_new_messages: false,
      })
    ).toBe(false)
  })

  it('plays a plain message when opted in and not muted', () => {
    const msg = makeMessage(undefined)
    expect(
      shouldPlayMessageSound(msg, CURRENT_USER_ID, {
        is_muted: false,
        notify_new_messages: true,
      })
    ).toBe(true)
  })

  it('is_muted overrides opt-in for plain messages', () => {
    const msg = makeMessage(undefined)
    expect(
      shouldPlayMessageSound(msg, CURRENT_USER_ID, {
        is_muted: true,
        notify_new_messages: true,
      })
    ).toBe(false)
  })

  it('is_muted overrides even a direct/@all mention (matches backend _should_skip)', () => {
    const msg = makeMessage({ mentions: [{ type: 'all' }] })
    expect(
      shouldPlayMessageSound(msg, CURRENT_USER_ID, {
        is_muted: true,
        notify_new_messages: false,
      })
    ).toBe(false)
  })
})
