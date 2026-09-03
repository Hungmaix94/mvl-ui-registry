import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChatSidebar } from '@/features/chat/components/ChatSidebar'
import { ChatPane } from '@/features/chat/components/ChatPane'
import { ChannelMemberPanel } from '@/features/chat/components/channel-info/ChannelMemberPanel'
import { UserProfilePanel } from '@/features/chat/components/channel-info/UserProfilePanel'
import { useChatStore } from '@/features/chat/store/chat-store'
import { chatWsService } from '@/features/chat/services/chat-ws-service'
import { useUserInfo } from '@/store/auth-store'
import { MessageSquare, AlertCircle } from 'lucide-react'

const ChatPage: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>()
  const user = useUserInfo()
  const currentUserId = user?.id || null
  const activeChannelId = useChatStore((state) => state.activeChannelId)
  const setActiveChannelId = useChatStore((state) => state.setActiveChannelId)
  const connectionStatus = useChatStore((state) => state.connectionStatus)
  const channels = useChatStore((state) => state.channels)
  const members = useChatStore((state) => state.members[activeChannelId || ''] || [])

  // Lock scroll on main layout wrapper & body/html to prevent page-level scrolling (extra scroll / red gap at bottom)
  useEffect(() => {
    // Reset window scroll position to top
    window.scrollTo(0, 0)
    if (document.body) document.body.scrollTop = 0
    if (document.documentElement) document.documentElement.scrollTop = 0

    const mainWrapper = document.querySelector('[data-name="Header"]')?.parentElement
    
    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    const originalWrapperHeight = mainWrapper ? mainWrapper.style.height : ''
    const originalWrapperOverflow = mainWrapper ? mainWrapper.style.overflow : ''

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    if (mainWrapper) {
      mainWrapper.style.height = '100vh'
      mainWrapper.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
      if (mainWrapper) {
        mainWrapper.style.height = originalWrapperHeight
        mainWrapper.style.overflow = originalWrapperOverflow
      }
    }
  }, [])

  const [rightPanel, setRightPanel] = useState<'group' | 'user' | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  // Sync user ID to Chat Store
  useEffect(() => {
    if (currentUserId) {
      useChatStore.getState().setCurrentUserId(currentUserId)
    }
  }, [currentUserId])

  // Sync route param channelId to Chat Store activeChannelId
  useEffect(() => {
    if (channelId) {
      if (channelId !== activeChannelId) {
        setActiveChannelId(channelId)
      }
    } else {
      if (activeChannelId !== null) {
        setActiveChannelId(null)
      }
    }
  }, [channelId, activeChannelId, setActiveChannelId])

  // Manage WS connection lifecycle
  useEffect(() => {
    chatWsService.connect()
    return () => {
      chatWsService.disconnect()
    }
  }, [])

  // Find active channel object & user role
  const activeChannel = activeChannelId ? channels[activeChannelId] : null
  const currentUserMember = members.find((m) => m.user_id === currentUserId)
  const currentUserRole = currentUserMember?.role || 'member'

  return (
    <div className="flex h-[calc(100svh-var(--header-height))] w-full overflow-hidden bg-neutral-10">
      {/* 1. Left Sidebar: Channels List */}
      <ChatSidebar />

      {/* 2. Middle Pane & 3. Right Collapsible Info Panel */}
      {activeChannelId && activeChannel ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Middle Pane: Message Stream */}
          <ChatPane
            channelId={activeChannelId}
            onToggleInfo={() => setRightPanel(rightPanel === 'group' ? null : 'group')}
            isInfoOpen={rightPanel === 'group'}
            onShowUserProfile={(userId) => {
              setSelectedUserId(userId)
              setRightPanel('user')
            }}
          />

          {/* Right Panel: Collapsible Channel Info & Members list or User Profile */}
          <div className={`transition-all duration-300 ease-in-out bg-white h-full shrink-0 overflow-hidden ${rightPanel ? 'w-[300px] border-l border-border-1' : 'w-0 border-l-0'}`}>
            {rightPanel === 'group' && (
              <ChannelMemberPanel
                channelId={activeChannelId}
                currentUserRole={currentUserRole}
                channelType={activeChannel.type}
                currentUserId={currentUserId || 0}
                onClose={() => setRightPanel(null)}
              />
            )}
            {rightPanel === 'user' && selectedUserId && (
              <UserProfilePanel
                userId={selectedUserId}
                channelId={activeChannelId}
                currentUserRole={currentUserRole}
                onClose={() => setRightPanel(null)}
              />
            )}
          </div>
        </div>
      ) : (
        // Placeholder when no channel is selected
        <div className="flex flex-1 flex-col items-center justify-center bg-neutral-5 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-action-primary-red-default/10 text-action-primary-red-default mb-4">
            <MessageSquare className="h-8 w-8" />
          </div>
          <h3 className="typo-h5 font-semibold text-content-dark-1">Chào mừng bạn đến với mục Trò chuyện</h3>
          <p className="typo-body-base-regular text-content-dark-3 mt-2 max-w-md">
            Chọn một cuộc hội thoại từ danh sách bên trái hoặc liên hệ quản trị viên để được thêm vào các kênh nhóm.
          </p>

          {/* Reconnect state banner */}
          {connectionStatus === 'disconnected' && (
            <div className="mt-6 flex items-center gap-2 rounded-xl bg-data-red-default/10 border border-data-red-default/20 px-4 py-2.5 text-data-red-default typo-body-sm-medium animate-pulse">
              <AlertCircle className="h-5 w-5" />
              <span>Đang mất kết nối. Đang tự động kết nối lại...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ChatPage
