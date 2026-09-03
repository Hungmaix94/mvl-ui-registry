import { describe, expect, it } from 'vitest'

import { getChangedChannelFields, getChannelStateVariant, isSystemChannel } from './channel-state'
import { ChannelState, WritePolicy } from '../types'
import { ColoredValueVariant } from '@/api/schema'

describe('getChannelStateVariant', () => {
  it('maps each channel state to its chip variant', () => {
    expect(getChannelStateVariant(ChannelState.ACTIVE)).toBe(ColoredValueVariant.GREEN)
    expect(getChannelStateVariant(ChannelState.LOCKED)).toBe(ColoredValueVariant.ORANGE)
    expect(getChannelStateVariant(ChannelState.DISABLED)).toBe(ColoredValueVariant.RED)
    expect(getChannelStateVariant(ChannelState.DELETED)).toBe(ColoredValueVariant.GREY)
  })

  it('falls back to GREY for an unknown state', () => {
    expect(getChannelStateVariant('something-else')).toBe(ColoredValueVariant.GREY)
  })
})

describe('isSystemChannel', () => {
  it('is true only for the system type', () => {
    expect(isSystemChannel({ type: 'system' })).toBe(true)
    expect(isSystemChannel({ type: 'group' })).toBe(false)
    expect(isSystemChannel({})).toBe(false)
  })
})

describe('getChangedChannelFields', () => {
  const channel = {
    name: 'Quảng Ninh',
    description: 'mô tả cũ',
    write_policy: WritePolicy.ALL_MEMBERS,
  }

  it('returns only the fields that changed', () => {
    const payload = getChangedChannelFields(channel, {
      name: 'Quảng Ninh',
      description: 'mô tả cũ',
      write_policy: WritePolicy.ADMINS_ONLY,
    })
    expect(payload).toEqual({ write_policy: WritePolicy.ADMINS_ONLY })
  })

  it('omits an unchanged name so a system channel is not "renamed"', () => {
    const payload = getChangedChannelFields(channel, {
      name: 'Quảng Ninh',
      description: 'mô tả cũ',
      write_policy: WritePolicy.ALL_MEMBERS,
    })
    expect(payload).not.toHaveProperty('name')
    expect(payload).toEqual({})
  })

  it('treats a missing description as an empty string (no spurious change)', () => {
    const payload = getChangedChannelFields(
      { name: 'A', write_policy: WritePolicy.ALL_MEMBERS },
      { name: 'A', description: '', write_policy: WritePolicy.ALL_MEMBERS }
    )
    expect(payload).toEqual({})
  })

  it('includes name and description when they change', () => {
    const payload = getChangedChannelFields(channel, {
      name: 'Tên mới',
      description: 'mô tả mới',
      write_policy: WritePolicy.ALL_MEMBERS,
    })
    expect(payload).toEqual({ name: 'Tên mới', description: 'mô tả mới' })
  })
})
