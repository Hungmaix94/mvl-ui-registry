import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useChatStore } from '../store/chat-store'
import { Search, Building, Users, Settings, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAbility } from '@/lib/ability'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useCreateGroupChannelDialog } from '../hooks/useCreateGroupChannelDialog'
import { chatWsService } from '../services/chat-ws-service'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { APP_PATH } from '@/routes'
import { removeVietnameseDiacritics } from '@/utils/string-utils'

export const ChatSidebar: React.FC = () => {
  const navigate = useNavigate()
  const ability = useAbility()
  const channelsMap = useChatStore((state) => state.channels)
  const activeChannelId = useChatStore((state) => state.activeChannelId)
  const setActiveChannelId = useChatStore((state) => state.setActiveChannelId)
  const messagesMap = useChatStore((state) => state.messages)
  const unreadCounts = useChatStore((state) => state.unreadCounts)
  const userProfiles = useChatStore((state) => state.userProfiles)

  const [searchQuery, setSearchQuery] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Convert map to array and sort by last message time
  const channelsList = useMemo(() => {
    const list = Object.values(channelsMap)
    return list.sort((a, b) => {
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      return bTime - aTime
    })
  }, [channelsMap])

  // Filter channels by name (trim + case-insensitive + accent-insensitive)
  const filteredChannels = useMemo(() => {
    const query = removeVietnameseDiacritics(searchQuery.trim().toLowerCase())
    if (!query) return channelsList
    return channelsList.filter((c) =>
      removeVietnameseDiacritics(c.name.toLowerCase()).includes(query)
    )
  }, [channelsList, searchQuery])

  const handleChannelSelect = (id: string) => {
    setActiveChannelId(id)
    navigate(`/chat/${id}`)
  }

  const formatLastMessageTime = (isoString?: string | null) => {
    if (!isoString) return ''
    try {
      const date = parseISO(isoString)
      return formatDistanceToNow(date, { addSuffix: false, locale: vi })
    } catch (e) {
      return ''
    }
  }

  const getLastMessageSnippet = (channelId: string) => {
    const channelMsgs = messagesMap[channelId] || []
    if (channelMsgs.length === 0) return 'Chưa có tin nhắn nào'
    const lastMsg = channelMsgs[channelMsgs.length - 1]
    if (lastMsg.revoked_at) {
      return 'Tin nhắn đã bị thu hồi'
    }

    let content = lastMsg.content || ''
    if (content) {
      // Replace specials
      content = content
        .replace(/<(?:@|!)all>/g, '@Tất cả')
        .replace(/<(?:@|!)admin>/g, '@admin')
        .replace(/<(?:@|!)here>/g, '@here')

      // Replace numeric user IDs
      const regex = /<(?:@|!)(\d+)>/g
      let match
      while ((match = regex.exec(content)) !== null) {
        const userId = parseInt(match[1])
        const mentionProfile = userProfiles[userId]
        const name = mentionProfile?.display_name || (userId === 1 ? 'admin' : `User #${userId}`)
        content = content.replace(match[0], `@${name}`)
      }
    }

    return content || 'Đã gửi một tệp đính kèm'
  }

  const fetchedChannelsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    channelsList.forEach((c) => {
      const channelId = String(c.id)
      if (c.last_message_at && !fetchedChannelsRef.current.has(channelId)) {
        fetchedChannelsRef.current.add(channelId)
        chatWsService
          .send('list_messages', {
            channel_id: channelId,
            limit: 1,
            ordering: 'desc',
          })
          .then((res) => {
            if (res && res.messages && res.messages.length > 0) {
              useChatStore.getState().setMessages(channelId, res.messages)
            }
          })
          .catch(console.error)
      }
    })
  }, [channelsList])

  const { openCreateDialog } = useCreateGroupChannelDialog()
  const hasAdminPermission = ability.can('workspace', 'chat')
  const hasCreatePermission = ability.can('create', 'chat_channel')

  return (
    <div className="border-border-1 bg-neutral-10 flex h-full w-[320px] flex-col border-r">
      <div className="bg-neutral-10 sticky top-0 z-10 flex flex-col">
        {/* Top Header */}
        <div className="border-border-1 flex h-16 items-center justify-between border-b px-4">
          <h2 className="typo-h6 text-content-dark-1 font-semibold">Trò chuyện</h2>
          <div className="flex items-center gap-1">
            {(hasCreatePermission || hasAdminPermission) && (
              <Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="text-content-dark-3 hover:bg-neutral-20 hover:text-content-dark-1 flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                    title="Cài đặt"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="border-border-1 w-56 rounded-xl border bg-white p-1 shadow-lg"
                  align="end"
                >
                  <div className="flex flex-col gap-0.5">
                    {hasCreatePermission && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false)
                          openCreateDialog()
                        }}
                        className="text-content-dark-2 hover:bg-neutral-10 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
                      >
                        <Plus className="text-content-dark-3 h-4 w-4" />
                        Tạo nhóm mới
                      </button>
                    )}
                    {hasAdminPermission && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false)
                          navigate(APP_PATH.CHAT_GROUP_CHANNELS)
                        }}
                        className="text-content-dark-2 hover:bg-neutral-10 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
                      >
                        <Settings className="text-content-dark-3 h-4 w-4" />
                        Quản lý Group Channel
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Search Box */}
        <div className="p-3">
          <div className="border-border-1 focus-within:border-action-primary-red-default relative flex items-center rounded-lg border bg-white">
            <Search className="text-content-dark-3 absolute left-3 h-4 w-4" />
            <input
              type="text"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="typo-body-sm-regular text-content-dark-1 w-full bg-transparent py-2 pr-3 pl-9 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {filteredChannels.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center p-4 text-center">
            <p className="typo-body-sm-regular text-content-dark-3">
              Không tìm thấy cuộc trò chuyện nào
            </p>
          </div>
        ) : (
          filteredChannels.map((c) => {
            const idStr = String(c.id)
            const isActive = activeChannelId === idStr
            const unreadCount = unreadCounts[idStr] || 0
            const lastMsgTime = formatLastMessageTime(c.last_message_at)
            const snippet = getLastMessageSnippet(idStr)

            return (
              <button
                key={c.id}
                onClick={() => handleChannelSelect(idStr)}
                className={`group mb-1 flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-action-primary-red-default/10 text-action-primary-red-default'
                    : 'hover:bg-neutral-20 text-content-dark-1'
                }`}
              >
                {/* Channel Icon */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    isActive
                      ? 'bg-action-primary-red-default text-white'
                      : 'bg-neutral-30 text-content-dark-2'
                  }`}
                >
                  {c.type === 'system' ? (
                    <Building className="h-5 w-5" />
                  ) : (
                    <Users className="h-5 w-5" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center justify-between gap-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="typo-body-base-semibold truncate font-semibold">
                        {c.name}
                      </span>
                      {c.state === 'disabled' && (
                        <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                          Tạm dừng
                        </span>
                      )}
                      {c.state === 'deleted' && (
                        <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800">
                          Đã xóa
                        </span>
                      )}
                      {hasAdminPermission && c.type === 'group' && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            navigate(`/chat/group-channels?search=${encodeURIComponent(c.name)}`)
                          }}
                          className="text-content-dark-3 hover:text-action-primary-red-default hover:bg-neutral-30 shrink-0 rounded p-0.5 opacity-0 transition-all group-hover:opacity-100 focus:opacity-100"
                          title="Quản lý chi tiết kênh"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {lastMsgTime && (
                      <span className="typo-body-xs-regular text-content-dark-3 whitespace-nowrap">
                        {lastMsgTime}
                      </span>
                    )}
                  </div>
                  <p className="typo-body-sm-regular text-content-dark-3 truncate">{snippet}</p>
                </div>

                {/* Unread count badge */}
                {unreadCount > 0 && (
                  <div className="bg-data-red-default typo-body-xs-semibold flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-white">
                    {unreadCount}
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
