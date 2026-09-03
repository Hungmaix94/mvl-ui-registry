export type MemberRole = 'owner' | 'admin' | 'member'

export interface ChatMembership {
  user_id: number
  channel_id: string
  role: MemberRole
  is_muted: boolean
  notify_new_messages: boolean // US-222 (CR 86eygp5xz) — opt-in nhận thông báo tin nhắn thường
  last_read_message_id: string | null
  joined_at: string // ISO 8601 UTC
}

export type MuteDuration = '5_minutes' | '1_hour' | '1_day' | 'permanent'

export interface ChannelMute {
  channel_id: string
  user_id: number
  muted_until: string | null // null = permanent
  created_at: string
}

export interface Mention {
  type: 'user' | 'all'
  user_id?: number
}

export interface Attachment {
  file_id: number
  file_type?: 'image' | 'document' | 'audio' | 'video'
}

export interface FileMetadata {
  id: number
  view_url: string
  download_url: string
  mime_type: string | null
  size_bytes: number
  original_name: string
  is_deleted: boolean
  file_name?: string
  size?: number
  signed_url?: string
}

export interface LibraryItemRef {
  item_id: number
  node_type: 'file' | 'folder'
  name: string
  visibility: 'private' | 'department' | 'company' | 'public'
  file?: {
    file_id: number
    file_name: string
    mime_type: string
    size_bytes: number
    extension: string
  }
  owner: {
    user_id: number
    display_name: string
  }
  category?: { id: number; name: string }
  path?: string
}

export interface MessageMetadata {
  mentions?: Mention[]
  attachments?: Attachment[]
  library_items?: LibraryItemRef[]
}

export interface Message {
  id: string
  channel_id: string
  user_id: number | null
  content: string
  created_at: string
  revoked_at: string | null
  revoked_by_user_id: number | null // null = self-revoke; != user_id = admin-revoke
  client_message_id?: string | null
  metadata?: MessageMetadata | null
  reactions_count?: Record<string, number>
  viewer_reaction?: string | null
}

export interface Channel {
  id: string
  type: 'system' | 'group'
  name: string
  description: string | null
  org_unit_type: 'branch' | 'organization' | null
  org_unit_id: number | null
  owner_id: number | null
  is_active: boolean
  write_policy: 'all_members' | 'admins_only' | 'readonly'
  last_message_at: string | null
  created_at: string
  disabled_at: string | null
  state: 'active' | 'locked' | 'disabled' | 'deleted'
}
