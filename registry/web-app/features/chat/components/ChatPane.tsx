import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react'
import { useChatStore } from '../store/chat-store'
import { chatWsService } from '../services/chat-ws-service'
import { loadChannelMembers } from '../utils/load-channel-members'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { ArrowDown, Info, Loader2, Building, Users, Pin, Search, X } from 'lucide-react'
import AppDialog from '@/components/dialog/AppDialog'
import Avatar from '@/components/ui/avatar/Avatar'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import toastService from '@/services/toast-service'
import { removeVietnameseDiacritics } from '@/utils/string-utils'
import type { Message } from '../types/channel'

interface ChatPaneProps {
  channelId: string
  onToggleInfo: () => void
  isInfoOpen: boolean
  onShowUserProfile?: (userId: number) => void
}

export const ChatPane: React.FC<ChatPaneProps> = ({
  channelId,
  onToggleInfo,
  isInfoOpen,
  onShowUserProfile,
}) => {
  const currentUserId = useChatStore((state) => state.currentUserId) || 0
  const channels = useChatStore((state) => state.channels)
  const messagesMap = useChatStore((state) => state.messages)
  const membersMap = useChatStore((state) => state.members)
  const setMessages = useChatStore((state) => state.setMessages)

  const activeChannel = channels[channelId]
  const messages = messagesMap[channelId] || []
  const members = membersMap[channelId] || []

  const [loadingHistory, setLoadingHistory] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  // Scroll & Unread management
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [newMessagesCount, setNewMessagesCount] = useState(0)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isPrependingRef = useRef(false)
  const previousScrollHeightRef = useRef(0)
  const previousScrollTopRef = useRef(0)
  const activeChannelIdRef = useRef(channelId)

  // Find user membership to check role and mute status
  const currentUserMember = members.find((m) => m.user_id === currentUserId)
  const currentUserRole = currentUserMember?.role || 'member'
  const isMuted = currentUserMember?.is_muted || false

  const pinnedMessages = useChatStore((state) => state.pinnedMessages[channelId] || [])
  const unpinMessage = useChatStore((state) => state.unpinMessage)
  const userProfiles = useChatStore((state) => state.userProfiles)
  const [showPinnedListDialog, setShowPinnedListDialog] = useState(false)

  // In-channel message search (WS action `search_messages`)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [searching, setSearching] = useState(false)
  const [jumpingToMessage, setJumpingToMessage] = useState(false)

  const handleJumpToMessage = (messageId: string) => {
    const el = document.getElementById(`bubble-${messageId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-amber-550', 'ring-offset-2', 'transition-all')
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-amber-550', 'ring-offset-2', 'transition-all')
      }, 2000)
    }
  }

  // Load initial messages
  const loadInitialMessages = useCallback(
    async (chanId: string) => {
      setLoadingHistory(true)
      setHasMore(true)
      setNextCursor(null)
      setNewMessagesCount(0)

      try {
        const res = await chatWsService.send('list_messages', {
          channel_id: chanId,
          limit: 50,
          ordering: 'desc',
        })

        if (res && activeChannelIdRef.current === chanId) {
          // list_messages returns newest messages first.
          // We reverse them to store in ascending order (oldest first).
          const reversed = [...res.messages].reverse()
          setMessages(chanId, reversed)
          setHasMore(res.has_more)
          setNextCursor(res.next_cursor)

          // Wait for DOM to render, then scroll to bottom instantly
          setTimeout(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
            }
          }, 100)

          // Secondary correction scroll after layout and images settle
          setTimeout(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
            }
          }, 350)

          // Send mark_read
          if (reversed.length > 0) {
            const lastMsg = reversed[reversed.length - 1]
            chatWsService
              .send('mark_read', {
                channel_id: chanId,
                last_read_message_id: lastMsg.id,
              })
              .catch(console.error)
          }
        }
      } catch (e) {
        console.error('Failed to load initial messages', e)
      } finally {
        setLoadingHistory(false)
      }
    },
    [setMessages]
  )

  // Load older messages (pagination)
  const loadOlderMessages = useCallback(async () => {
    if (loadingHistory || !hasMore || !nextCursor) return

    setLoadingHistory(true)
    const container = scrollContainerRef.current
    if (container) {
      isPrependingRef.current = true
      previousScrollHeightRef.current = container.scrollHeight
      previousScrollTopRef.current = container.scrollTop
    }

    try {
      const res = await chatWsService.send('list_messages', {
        channel_id: channelId,
        limit: 50,
        cursor: nextCursor,
        ordering: 'desc',
      })

      if (res && activeChannelIdRef.current === channelId) {
        const reversed = [...res.messages].reverse()
        const currentMessages = messagesMap[channelId] || []
        setMessages(channelId, [...reversed, ...currentMessages])
        setHasMore(res.has_more)
        setNextCursor(res.next_cursor)
      }
    } catch (e) {
      console.error('Failed to load older messages', e)
      isPrependingRef.current = false
    } finally {
      setLoadingHistory(false)
    }
  }, [channelId, nextCursor, hasMore, loadingHistory, messagesMap, setMessages])

  // Handle active channel change
  useEffect(() => {
    activeChannelIdRef.current = channelId
    loadInitialMessages(channelId)
    // Load members so mention autocomplete & role checks work without opening the info panel
    loadChannelMembers(channelId)
    // Reset message search state
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }, [channelId, loadInitialMessages])

  // In-channel message search (Instant local search + WS server search)
  useEffect(() => {
    if (!showSearch) return
    const rawTrimmed = searchQuery.trim()
    const normalizedQuery = removeVietnameseDiacritics(rawTrimmed.toLowerCase())
    if (!normalizedQuery) {
      setSearchResults([])
      setSearching(false)
      return
    }

    // 1. Instant local search on loaded channel messages
    const currentMsgs = messagesMap[channelId] || []
    const localMatches = currentMsgs.filter((msg) => {
      const content = msg.content || ''
      const normalizedContent = removeVietnameseDiacritics(content.toLowerCase())
      return normalizedContent.includes(normalizedQuery)
    })

    setSearchResults(localMatches)

    // 2. If query >= 3 chars, also query WS server for historical messages
    if (rawTrimmed.length < 3) {
      setSearching(false)
      return
    }

    setSearching(true)
    const handler = setTimeout(async () => {
      try {
        const res = await chatWsService.send('search_messages', {
          channel_id: channelId,
          query: rawTrimmed,
          limit: 20,
          ordering: 'desc',
        })
        if (activeChannelIdRef.current === channelId) {
          const wsMessages: Message[] = res?.messages || []
          // Merge local matches and WS server matches (deduplicate by id)
          const map = new Map<string, Message>()
          localMatches.forEach((m) => map.set(m.id, m))
          wsMessages.forEach((m) => map.set(m.id, m))
          setSearchResults(Array.from(map.values()))
        }
      } catch (e) {
        console.error('Failed to search messages', e)
      } finally {
        setSearching(false)
      }
    }, 400)

    return () => clearTimeout(handler)
  }, [searchQuery, showSearch, channelId, messagesMap])

  // Jump to a search result — page older messages in until the target is loaded
  const handleGoToSearchResult = async (messageId: string) => {
    if (jumpingToMessage) return

    const isLoaded = () =>
      (useChatStore.getState().messages[channelId] || []).some((m) => m.id === messageId)

    if (isLoaded()) {
      setShowSearch(false)
      setTimeout(() => handleJumpToMessage(messageId), 100)
      return
    }

    setJumpingToMessage(true)
    let cursor = nextCursor
    let more = hasMore
    let pages = 0
    try {
      while (!isLoaded() && more && cursor && pages < 20) {
        const res = await chatWsService.send('list_messages', {
          channel_id: channelId,
          limit: 100,
          cursor,
          ordering: 'desc',
        })
        if (!res || activeChannelIdRef.current !== channelId) break
        const reversed = [...res.messages].reverse()
        const current = useChatStore.getState().messages[channelId] || []
        setMessages(channelId, [...reversed, ...current])
        more = res.has_more
        cursor = res.next_cursor
        pages++
      }
      setHasMore(more)
      setNextCursor(cursor)
    } catch (e) {
      console.error('Failed to load messages while jumping to search result', e)
    } finally {
      setJumpingToMessage(false)
    }

    if (isLoaded()) {
      setShowSearch(false)
      setTimeout(() => handleJumpToMessage(messageId), 150)
    } else {
      toastService.warning('Không thể tải đến tin nhắn này')
    }
  }

  // Render a short plain-text snippet for a search result (mentions → display names)
  const getSearchResultSnippet = (msg: Message) => {
    let content = msg.content || ''
    content = content
      .replace(/<(?:@|!)all>/g, '@Tất cả')
      .replace(/<(?:@|!)admin>/g, '@admin')
      .replace(/<(?:@|!)here>/g, '@here')
      .replace(/<(?:@|!)(\d+)>/g, (_m, id) => {
        const profile = userProfiles[parseInt(id)]
        return `@${profile?.display_name || `User #${id}`}`
      })
    return content || 'Tệp đính kèm'
  }

  // Adjust scroll position after prepending older messages
  useLayoutEffect(() => {
    const container = scrollContainerRef.current
    if (container && isPrependingRef.current) {
      const scrollHeightDiff = container.scrollHeight - previousScrollHeightRef.current
      container.scrollTop = previousScrollTopRef.current + scrollHeightDiff
      isPrependingRef.current = false
    }
  }, [messages.length])

  // Handle new message scrolling & marking read
  const prevMessagesLength = useRef(messages.length)
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    // If new messages arrived
    if (messages.length > prevMessagesLength.current) {
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 150
      const lastMsg = messages[messages.length - 1]
      const sentByMe = lastMsg.user_id === currentUserId

      if (isNearBottom || sentByMe) {
        // Auto scroll to bottom
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
        setNewMessagesCount(0)

        // Mark read
        chatWsService
          .send('mark_read', {
            channel_id: channelId,
            last_read_message_id: lastMsg.id,
          })
          .catch(console.error)
      } else {
        // Show scroll to bottom warning
        setNewMessagesCount((prev) => prev + 1)
      }
    }
    prevMessagesLength.current = messages.length
  }, [messages, channelId, currentUserId])
  // ResizeObserver to always stick scroll position to bottom on content changes/image loads
  const lastScrollHeightRef = useRef(0)
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    lastScrollHeightRef.current = 0 // reset for channel changes

    const resizeObserver = new ResizeObserver(() => {
      if (container.scrollHeight !== lastScrollHeightRef.current) {
        const isNearBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 250
        const isInitial = lastScrollHeightRef.current === 0

        if (isInitial || isNearBottom) {
          container.scrollTop = container.scrollHeight
        }
        lastScrollHeightRef.current = container.scrollHeight
      }
    })

    const content = container.firstElementChild
    if (content) {
      resizeObserver.observe(content)
    } else {
      resizeObserver.observe(container)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [channelId])
  // Monitor scroll for pagination & floating button
  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return

    // Load older messages if scrolled near the top (e.g. less than 50px)
    if (container.scrollTop < 50 && hasMore && !loadingHistory) {
      loadOlderMessages()
    }

    // Toggle "Scroll to bottom" button visibility
    const isScrolledUp = container.scrollHeight - container.scrollTop - container.clientHeight > 300
    setShowScrollToBottom(isScrolledUp)

    if (!isScrolledUp) {
      setNewMessagesCount(0)
    }
  }

  const handleScrollToBottomClick = () => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
      setNewMessagesCount(0)

      // Mark read
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1]
        chatWsService
          .send('mark_read', {
            channel_id: channelId,
            last_read_message_id: lastMsg.id,
          })
          .catch(console.error)
      }
    }
  }

  const getChannelWriteRestrictionText = () => {
    if (activeChannel?.state === 'disabled') {
      return 'Kênh trò chuyện này đã bị tạm dừng.'
    }
    if (activeChannel?.state === 'deleted') {
      return 'Nhóm trò chuyện này đã bị xóa.'
    }
    if (isMuted) {
      return 'Bạn đã bị tắt tiếng trong kênh này bởi quản trị viên.'
    }
    if (activeChannel?.write_policy === 'readonly') {
      return 'Kênh này ở chế độ chỉ đọc.'
    }
    if (activeChannel?.write_policy === 'admins_only' && currentUserRole === 'member') {
      return 'Chỉ quản trị viên mới có thể nhắn tin trong kênh này.'
    }
    return null
  }

  if (!activeChannel) {
    return (
      <div className="animate-in fade-in flex h-full flex-1 flex-col items-center justify-center bg-white duration-300">
        <style>{`
          @keyframes infinite-loading {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
          .animate-infinite-loading {
            animation: infinite-loading 1.6s infinite ease-in-out;
          }
        `}</style>
        <div className="flex flex-col items-center gap-4">
          {/* Glowing Gradient Icon Container */}
          <div className="from-action-primary-red-default relative flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-tr to-red-400 text-white shadow-[0_8px_24px_rgba(239,68,68,0.2)]">
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {/* Outer Ring Animation */}
            <div className="border-action-primary-red-default/20 absolute -inset-2 animate-ping rounded-3xl border-2 duration-1000" />
          </div>

          <div className="mt-2 flex flex-col items-center gap-1.5">
            <p className="text-content-dark-1 text-sm font-semibold tracking-wide">
              Đang tải cuộc trò chuyện
            </p>
            <p className="text-content-dark-3 animate-pulse text-xs">
              Vui lòng chờ trong giây lát...
            </p>
          </div>

          {/* Smooth Circular Progress Spinner */}
          <div className="bg-neutral-10 relative mt-2 h-1.5 w-28 overflow-hidden rounded-full">
            <div className="bg-action-primary-red-default animate-infinite-loading absolute top-0 right-0 bottom-0 left-0 rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  const restrictionText = getChannelWriteRestrictionText()
  const isWriteRestricted = restrictionText !== null

  return (
    <div className="bg-neutral-5 relative flex h-full flex-1 flex-col">
      {/* Pane Header */}
      <div className="border-border-1 z-10 flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
        <div
          onClick={onToggleInfo}
          className="flex cursor-pointer items-center gap-3 transition-opacity select-none hover:opacity-80"
          title="Xem thông tin nhóm"
        >
          <div className="bg-neutral-20 text-content-dark-2 flex h-10 w-10 items-center justify-center rounded-xl">
            {activeChannel.type === 'system' ? (
              <Building className="h-5 w-5" />
            ) : (
              <Users className="h-5 w-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="typo-body-base-semibold text-content-dark-1 leading-tight font-semibold">
                {activeChannel.name}
              </h3>
              {activeChannel.state === 'disabled' && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-amber-800 uppercase">
                  Tạm dừng
                </span>
              )}
              {activeChannel.state === 'deleted' && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-red-800 uppercase">
                  Đã xóa
                </span>
              )}
              {activeChannel.write_policy === 'admins_only' && (
                <span className="bg-neutral-20 text-content-dark-3 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                  Chỉ Admin
                </span>
              )}
            </div>
            {activeChannel.description && (
              <p className="typo-body-xs-regular text-content-dark-3 mt-0.5 max-w-xl truncate">
                {activeChannel.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setShowSearch((prev) => {
                if (prev) {
                  setSearchQuery('')
                  setSearchResults([])
                }
                return !prev
              })
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              showSearch
                ? 'bg-action-primary-red-default/10 text-action-primary-red-default'
                : 'text-content-dark-3 hover:bg-neutral-20 hover:text-content-dark-1'
            }`}
            title="Tìm kiếm tin nhắn"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={onToggleInfo}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              isInfoOpen
                ? 'bg-action-primary-red-default/10 text-action-primary-red-default'
                : 'text-content-dark-3 hover:bg-neutral-20 hover:text-content-dark-1'
            }`}
            title="Thông tin hội thoại"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* In-channel Message Search Bar */}
      {showSearch && (
        <div className="border-border-1 animate-in slide-in-from-top-1 relative z-20 border-b bg-white px-6 py-2.5 shadow-sm duration-200">
          <div className="border-border-1 focus-within:border-action-primary-red-default bg-neutral-5 relative flex items-center rounded-lg border">
            <Search className="text-content-dark-3 absolute left-3 h-4 w-4" />
            <input
              type="text"
              autoFocus
              placeholder="Tìm kiếm tin nhắn trong cuộc trò chuyện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowSearch(false)
                  setSearchQuery('')
                  setSearchResults([])
                }
              }}
              className="typo-body-sm-regular text-content-dark-1 w-full bg-transparent py-2 pr-9 pl-9 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="text-content-dark-3 hover:text-content-dark-1 absolute right-3"
                title="Xóa từ khóa"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchQuery.trim().length >= 1 && (
            <div className="border-border-1 absolute top-full right-6 left-6 z-30 mt-1 max-h-[50vh] overflow-y-auto rounded-xl border bg-white shadow-lg">
              {searching ? (
                <div className="flex items-center justify-center gap-2 py-6">
                  <Loader2 className="text-content-dark-3 h-4 w-4 animate-spin" />
                  <span className="typo-body-sm-regular text-content-dark-3">Đang tìm kiếm...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <p className="typo-body-sm-regular text-content-dark-3 py-6 text-center">
                  Không tìm thấy tin nhắn nào
                </p>
              ) : (
                searchResults.map((msg) => {
                  const profile = msg.user_id ? userProfiles[Number(msg.user_id)] : null
                  const senderName = profile?.display_name || `Người dùng #${msg.user_id}`
                  return (
                    <button
                      key={msg.id}
                      disabled={jumpingToMessage}
                      onClick={() => handleGoToSearchResult(msg.id)}
                      className="hover:bg-neutral-10 border-border-1 flex w-full flex-col gap-0.5 border-b px-4 py-2.5 text-left transition-colors last:border-b-0 disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="typo-body-sm-semibold text-content-dark-1 truncate">
                          {senderName}
                        </span>
                        <span className="typo-body-xs-regular text-content-dark-3 shrink-0">
                          {msg.created_at
                            ? format(parseISO(msg.created_at), 'HH:mm, dd/MM/yyyy')
                            : ''}
                        </span>
                      </div>
                      <span className="typo-body-sm-regular text-content-dark-2 truncate">
                        {getSearchResultSnippet(msg)}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating Pinned Message Banner */}
      {pinnedMessages.length > 0 && (
        <div className="border-border-1 animate-in slide-in-from-top-1 z-10 flex items-center justify-between border-b bg-amber-50/90 px-6 py-2.5 shadow-sm backdrop-blur-md transition-all duration-200">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Pin className="h-3.5 w-3.5 shrink-0 rotate-45 text-amber-600" />
            <span className="shrink-0 text-xs font-semibold text-amber-800">
              Tin nhắn đã ghim ({pinnedMessages.length}):
            </span>
            <span
              onClick={() => handleJumpToMessage(pinnedMessages[pinnedMessages.length - 1].id)}
              className="flex-1 cursor-pointer truncate text-xs text-amber-700 hover:underline"
            >
              {pinnedMessages[pinnedMessages.length - 1].content || 'Đã ghim một tệp đính kèm'}
            </span>
          </div>
          <button
            onClick={() => setShowPinnedListDialog(true)}
            className="ml-4 shrink-0 text-xs font-semibold text-amber-800 hover:text-amber-900 hover:underline"
          >
            Xem tất cả
          </button>
        </div>
      )}

      {/* Message Stream */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-y-contain px-6 py-4"
      >
        <div className="flex min-h-full flex-col justify-end">
          {/* Loading historical messages indicator */}
          {loadingHistory && (messages.length === 0 || isPrependingRef.current) && (
            <div className="flex justify-center py-2">
              <Loader2 className="text-content-dark-3 h-5 w-5 animate-spin" />
            </div>
          )}

          {/* Message List */}
          {messages.length === 0 && !loadingHistory ? (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="bg-neutral-20 text-content-dark-3 mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                {activeChannel.type === 'system' ? (
                  <Building className="h-6 w-6" />
                ) : (
                  <Users className="h-6 w-6" />
                )}
              </div>
              <h4 className="typo-body-base-semibold text-content-dark-2 font-semibold">
                Chào mừng đến với #{activeChannel.name}
              </h4>
              <p className="typo-body-sm-regular text-content-dark-3 mt-1">
                Hãy gửi tin nhắn đầu tiên của bạn tại đây!
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const prevMsg = index > 0 ? messages[index - 1] : undefined
              const nextMsg = index < messages.length - 1 ? messages[index + 1] : undefined

              const isSameUserPrev = prevMsg && prevMsg.user_id === msg.user_id
              const isWithin5MinsPrev =
                prevMsg &&
                new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() <
                  5 * 60 * 1000
              const hasPreviousFromSameUser = isSameUserPrev && isWithin5MinsPrev

              const isSameUserNext = nextMsg && nextMsg.user_id === msg.user_id
              const isWithin5MinsNext =
                nextMsg &&
                new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() <
                  5 * 60 * 1000
              const hasNextFromSameUser = isSameUserNext && isWithin5MinsNext

              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  currentUserRole={currentUserRole}
                  hasPreviousFromSameUser={!!hasPreviousFromSameUser}
                  hasNextFromSameUser={!!hasNextFromSameUser}
                  onShowUserProfile={onShowUserProfile}
                />
              )
            })
          )}
        </div>
      </div>

      {/* Floating Scroll To Bottom Button */}
      {showScrollToBottom && (
        <button
          onClick={handleScrollToBottomClick}
          className={`bg-action-primary-red-default hover:bg-action-primary-red-hover absolute right-8 bottom-24 z-20 flex items-center justify-center text-white shadow-lg transition-all active:scale-95 ${
            newMessagesCount > 0 ? 'gap-1.5 rounded-full px-4 py-2' : 'h-10 w-10 rounded-full'
          }`}
          title="Cuộn xuống dưới"
        >
          <ArrowDown className="h-5 w-5" />
          {newMessagesCount > 0 && (
            <span className="typo-body-sm-semibold">Có {newMessagesCount} tin nhắn mới</span>
          )}
        </button>
      )}

      {/* Message Input Box */}
      {isWriteRestricted ? (
        <div className="border-border-1 bg-neutral-15 border-t p-4 text-center">
          <p className="typo-body-sm-medium text-content-dark-3 italic">{restrictionText}</p>
        </div>
      ) : (
        <MessageInput channelId={channelId} />
      )}

      {/* Pinned Messages Dialog */}
      <AppDialog
        variant="custom"
        size="md"
        open={showPinnedListDialog}
        onOpenChange={setShowPinnedListDialog}
        onConfirm={() => setShowPinnedListDialog(false)}
        onCancel={() => setShowPinnedListDialog(false)}
        isHideCancelButton={true}
        confirmText="Đóng"
        title="Danh sách tin nhắn đã ghim"
        content={
          <div className="flex max-h-[60vh] flex-col gap-3.5 overflow-y-auto p-1">
            {pinnedMessages.length === 0 ? (
              <p className="text-content-dark-3 py-6 text-center text-sm">
                Chưa có tin nhắn nào được ghim trong cuộc trò chuyện này.
              </p>
            ) : (
              pinnedMessages.map((msg, index) => {
                const profile = msg.user_id ? userProfiles[msg.user_id] : null
                const senderName = profile?.display_name || `Người dùng #${msg.user_id}`
                const formattedTime = msg.created_at
                  ? format(parseISO(msg.created_at), 'HH:mm, dd/MM/yyyy')
                  : ''

                return (
                  <div
                    key={msg.id}
                    className="group animate-in fade-in flex flex-col gap-3.5 rounded-xl border border-amber-200 bg-amber-50/20 p-4 shadow-sm transition-all duration-200 hover:bg-amber-50/40"
                  >
                    {/* Header: Avatar, Name, Time, Pin Badge */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar
                          size={32}
                          className="h-8 w-8 shrink-0"
                          src={profile?.avatar_url || ''}
                          name={senderName}
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="text-content-dark-1 truncate text-xs font-bold">
                            {senderName}
                          </span>
                          <span className="text-content-dark-3 text-[10px] font-medium">
                            {formattedTime}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200/50 bg-amber-50 px-2.5 py-0.5 text-amber-800">
                        <Pin className="h-3 w-3 rotate-45 text-amber-600" />
                        <span className="text-[10px] font-bold">Ghim #{index + 1}</span>
                      </div>
                    </div>

                    {/* Message Body Content */}
                    <div className="text-content-dark-1 pl-0.5 text-sm leading-relaxed break-words">
                      {msg.content ? (
                        msg.content
                      ) : (
                        <span className="text-content-dark-3 text-xs italic">Tệp đính kèm</span>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-1.5 flex items-center justify-end gap-2 border-t border-amber-200/20 pt-3">
                      <Button
                        variant="secondary-border"
                        size="small"
                        onClick={() => {
                          setShowPinnedListDialog(false)
                          handleJumpToMessage(msg.id)
                        }}
                      >
                        Đi tới
                      </Button>
                      <Button
                        variant="secondary-border"
                        size="small"
                        className="text-action-primary-red-default border-action-primary-red-default hover:bg-action-primary-red-default/10"
                        onClick={() => {
                          unpinMessage(channelId, msg.id)
                        }}
                      >
                        Bỏ ghim
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        }
      />
    </div>
  )
}
