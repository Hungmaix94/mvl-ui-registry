import { describe, it, expect } from 'vitest'
import { getMemberPermissions, type MemberPermissionInput } from '../../utils/member-permissions'
import type { ChatMembership, MemberRole } from '../../types/channel'

// Người thao tác (viewer) luôn có user_id = 1; các member đích dùng id khác để không tự-thao-tác.
const VIEWER_ID = 1

const makeMember = (
  role: MemberRole,
  overrides: Partial<Pick<ChatMembership, 'user_id' | 'is_muted'>> = {}
): Pick<ChatMembership, 'user_id' | 'role' | 'is_muted'> => ({
  user_id: 2,
  role,
  is_muted: false,
  ...overrides,
})

const perms = (
  input: Partial<MemberPermissionInput> & { member: MemberPermissionInput['member'] }
) =>
  getMemberPermissions({
    currentUserRole: 'member',
    isChatAdmin: false,
    channelType: 'group',
    currentUserId: VIEWER_ID,
    ...input,
  })

describe('getMemberPermissions', () => {
  describe('owner viewer', () => {
    it('có toàn quyền trên một member (xoá, phong admin, mute)', () => {
      const p = perms({ currentUserRole: 'owner', member: makeMember('member') })
      expect(p).toEqual({
        canRemove: true,
        canPromote: true,
        canDemote: false,
        canMute: true,
        canUnmute: false,
      })
    })

    it('có thể xoá và tước quyền một admin, nhưng không mute admin', () => {
      const p = perms({ currentUserRole: 'owner', member: makeMember('admin') })
      expect(p).toEqual({
        canRemove: true,
        canPromote: false,
        canDemote: true,
        canMute: false,
        canUnmute: false,
      })
    })

    it('unmute khi member đang bị mute', () => {
      const p = perms({
        currentUserRole: 'owner',
        member: makeMember('member', { is_muted: true }),
      })
      expect(p.canUnmute).toBe(true)
      expect(p.canMute).toBe(false)
    })
  })

  describe('admin viewer', () => {
    it('xoá/mute member nhưng KHÔNG promote/demote', () => {
      const p = perms({ currentUserRole: 'admin', member: makeMember('member') })
      expect(p).toEqual({
        canRemove: true,
        canPromote: false,
        canDemote: false,
        canMute: true,
        canUnmute: false,
      })
    })

    it('không có quyền gì trên một admin khác (chỉ owner mới xử lý admin)', () => {
      const p = perms({ currentUserRole: 'admin', member: makeMember('admin') })
      expect(p).toEqual({
        canRemove: false,
        canPromote: false,
        canDemote: false,
        canMute: false,
        canUnmute: false,
      })
    })
  })

  describe('member viewer', () => {
    it('không có bất kỳ quyền quản trị nào', () => {
      const p = perms({ currentUserRole: 'member', member: makeMember('member') })
      expect(p).toEqual({
        canRemove: false,
        canPromote: false,
        canDemote: false,
        canMute: false,
        canUnmute: false,
      })
    })
  })

  describe('chat-admin (ability workspace:chat, không phải member kênh)', () => {
    it('ứng xử như admin trên một member (xoá/mute, không promote/demote)', () => {
      const p = perms({
        currentUserRole: 'member',
        isChatAdmin: true,
        member: makeMember('member'),
      })
      expect(p).toEqual({
        canRemove: true,
        canPromote: false,
        canDemote: false,
        canMute: true,
        canUnmute: false,
      })
    })

    it('unmute member đang bị mute (như admin)', () => {
      const p = perms({
        currentUserRole: 'member',
        isChatAdmin: true,
        member: makeMember('member', { is_muted: true }),
      })
      expect(p.canUnmute).toBe(true)
    })

    it('không xử lý được admin khác (như admin)', () => {
      const p = perms({
        currentUserRole: 'member',
        isChatAdmin: true,
        member: makeMember('admin'),
      })
      expect(p).toEqual({
        canRemove: false,
        canPromote: false,
        canDemote: false,
        canMute: false,
        canUnmute: false,
      })
    })

    it('nếu bản thân là owner thì giữ nguyên quyền owner (promote/demote)', () => {
      const p = perms({
        currentUserRole: 'owner',
        isChatAdmin: true,
        member: makeMember('member'),
      })
      expect(p.canPromote).toBe(true)
    })
  })

  describe('ràng buộc chung', () => {
    it('không cho thao tác lên chính mình dù là owner', () => {
      const p = perms({
        currentUserRole: 'owner',
        member: makeMember('member', { user_id: VIEWER_ID }),
      })
      expect(p).toEqual({
        canRemove: false,
        canPromote: false,
        canDemote: false,
        canMute: false,
        canUnmute: false,
      })
    })

    it('không có quyền quản trị trong kênh system dù là owner', () => {
      const p = perms({
        currentUserRole: 'owner',
        channelType: 'system',
        member: makeMember('member'),
      })
      expect(p.canRemove).toBe(false)
      expect(p.canPromote).toBe(false)
    })
  })
})
