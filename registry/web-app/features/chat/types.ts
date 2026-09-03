export enum WritePolicy {
  ALL_MEMBERS = 'all_members',
  ADMINS_ONLY = 'admins_only',
  READONLY = 'readonly',
}

export enum ChannelState {
  ACTIVE = 'active',
  LOCKED = 'locked',
  DISABLED = 'disabled',
  DELETED = 'deleted',
}

// Employee as embedded by the backend on a channel's `owner` / `admins`.
// Mirrors the ERP EmployeeDropdown shape plus the injected `user_id`
// (the ERP user id needed to add/remove channel admins).
export interface ChannelEmployee {
  user_id: number
  id: number
  code: string
  fullname: string
  avatar?: { view_url?: string | null } | null
}

// System channels are auto-created per org unit (e.g. one per branch); the chat
// service forbids renaming them. `group` channels are user-created and fully editable.
export type ChannelType = 'system' | 'group'

export interface GroupChannel {
  id: string
  name: string
  description: string
  // `system` (auto-created per org unit, name is locked) or `group` (user-created).
  type?: ChannelType
  // Raw owner/admin user ids (used by the admin add/remove flow).
  owner_user_id: number
  admin_user_ids?: number[]
  // Resolved employees embedded by the backend for display.
  owner?: ChannelEmployee | null
  admins?: ChannelEmployee[]
  write_policy: WritePolicy
  state: ChannelState
  created_at?: string
  updated_at?: string
  // For UI list members
  members_count?: number
}

export interface GroupChannelCreatePayload {
  name: string
  description?: string
  owner_user_id: number
  initial_member_ids: number[]
}

export interface GroupChannelUpdatePayload {
  name?: string
  description?: string
  write_policy?: WritePolicy
}
