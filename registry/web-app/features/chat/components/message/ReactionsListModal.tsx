import React, { useEffect, useState } from 'react'
import AppDialog from '@/components/dialog/AppDialog'
import { useChatStore } from '../../store/chat-store'
import { chatWsService } from '../../services/chat-ws-service'
import { chatService } from '../../services/chat-service'
import { Loader2 } from 'lucide-react'

import { REACTION_TYPES, EMOJI_MAP } from '../../constants'

interface ReactionsListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  messageId: string
}

export const ReactionsListModal: React.FC<ReactionsListModalProps> = ({
  open,
  onOpenChange,
  messageId,
}) => {
  const [loading, setLoading] = useState(false)
  const [reactions, setReactions] = useState<any[]>([])
  const [selectedTab, setSelectedTab] = useState<string>('all')
  const userProfiles = useChatStore((state) => state.userProfiles)
  const cacheUserProfile = useChatStore((state) => state.cacheUserProfile)

  // Reset tab selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedTab('all')
    }
  }, [open])

  useEffect(() => {
    if (!open || !messageId) return

    const fetchReactions = async () => {
      setLoading(true)
      try {
        const res = await chatWsService.send('list_reactions', {
          message_id: messageId,
          limit: 100,
        })
        if (res && res.reactions) {
          setReactions(res.reactions)

          // Batch fetch missing user profiles
          const userIds = res.reactions.map((r: any) => r.user_id)
          const missingIds = userIds.filter((id: number) => !userProfiles[id])
          if (missingIds.length > 0) {
            const profiles = await chatService.getUserProfiles(missingIds)
            if (profiles) {
              profiles.forEach((p: any) => {
                cacheUserProfile(p.user_id, {
                  user_id: p.user_id,
                  display_name: p.display_name,
                  avatar_url: p.avatar_url,
                })
              })
            }
          }
        }
      } catch (e) {
        console.error('Failed to load reactions list', e)
      } finally {
        setLoading(false)
      }
    }

    fetchReactions()
  }, [open, messageId, cacheUserProfile, userProfiles])

  // Group reactions for tabs
  const groupedReactions = React.useMemo(() => {
    const groups: Record<string, any[]> = { all: reactions }
    reactions.forEach((r) => {
      const type = r.type || 'like'
      if (!groups[type]) groups[type] = []
      groups[type].push(r)
    })
    return groups
  }, [reactions])

  // Active tabs
  const activeTabs = React.useMemo(() => {
    const tabs = [{ key: 'all', label: 'Tất cả', emoji: '', url: '', count: reactions.length }]
    REACTION_TYPES.forEach((t) => {
      const count = (groupedReactions[t.key] || []).length
      if (count > 0) {
        tabs.push({
          key: t.key,
          label: t.label,
          emoji: t.emoji,
          url: t.url,
          count,
        })
      }
    })
    return tabs
  }, [reactions, groupedReactions])

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="text-action-primary-red-default h-6 w-6 animate-spin" />
        </div>
      )
    }

    if (reactions.length === 0) {
      return (
        <div className="text-content-dark-3 typo-body-sm-regular py-8 text-center">
          Chưa có lượt tương tác nào
        </div>
      )
    }

    const currentReactions = groupedReactions[selectedTab] || []

    return (
      <div className="flex min-h-[300px] flex-col gap-4">
        {/* Scrollable Tab bar */}
        <div className="border-border-1 scrollbar-none flex items-center gap-1.5 overflow-x-auto border-b pb-3">
          {activeTabs.map((t) => {
            const isTabActive = selectedTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setSelectedTab(t.key)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 select-none ${
                  isTabActive
                    ? 'bg-action-primary-red-default text-white shadow-sm'
                    : 'bg-neutral-20 text-content-dark-2 hover:bg-neutral-30 hover:text-content-dark-1'
                }`}
              >
                {t.url && (
                  <img
                    src={t.url}
                    alt={t.label}
                    className="pointer-events-none h-4 w-4 shrink-0 object-contain"
                  />
                )}
                <span>{t.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.25 text-[10px] font-bold ${isTabActive ? 'bg-white/20 text-white' : 'bg-neutral-30 text-content-dark-3'}`}
                >
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Reaction List */}
        <div className="scrollbar-thin flex max-h-[280px] flex-col gap-1 overflow-y-auto pr-1">
          {currentReactions.length === 0 ? (
            <div className="text-content-dark-3 typo-body-sm-regular py-8 text-center">
              Không có lượt tương tác nào thuộc loại này
            </div>
          ) : (
            currentReactions.map((r: any, idx: number) => {
              const profile = userProfiles[r.user_id]
              const name = profile?.display_name || `Thành viên #${r.user_id}`
              const initial = name.charAt(0).toUpperCase()

              // Generate soft HSL pastel gradient background for avatar fallback
              const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
              const hue = charCodeSum % 360
              const avatarBg = `hsl(${hue}, 65%, 88%)`
              const avatarText = `hsl(${hue}, 80%, 28%)`

              return (
                <div
                  key={idx}
                  className="group hover:bg-neutral-10 flex items-center justify-between rounded-xl p-2 transition-all duration-200"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white font-bold shadow-sm"
                      style={
                        !profile?.avatar_url
                          ? { backgroundColor: avatarBg, color: avatarText }
                          : undefined
                      }
                    >
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm uppercase select-none">{initial}</span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="typo-body-sm-semibold text-content-dark-1 group-hover:text-action-primary-red-default truncate leading-normal font-semibold transition-colors">
                        {name}
                      </span>
                      <span className="text-content-dark-3 mt-0.5 text-[10px]">
                        Đã tương tác lúc{' '}
                        {new Date(r.created_at || Date.now()).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <span className="border-border-1 flex h-8 w-8 items-center justify-center rounded-full border bg-white p-1.5 shadow-sm transition-all select-none hover:scale-115">
                      <img
                        src={EMOJI_MAP[r.type] || EMOJI_MAP.like}
                        alt={r.type}
                        className="pointer-events-none h-full w-full shrink-0 object-contain"
                      />
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  return (
    <AppDialog
      variant="custom"
      size="sm"
      open={open}
      onOpenChange={onOpenChange}
      onCancel={() => onOpenChange(false)}
      onConfirm={() => onOpenChange(false)}
      isHideCancelButton={true}
      confirmText="Đóng"
      title="Tương tác"
      content={renderContent()}
    />
  )
}
