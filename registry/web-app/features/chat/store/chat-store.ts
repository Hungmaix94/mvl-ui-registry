import { create } from 'zustand'
import { ChatMembership, MemberRole, Message, Channel, FileMetadata } from '../types/channel'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface UserProfile {
  user_id: number
  display_name: string
  avatar_url?: string
  fullname?: string
  username?: string
}

interface ChatStore {
  connectionStatus: ConnectionStatus
  currentUserId: number | null
  activeChannelId: string | null
  channels: Record<string, Channel>
  members: Record<string, ChatMembership[]> // key = channel_id
  messages: Record<string, Message[]> // key = channel_id
  userProfiles: Record<number, UserProfile>
  attachmentsMetadata: Record<number, FileMetadata>
  unreadCounts: Record<string, number>
  pinnedMessages: Record<string, Message[]> // key = channel_id

  // general actions
  setConnectionStatus: (status: ConnectionStatus) => void
  setCurrentUserId: (id: number | null) => void
  pinMessage: (channelId: string, message: Message) => void
  unpinMessage: (channelId: string, messageId: string) => void
  setActiveChannelId: (id: string | null) => void

  // channel actions
  setChannels: (channels: Channel[]) => void
  addChannel: (channel: Channel) => void
  removeChannel: (channelId: string) => void
  updateChannelState: (
    channelId: string,
    state: 'active' | 'locked' | 'disabled' | 'deleted'
  ) => void
  updateChannelWritePolicy: (
    channelId: string,
    policy: 'all_members' | 'admins_only' | 'readonly'
  ) => void

  // member actions
  setMembers: (channelId: string, members: ChatMembership[]) => void
  addMember: (channelId: string, member: ChatMembership) => void
  removeMember: (channelId: string, userId: number) => void
  updateMemberRole: (channelId: string, userId: number, newRole: MemberRole) => void
  updateMemberMuteStatus: (channelId: string, userId: number, isMuted: boolean) => void
  updateMemberNotifyPreference: (channelId: string, userId: number, notify: boolean) => void

  // message actions
  setMessages: (channelId: string, messages: Message[]) => void
  addMessage: (channelId: string, message: Message) => void
  updateMessageRevokedStatus: (
    channelId: string,
    messageId: string,
    revokedAt: string,
    revokedByUserId: number | null
  ) => void
  addMessageReaction: (
    channelId: string,
    messageId: string,
    userId: number,
    type: string,
    reactionsCount: Record<string, number>
  ) => void
  removeMessageReaction: (
    channelId: string,
    messageId: string,
    userId: number,
    type: string,
    reactionsCount: Record<string, number>
  ) => void
  updateReadReceipt: (channelId: string, userId: number, lastReadMessageId: string | null) => void

  // user profile actions
  cacheUserProfile: (userId: number, profile: UserProfile) => void
  cacheUserProfiles: (profiles: UserProfile[]) => void

  // file metadata actions
  cacheAttachmentMetadata: (fileId: number, metadata: FileMetadata) => void
  cacheAttachmentMetadatas: (metadatas: FileMetadata[]) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  connectionStatus: 'connecting',
  currentUserId: null,
  activeChannelId: null,
  channels: {},
  members: {},
  messages: {},
  userProfiles: {},
  attachmentsMetadata: {},
  unreadCounts: {},
  pinnedMessages: {},

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setCurrentUserId: (id) => set({ currentUserId: id }),

  pinMessage: (channelId, message) =>
    set((state) => {
      const channelPinned = state.pinnedMessages[channelId] || []
      if (channelPinned.some((m) => m.id === message.id)) {
        return {}
      }
      const nextPinned = [...channelPinned, message]
      localStorage.setItem(`mvl_chat_pinned_${channelId}`, JSON.stringify(nextPinned))
      return {
        pinnedMessages: { ...state.pinnedMessages, [channelId]: nextPinned },
      }
    }),

