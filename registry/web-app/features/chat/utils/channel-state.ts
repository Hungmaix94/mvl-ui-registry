import { ChannelState, GroupChannel, GroupChannelUpdatePayload, WritePolicy } from '../types'
import { ColoredValueVariant } from '@/api/schema'

// A system channel is auto-created per org unit; the chat service rejects any
// attempt to change its name ("Không thể đổi tên channel hệ thống"), so the UI
// locks the name field for these channels.
export function isSystemChannel(channel: Pick<GroupChannel, 'type'>): boolean {
  return channel.type === 'system'
}

// Build a PATCH payload containing only the fields that actually changed. The
// update endpoint rejects a name change on system channels, so sending an
// unchanged `name` (the name input is disabled but still holds its value) would
// fail — diffing keeps unchanged fields out of the request entirely.
export function getChangedChannelFields(
  channel: Pick<GroupChannel, 'name' | 'write_policy'> & { description?: string },
  data: { name: string; description?: string; write_policy: string }
): GroupChannelUpdatePayload {
  const payload: GroupChannelUpdatePayload = {}
  if (data.name !== channel.name) {
    payload.name = data.name
  }
  if ((data.description ?? '') !== (channel.description ?? '')) {
    payload.description = data.description ?? ''
  }
  if (data.write_policy !== channel.write_policy) {
    payload.write_policy = data.write_policy as WritePolicy
  }
  return payload
}

export function getChannelStateVariant(state: ChannelState | string): ColoredValueVariant {
  switch (state) {
    case ChannelState.ACTIVE:
      return ColoredValueVariant.GREEN
    case ChannelState.LOCKED:
      return ColoredValueVariant.ORANGE
    case ChannelState.DISABLED:
      return ColoredValueVariant.RED
    case ChannelState.DELETED:
      return ColoredValueVariant.GREY
    default:
      return ColoredValueVariant.GREY
  }
}