  unpinMessage: (channelId, messageId) =>
    set((state) => {
      const channelPinned = state.pinnedMessages[channelId] || []
      const nextPinned = channelPinned.filter((m) => m.id !== messageId)
      localStorage.setItem(`mvl_chat_pinned_${channelId}`, JSON.stringify(nextPinned))
      return {
        pinnedMessages: { ...state.pinnedMessages, [channelId]: nextPinned },
      }
    }),

  setActiveChannelId: (id) =>
    set((state) => {
      // Clear unread count for this channel when opened
      const nextUnread = { ...state.unreadCounts }
      if (id) {
        nextUnread[id] = 0
      }
      const pinned = id ? JSON.parse(localStorage.getItem(`mvl_chat_pinned_${id}`) || '[]') : []
      return {
        activeChannelId: id,
        unreadCounts: nextUnread,
        pinnedMessages: id ? { ...state.pinnedMessages, [id]: pinned } : state.pinnedMessages,
      }
    }),

  setChannels: (channelsList) =>
    set(() => {
      const channelsMap: Record<string, Channel> = {}
      channelsList.forEach((c) => {
        channelsMap[String(c.id)] = c
      })
      return { channels: channelsMap }
    }),

  addChannel: (channel) =>
    set((state) => ({
      channels: {
        ...state.channels,
        [String(channel.id)]: channel,
      },
    })),

  removeChannel: (channelId) =>
    set((state) => {
      const nextChannels = { ...state.channels }
      delete nextChannels[channelId]
      return { channels: nextChannels }
    }),

  updateChannelState: (channelId, channelState) =>
    set((state) => {
      const channel = state.channels[channelId]
      if (!channel) return {}
      return {
        channels: {
          ...state.channels,
          [channelId]: { ...channel, state: channelState },
        },
      }
    }),

  updateChannelWritePolicy: (channelId, policy) =>
    set((state) => {
      const channel = state.channels[channelId]
      if (!channel) return {}
      return {
        channels: {
          ...state.channels,
          [channelId]: { ...channel, write_policy: policy },
        },
      }
    }),

  setMembers: (channelId, membersList) =>
    set((state) => ({
      members: {
        ...state.members,
        [channelId]: membersList,
      },
    })),

  addMember: (channelId, member) =>
    set((state) => {
      const existing = state.members[channelId] || []
      const memberId = Number(member.user_id)
      if (existing.some((m) => Number(m.user_id) === memberId)) return {}
      return {
        members: {
          ...state.members,
          [channelId]: [...existing, { ...member, user_id: memberId }],
        },
      }
    }),

  removeMember: (channelId, userId) =>
    set((state) => {
      const targetId = Number(userId)
      return {
        members: {
          ...state.members,
          [channelId]: (state.members[channelId] || []).filter(
            (m) => Number(m.user_id) !== targetId
          ),
        },
      }
    }),

  updateMemberRole: (channelId, userId, newRole) =>
    set((state) => {
      const targetId = Number(userId)
      return {
        members: {
          ...state.members,
          [channelId]: (state.members[channelId] || []).map((m) =>
            Number(m.user_id) === targetId ? { ...m, role: newRole } : m
          ),
        },
      }
    }),

  updateMemberMuteStatus: (channelId, userId, isMuted) =>
    set((state) => {
      const targetId = Number(userId)
      return {
        members: {
          ...state.members,
          [channelId]: (state.members[channelId] || []).map((m) =>
            Number(m.user_id) === targetId ? { ...m, is_muted: isMuted } : m
          ),
        },
      }
    }),

  updateMemberNotifyPreference: (channelId, userId, notify) =>
    set((state) => {
      const targetId = Number(userId)
      return {
        members: {
          ...state.members,
          [channelId]: (state.members[channelId] || []).map((m) =>
            Number(m.user_id) === targetId ? { ...m, notify_new_messages: notify } : m
          ),
        },
      }
    }),

  setMessages: (channelId, messagesList) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: messagesList,
      },
    })),

  addMessage: (channelId, message) =>
    set((state) => {
      const existing = state.messages[channelId] || []
      // Deduplicate by message ID or client_message_id
      if (
        existing.some(
          (m) =>
            m.id === message.id ||
            (message.client_message_id && m.client_message_id === message.client_message_id)
        )
      ) {
        return {}
      }

      const nextUnread = { ...state.unreadCounts }
      if (state.activeChannelId !== channelId && message.user_id !== state.currentUserId) {
        nextUnread[channelId] = (nextUnread[channelId] || 0) + 1
      }

      return {
        messages: {
          ...state.messages,
          [channelId]: [...existing, message],
        },
        unreadCounts: nextUnread,
      }
    }),

  updateMessageRevokedStatus: (channelId, messageId, revokedAt, revokedByUserId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] || []).map((msg) =>
          msg.id === messageId
            ? { ...msg, revoked_at: revokedAt, revoked_by_user_id: revokedByUserId }
            : msg
        ),
      },
    })),

  addMessageReaction: (channelId, messageId, userId, type, reactionsCount) =>
    set((state) => {
      const updatedMessages = (state.messages[channelId] || []).map((msg) => {
        if (msg.id !== messageId) return msg

        // Update counts and viewer reaction if applicable
        const isViewer = userId === state.currentUserId
        return {
          ...msg,
          reactions_count: reactionsCount,
          viewer_reaction: isViewer ? type : msg.viewer_reaction,
        }
      })

      return {
        messages: {
          ...state.messages,
          [channelId]: updatedMessages,
        },
      }
    }),

  removeMessageReaction: (channelId, messageId, userId, _type, reactionsCount) =>
    set((state) => {
      const updatedMessages = (state.messages[channelId] || []).map((msg) => {
        if (msg.id !== messageId) return msg

        const isViewer = userId === state.currentUserId
        return {
          ...msg,
          reactions_count: reactionsCount,
          viewer_reaction: isViewer ? null : msg.viewer_reaction,
        }
      })

      return {
        messages: {
          ...state.messages,
          [channelId]: updatedMessages,
        },
      }
    }),

  updateReadReceipt: (channelId, userId, lastReadMessageId) =>
    set((state) => {
      const updatedMembers = (state.members[channelId] || []).map((m) =>
        m.user_id === userId ? { ...m, last_read_message_id: lastReadMessageId } : m
      )
      return {
        members: {
          ...state.members,
          [channelId]: updatedMembers,
        },
      }
    }),

  cacheUserProfile: (userId, profile) =>
    set((state) => {
      const uId = Number(userId)
      const normalizedProfile = {
        ...profile,
        user_id: uId,
        display_name:
          profile.display_name || profile.fullname || profile.username || `User #${uId}`,
      }
      return {
        userProfiles: {
          ...state.userProfiles,
          [uId]: normalizedProfile,
        },
      }
    }),

  cacheUserProfiles: (profiles) =>
    set((state) => {
      const nextProfiles = { ...state.userProfiles }
      profiles.forEach((p) => {
        const uId = Number(p.user_id)
        nextProfiles[uId] = {
          ...p,
          user_id: uId,
          display_name: p.display_name || p.fullname || p.username || `User #${uId}`,
        }
      })
      return { userProfiles: nextProfiles }
    }),

  cacheAttachmentMetadata: (fileId, metadata) =>
    set((state) => ({
      attachmentsMetadata: {
        ...state.attachmentsMetadata,
        [fileId]: metadata,
      },
    })),

  cacheAttachmentMetadatas: (metadatas) =>
    set((state) => {
      const nextMeta = { ...state.attachmentsMetadata }
      metadatas.forEach((m) => {
        nextMeta[m.id] = m
      })
      return { attachmentsMetadata: nextMeta }
    }),
}))
