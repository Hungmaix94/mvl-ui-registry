import React, { useEffect, useState, useRef } from 'react'
import { LibraryItemRef, Message } from '../types/channel'
import { useChatStore } from '../store/chat-store'
import { chatService } from '../services/chat-service'
import { chatWsService } from '../services/chat-ws-service'
import { getElibraryService } from '@/services/elibrary-service'
import { getRevokeLabel } from './message/MessageContextMenu'
import { ReactionsListModal } from './message/ReactionsListModal'
import RequestAccessDialog from './message/RequestAccessDialog'
import {
  resolveLibraryItemOpenError,
  resolveLibraryItemOpenSuccess,
} from '../utils/library-item-open'
import {
  Folder,
  Download,
  FileText,
  Smile,
  MoreHorizontal,
  X,
  Pin,
  Trash,
  Loader2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { formatNumber } from '@/utils/common'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import AppDialog from '@/components/dialog/AppDialog'
import toastService from '@/services/toast-service'
import { useAbility } from '@/lib/ability'

import { REACTION_TYPES } from '../constants'

interface MessageBubbleProps {
  message: Message
  currentUserRole: any
  hasPreviousFromSameUser?: boolean
  hasNextFromSameUser?: boolean
  onShowUserProfile?: (userId: number) => void
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserRole,
  hasPreviousFromSameUser = false,
  hasNextFromSameUser = false,
  onShowUserProfile,
}) => {
  const currentUserId = useChatStore((state) => state.currentUserId) || 0
  const userProfiles = useChatStore((state) => state.userProfiles)
  const cacheUserProfile = useChatStore((state) => state.cacheUserProfile)
  const attachmentsMetadata = useChatStore((state) => state.attachmentsMetadata)
  const cacheAttachmentMetadatas = useChatStore((state) => state.cacheAttachmentMetadatas)
  const isSelf = message.user_id === currentUserId
  const pinMessage = useChatStore((state) => state.pinMessage)
  const unpinMessage = useChatStore((state) => state.unpinMessage)
  const pinnedMessages = useChatStore((state) => state.pinnedMessages[message.channel_id] || [])
  const isPinned = pinnedMessages.some((m) => m.id === message.id)

  const [reactionsModalOpen, setReactionsModalOpen] = useState(false)
  const [showQuickReactions, setShowQuickReactions] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({})
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImgUrl, setLightboxImgUrl] = useState('')
  const [lightboxFileName, setLightboxFileName] = useState('')
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [forceShow, setForceShow] = useState(false)

  const [requestAccessDialogOpen, setRequestAccessDialogOpen] = useState(false)
  const [selectedRequestAccessItemId, setSelectedRequestAccessItemId] = useState<number | null>(
    null
  )
  const [selectedRequestAccessItemName, setSelectedRequestAccessItemName] = useState('')
  const [selectedRequestAccessItemOwner, setSelectedRequestAccessItemOwner] = useState('')

  const handleLibraryItemClick = async (item: LibraryItemRef) => {
    const itemId = Number(item.item_id)
    if (!itemId) return

    const openRequestAccess = () => {
      setSelectedRequestAccessItemId(itemId)
      setSelectedRequestAccessItemName(item.name || 'Tài liệu thư viện')
      setSelectedRequestAccessItemOwner(item.owner?.display_name || 'Chủ sở hữu')
      setRequestAccessDialogOpen(true)
    }

    let outcome
    try {
      // SRS §4.7: mở tài liệu từ card chat đi qua endpoint chi tiết item —
      // chính nó enforce quyền visibility/share và trả về presigned URL cho
      // người có quyền xem. KHÔNG mint share-token ở đây: mint token là hành
      // động của chủ sở hữu, nên luồng cũ luôn 404 với mọi người không phải chủ.
      const detail = await getElibraryService().getFile(itemId)
      outcome = resolveLibraryItemOpenSuccess(detail)
    } catch (error: any) {
      outcome = resolveLibraryItemOpenError(error)
    }

    switch (outcome.type) {
      case 'open':
        window.open(outcome.url, '_blank', 'noopener,noreferrer')
        break
      case 'request-access':
        openRequestAccess()
        break
      case 'deleted':
        toastService.error('Tài liệu đã bị xóa hoặc không tồn tại')
        break
      case 'unopenable':
        // Thư mục (và item không có file xem trực tiếp) không có presigned URL.
        toastService.error('Không thể mở tài liệu này')
        break
      default:
        toastService.error('Có lỗi xảy ra khi truy cập tài liệu')
    }
  }

  // Reset scale and offsets when lightbox closes
  useEffect(() => {
    if (!lightboxOpen) {
      setScale(1)
      setOffset({ x: 0, y: 0 })
      setIsDragging(false)
    }
  }, [lightboxOpen])

  const hasFetchedRef = useRef(false)
  const hasFetchedMetadataRef = useRef(false)

  const ability = useAbility()
  const isChatAdmin = ability.can('workspace', 'chat')
  const isChannelManager = currentUserRole === 'admin' || currentUserRole === 'owner' || isChatAdmin
  const canRemoveOthers = isChannelManager && !isSelf

  const senderProfile = message.user_id ? userProfiles[Number(message.user_id)] : null

  const attachmentIds = message.metadata?.attachments?.map((a) => Number(a.file_id)) || []
  const fileIds = [...attachmentIds]

  // Helper to check if an item is an image
  const checkIsImage = (item: any, isLibrary: boolean) => {
    if (isLibrary) {
      const fileId = item.file?.file_id ? Number(item.file.file_id) : null
      const meta = fileId ? attachmentsMetadata[fileId] : null
      const mime = meta?.mime_type || item.file?.mime_type
      const name = meta?.original_name || meta?.file_name || item.name
      return (
        !!item.file &&
        (mime?.startsWith('image/') ||
          ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((ext) =>
            name?.toLowerCase().endsWith(ext)
          ) ||
          ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(item.file.extension?.toLowerCase()))
      )
    } else {
      const fileId = Number(item.file_id)
      const meta = attachmentsMetadata[fileId]
      const mime = meta?.mime_type || item.mime_type
      const name = meta?.original_name || meta?.file_name || item.name
      return (
        mime?.startsWith('image/') ||
        ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((ext) => name?.toLowerCase().endsWith(ext))
      )
    }
  }

  const attachments = message.metadata?.attachments || []
  const libraryItems = message.metadata?.library_items || []
  const images: any[] = []
  const files: any[] = []

  attachments.forEach((att: any) => {
    if (checkIsImage(att, false)) {
      images.push({ type: 'attachment', data: att })
    } else {
      files.push({ type: 'attachment', data: att })
    }
  })

  libraryItems.forEach((item: any) => {
    if (checkIsImage(item, true)) {
      images.push({ type: 'library', data: item })
    } else {
      files.push({ type: 'library', data: item })
    }
  })

  const hasText = !!message.content
  const hasFiles = files.length > 0
  const hasImages = images.length > 0
  const isImageOnly = hasImages && !hasText && !hasFiles

  // Close quick reactions menu when clicking outside
  useEffect(() => {
    if (!showQuickReactions) return

    const handleCloseReactions = () => {
      setShowQuickReactions(false)
    }

    const timer = setTimeout(() => {
      document.addEventListener('click', handleCloseReactions)
    }, 10)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleCloseReactions)
    }
  }, [showQuickReactions])

  const handleMoreClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // If on mobile view, trigger the bottom actions drawer
    if (window.innerWidth < 768) {
      setDrawerOpen(true)
    } else {
      setShowDropdown(!showDropdown)
    }
  }

  const handleRevoke = async () => {
    try {
      await chatWsService.send('revoke_message', { message_id: message.id })
      setRevokeConfirmOpen(false)
      useChatStore
        .getState()
        .updateMessageRevokedStatus(
          message.channel_id,
          message.id,
          new Date().toISOString(),
          currentUserId
        )
      toastService.success('Đã thu hồi tin nhắn')
    } catch (e) {
      toastService.error('Lỗi khi thu hồi tin nhắn')
    }
  }

  const handlePinMessage = () => {
    if (pinnedMessages.length >= 3) {
      toastService.warning('Chỉ được ghim tối đa 3 tin nhắn trong mỗi cuộc hội thoại')
      return
    }
    pinMessage(message.channel_id, message)
    toastService.success('Đã ghim tin nhắn')
  }

  const handleShowProfile = () => {
    if (onShowUserProfile && message.user_id) {
      onShowUserProfile(Number(message.user_id))
    } else {
      setProfileDialogOpen(true)
    }
  }

  const handleQuickReaction = async (type: string) => {
    try {
      await chatWsService.send('add_reaction', {
        message_id: message.id,
        type,
      })
      setShowQuickReactions(false)
    } catch (e) {
      console.error('Failed to react', e)
    }
  }

  // Fetch sender profile and mentioned profiles if missing
  useEffect(() => {
    if (hasFetchedRef.current) return
    const missingIds: number[] = []

    if (message.user_id && !senderProfile) {
      missingIds.push(Number(message.user_id))
    }

    if (message.content) {
      const regex = /<@(\d+)>/g
      let match
      while ((match = regex.exec(message.content)) !== null) {
        const userId = parseInt(match[1])
        if (userId && !userProfiles[userId] && !missingIds.includes(userId)) {
          missingIds.push(userId)
        }
      }
    }

    if (missingIds.length > 0) {
      hasFetchedRef.current = true
      chatService
        .getUserProfiles(missingIds)
        .then((profiles) => {
          if (profiles && profiles.length > 0) {
            profiles.forEach((p) => {
              cacheUserProfile(p.user_id, {
                user_id: p.user_id,
                display_name: p.display_name,
                avatar_url: p.avatar_url,
              })
            })
          }
        })
        .catch((err) => {
          console.error(err)
          hasFetchedRef.current = false // allow retry on next mount
        })
    }
  }, [message.user_id, senderProfile, message.content])

  // Fetch attachments and library items metadata on-demand
  useEffect(() => {
    if (hasFetchedMetadataRef.current) return
    const missingIds = fileIds.filter((id) => !attachmentsMetadata[id])

    if (missingIds.length > 0) {
      hasFetchedMetadataRef.current = true
      chatService
        .getFileMetadata(missingIds)
        .then((metadataList) => {
          cacheAttachmentMetadatas(metadataList)
        })
        .catch((err) => {
          console.error(err)
          hasFetchedMetadataRef.current = false // allow retry on next mount
        })
    }
  }, [message.id])

  useEffect(() => {
    setForceShow(false)
    const timer = setTimeout(() => {
      setForceShow(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [message.id])

  // Close desktop dropdown on click outside
  useEffect(() => {
    if (!showDropdown) return

    const handleCloseDropdown = () => {
      setShowDropdown(false)
    }

    const timer = setTimeout(() => {
      document.addEventListener('click', handleCloseDropdown)
    }, 10)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleCloseDropdown)
    }
  }, [showDropdown])

  // Load signed URLs for images on-demand
  useEffect(() => {
    const imageIds: number[] = []
    const libraryImageItemsToFetch: Array<{ fileId: number; itemId: number }> = []

    // Collect image IDs from attachments
    message.metadata?.attachments?.forEach((att: any) => {
      const fileId = Number(att.file_id)
      const meta = attachmentsMetadata[fileId]
      const name = meta?.original_name || meta?.file_name || att.name
      const mime = meta?.mime_type || att.mime_type
      const isImage =
        mime?.startsWith('image/') ||
        ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((ext) => name?.toLowerCase().endsWith(ext))

      if (isImage && fileId && !imageUrls[fileId]) {
        if (meta && typeof meta.signed_url === 'string') {
          const url = meta.signed_url
          setImageUrls((prev) => ({ ...prev, [fileId]: url }))
        } else {
          imageIds.push(fileId)
        }
      }
    })

    // Collect image IDs from library items
    message.metadata?.library_items?.forEach((item: any) => {
      const fileId = Number(item.file?.file_id)
      const itemId = Number(item.item_id)
      const meta = fileId ? attachmentsMetadata[fileId] : null
      const name = meta?.original_name || meta?.file_name || item.name
      const mime = meta?.mime_type || item.file?.mime_type
      const isImage =
        item.file &&
        (mime?.startsWith('image/') ||
          ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((ext) =>
            name?.toLowerCase().endsWith(ext)
          ) ||
          ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(item.file.extension?.toLowerCase()))

      if (isImage && fileId && !imageUrls[fileId]) {
        if (meta && typeof meta.signed_url === 'string') {
          const url = meta.signed_url
          setImageUrls((prev) => ({ ...prev, [fileId]: url }))
        } else if (itemId) {
          libraryImageItemsToFetch.push({ fileId, itemId })
        }
      }
    })

    if (imageIds.length > 0) {
      imageIds.forEach(async (fileId) => {
        try {
          const res = await chatService.getFileMetadata([fileId])
          if (res && res.length > 0 && res[0].signed_url) {
            cacheAttachmentMetadatas(res)
            setImageUrls((prev) => ({ ...prev, [fileId]: res[0].signed_url }))
          }
        } catch (e) {
          console.error(`Failed to get signed URL for file #${fileId}`, e)
        }
      })
    }

    if (libraryImageItemsToFetch.length > 0) {
      libraryImageItemsToFetch.forEach(async ({ fileId, itemId }) => {
        try {
          const res = await getElibraryService().getFile(itemId)
          const url = res.view_url || res.download_url
          if (url) {
            setImageUrls((prev) => ({ ...prev, [fileId]: url }))
          }
        } catch (e) {
          console.error(`Failed to get signed URL for elibrary item #${itemId}`, e)
        }
      })
    }
  }, [message.metadata, imageUrls, attachmentsMetadata])

  const handleDownloadFile = async (fileId: number, fileName: string) => {
    try {
      let signedUrl = attachmentsMetadata[fileId]?.signed_url
      if (!signedUrl) {
        const res = await chatService.getFileDownloadUrl(fileId)
        if (res && res.signed_url) {
          signedUrl = res.signed_url
          const meta = attachmentsMetadata[fileId]
          if (meta) {
            cacheAttachmentMetadatas([{ ...meta, signed_url: signedUrl }])
          }
        }
      }

      if (signedUrl) {
        // window.open sau await bị popup blocker chặn — dùng thẻ <a> ẩn để tải
        const anchor = document.createElement('a')
        anchor.href = signedUrl
        anchor.download = fileName || ''
        anchor.target = '_blank'
        anchor.rel = 'noopener noreferrer'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      } else {
        toastService.error('Không thể lấy đường dẫn tải tệp')
      }
    } catch (e) {
      console.error('Error fetching download URL', e)
      toastService.error('Không thể tải tệp. Vui lòng thử lại.')
    }
  }

  const parseUrls = (text: string, keyPrefix: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = urlRegex.exec(text)) !== null) {
      const matchIndex = match.index
      const url = match[1]

      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex))
      }

      parts.push(
        <a
          key={`${keyPrefix}-${matchIndex}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={
            isSelf
              ? 'inline font-medium break-all text-white/90 underline hover:text-white'
              : 'text-action-primary-red-default hover:text-action-primary-red-hover inline font-medium break-all underline'
          }
          onClick={(e) => e.stopPropagation()} // Prevent triggering right click context menu on click
        >
          {url}
        </a>
      )

      lastIndex = urlRegex.lastIndex
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts
  }

  // Parse mentions in message content
  const renderMessageContent = () => {
    const text = message.content
    if (!text) return null

    // Replace `<@id>`, `<!all>` or `<@all>` placeholders with stylized pills
    const regex = /<(?:@|!)(all|admin|here|\d+)>/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index
      const matchVal = match[1]

      // Push preceding text
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex))
      }

      if (matchVal === 'all') {
        parts.push(
          <span
            key={matchIndex}
            className={`mx-0.5 font-semibold ${isSelf ? 'text-white underline' : 'text-blue-600'}`}
          >
            @Tất cả
          </span>
        )
      } else if (matchVal === 'admin') {
        parts.push(
          <span
            key={matchIndex}
            className={`mx-0.5 font-semibold ${isSelf ? 'text-white underline' : 'text-blue-600'}`}
          >
            @admin
          </span>
        )
      } else if (matchVal === 'here') {
        parts.push(
          <span
            key={matchIndex}
            className={`mx-0.5 font-semibold ${isSelf ? 'text-white underline' : 'text-blue-600'}`}
          >
            @here
          </span>
        )
      } else {
        const userId = parseInt(matchVal)
        const mentionProfile = userProfiles[userId]
        parts.push(
          <span
            key={matchIndex}
            onClick={() => onShowUserProfile?.(userId)}
            className={`mx-0.5 cursor-pointer font-semibold hover:underline ${
              isSelf ? 'text-white underline' : 'text-blue-600'
            }`}
          >
            @{mentionProfile?.display_name || (userId === 1 ? 'admin' : `User #${userId}`)}
          </span>
        )
      }

      lastIndex = regex.lastIndex
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    // Parse special mentions (<!all>, @all, @Tất cả, @admin) and URLs in plain text segments
    const finalContent = parts.map((part, partIdx) => {
      if (typeof part === 'string') {
        const subParts = []
        const mentionRegex = /(<!all>|@all|@tất cả|@admin)/gi
        let lastIdx = 0
        let match

        while ((match = mentionRegex.exec(part)) !== null) {
          const matchIndex = match.index
          if (matchIndex > lastIdx) {
            const textSegment = part.substring(lastIdx, matchIndex)
            subParts.push(...parseUrls(textSegment, `part-${partIdx}-sub-${matchIndex}`))
          }

          const matchedText = match[1]
          const isAll =
            matchedText.toLowerCase() === '<!all>' ||
            matchedText.toLowerCase() === '@all' ||
            matchedText.toLowerCase() === '@tất cả'

          if (isAll) {
            subParts.push(
              <span
                key={matchIndex}
                className="bg-red-10 text-action-primary-red-default mx-0.5 inline-block rounded px-1.5 py-0.5 text-xs font-semibold"
              >
                @Tất cả
              </span>
            )
          } else {
            // @admin
            subParts.push(
              <span
                key={matchIndex}
                className="bg-irish-20 text-data-irish-default mx-0.5 inline-block rounded px-1.5 py-0.5 text-xs font-semibold"
              >
                @admin
              </span>
            )
          }

          lastIdx = mentionRegex.lastIndex
        }

        if (lastIdx < part.length) {
          const textSegment = part.substring(lastIdx)
          subParts.push(...parseUrls(textSegment, `part-${partIdx}-end`))
        }
        return subParts
      }
      return part
    })

    return finalContent
  }

  const formatMessageTime = (isoString: string) => {
    try {
      return format(parseISO(isoString), 'HH:mm')
    } catch (e) {
      return ''
    }
  }

  const revokedLabel = getRevokeLabel(message, currentUserId)

  // Images list layout
  const renderImages = () => {
    if (images.length === 0) return null

    const gridColsClass =
      images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'

    return (
      <div className={`grid w-fit gap-2 ${isImageOnly ? '' : 'mt-2'} ${gridColsClass}`}>
        {images.map((imgItem: any, idx: number) => {
          if (imgItem.type === 'attachment') {
            const att = imgItem.data
            const fileId = Number(att.file_id)
            const meta = attachmentsMetadata[fileId]
            const imgUrl = imageUrls[fileId] || meta?.signed_url

            if (meta?.is_deleted) {
              return (
                <div
                  key={`att-img-${fileId}-${idx}`}
                  className="text-data-red-default bg-neutral-20 rounded p-2 text-xs italic"
                >
                  Tệp đính kèm đã bị xóa
                </div>
              )
            }

            if (imgUrl) {
              return (
                <div
                  key={`att-img-${fileId}-${idx}`}
                  className="border-border-1 bg-neutral-20 relative h-[160px] w-[240px] overflow-hidden rounded-xl border shadow-sm transition-opacity hover:opacity-90"
                >
                  <img
                    src={imgUrl}
                    alt={meta?.original_name || meta?.file_name || att.name}
                    onClick={() => {
                      setLightboxImgUrl(imgUrl)
                      setLightboxFileName(meta?.original_name || meta?.file_name || att.name)
                      setLightboxOpen(true)
                    }}
                    className="h-full w-full cursor-pointer object-cover"
                  />
                </div>
              )
            }

            return (
              <div
                key={`att-img-${fileId}-${idx}`}
                className="bg-neutral-10 border-border-1 text-content-dark-3 flex h-[160px] w-[240px] flex-col items-center justify-center gap-2 rounded-xl border text-xs shadow-sm"
              >
                <Loader2 className="text-content-dark-3 h-5 w-5 animate-spin" />
                <span>Đang tải ảnh...</span>
              </div>
            )
          } else {
            // library item
            const item = imgItem.data
            const fileId = Number(item.file?.file_id)
            const meta = attachmentsMetadata[fileId]
            const imgUrl = imageUrls[fileId] || meta?.signed_url

            if (meta?.is_deleted) {
              return (
                <div
                  key={`lib-img-${fileId}-${idx}`}
                  className="text-data-red-default bg-neutral-20 rounded p-2 text-xs italic"
                >
                  Tài liệu đã bị xóa
                </div>
              )
            }

            if (imgUrl) {
              return (
                <div
                  key={`lib-img-${fileId}-${idx}`}
                  onClick={() => handleLibraryItemClick(item)}
                  className="border-border-1 bg-neutral-20 relative h-[160px] w-[240px] cursor-pointer overflow-hidden rounded-xl border shadow-sm transition-opacity hover:opacity-90"
                >
                  <img
                    src={imgUrl}
                    alt={meta?.original_name || meta?.file_name || item.name}
                    onClick={(e) => {
                      e.stopPropagation()
                      setLightboxImgUrl(imgUrl)
                      setLightboxFileName(meta?.original_name || meta?.file_name || item.name)
                      setLightboxOpen(true)
                    }}
                    className="h-full w-full cursor-pointer object-cover"
                  />
                </div>
              )
            }

            return (
              <div
                key={`lib-img-${fileId}-${idx}`}
                onClick={() => handleLibraryItemClick(item)}
                className="bg-neutral-10 border-border-1 text-content-dark-3 hover:bg-neutral-10 flex h-[160px] w-[240px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border text-xs shadow-sm transition-colors"
              >
                <Loader2 className="text-content-dark-3 h-5 w-5 animate-spin" />
                <span>Đang tải ảnh...</span>
              </div>
            )
          }
        })}
      </div>
    )
  }

  // Files list layout
  const renderFiles = () => {
    if (files.length === 0) return null

    const gridColsClass =
      files.length === 1 ? 'grid-cols-1' : files.length === 2 ? 'grid-cols-2' : 'grid-cols-3'

    return (
      <div className={`mt-2 grid w-fit gap-2 ${gridColsClass}`}>
        {files.map((fileItem: any, idx: number) => {
          if (fileItem.type === 'attachment') {
            const att = fileItem.data
            const fileId = Number(att.file_id)
            const meta = attachmentsMetadata[fileId]
            const name = meta?.original_name || meta?.file_name || att.name
            const size = meta?.size_bytes || meta?.size || att.size

            return (
              <div
                key={`att-file-${fileId}-${idx}`}
                className="border-border-1 flex w-[240px] items-center justify-between gap-4 rounded-xl border bg-white p-3 shadow-sm"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="bg-red-10 text-action-primary-red-default flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="typo-body-sm-semibold text-content-dark-1 truncate" title={name}>
                      {name}
                    </p>
                    <p className="typo-body-xs-regular text-content-dark-3">
                      {formatNumber((size || 0) / 1024, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}{' '}
                      KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownloadFile(fileId, name)
                  }}
                  className="text-content-dark-3 hover:bg-neutral-20 hover:text-content-dark-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  title="Tải về"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            )
          } else {
            // library item
            const item = fileItem.data
            const isFolder = item.node_type === 'folder'
            const fileId = item.file?.file_id ? Number(item.file.file_id) : null
            const meta = fileId ? attachmentsMetadata[fileId] : null
            const name = meta?.original_name || meta?.file_name || item.name

            return (
              <div
                key={`lib-file-${idx}`}
                onClick={() => handleLibraryItemClick(item)}
                className="border-border-1 hover:bg-neutral-10 flex w-[240px] cursor-pointer items-center justify-between gap-4 rounded-xl border bg-white p-3 shadow-sm transition-colors"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isFolder ? 'bg-orange-10 text-orange-50' : 'bg-red-10 text-action-primary-red-default'}`}
                  >
                    {isFolder ? <Folder className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="typo-body-sm-semibold text-content-dark-1 truncate" title={name}>
                      {name}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {item.file && (
                        <span className="typo-body-xs-regular text-content-dark-3">
                          {formatNumber(item.file.size_bytes / 1024, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}{' '}
                          KB
                        </span>
                      )}
                      <span className="bg-neutral-20 text-content-dark-3 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize">
                        Thư viện: {item.visibility}
                      </span>
                    </div>
                    {item.path && (
                      <p className="typo-body-xs-regular text-content-dark-3 mt-0.5 truncate">
                        Đường dẫn: {item.path}
                      </p>
                    )}
                  </div>
                </div>
                {item.file && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (item.download_url) {
                        const anchor = document.createElement('a')
                        anchor.href = item.download_url
                        anchor.download = item.file!.file_name || ''
                        anchor.target = '_blank'
                        anchor.rel = 'noopener noreferrer'
                        document.body.appendChild(anchor)
                        anchor.click()
                        anchor.remove()
                      } else if (fileId) {
                        handleDownloadFile(fileId, item.file!.file_name)
                      }
                    }}
                    className="text-content-dark-3 hover:bg-neutral-20 hover:text-content-dark-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    title="Tải về"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          }
        })}
      </div>
    )
  }

  // Reactions count bar
  const renderReactions = () => {
    const counts = message.reactions_count || {}
    const activeReactions = REACTION_TYPES.filter((t) => counts[t.key] > 0)
    if (activeReactions.length === 0) return null

    const totalCount = activeReactions.reduce((acc, t) => acc + (counts[t.key] || 0), 0)

    return (
      <button
        onClick={() => setReactionsModalOpen(true)}
        className={`border-border-1 text-content-dark-2 hover:bg-neutral-10 absolute -bottom-2 z-10 flex items-center gap-1 rounded-full border bg-white px-1.5 py-0.5 text-xs font-semibold shadow-sm transition-colors select-none ${
          isSelf ? 'right-3' : 'left-3'
        }`}
      >
        <span className="flex items-center -space-x-1">
          {activeReactions.map((t) => (
            <img
              key={t.key}
              src={t.url}
              alt={t.label}
              className="pointer-events-none h-3.5 w-3.5 shrink-0 object-contain drop-shadow-sm"
            />
          ))}
        </span>
        <span className="text-content-dark-3 ml-0.5 text-[10px] leading-none font-bold">
          {totalCount}
        </span>
      </button>
    )
  }

  // Loading state calculation to prevent layout shift (giật)
  const isMetadataLoading = fileIds.some((id) => !attachmentsMetadata[id])
  const isProfileLoading = !!message.user_id && !senderProfile
  const isImageLoading = images.some((img) => {
    const fileId =
      img.type === 'attachment' ? Number(img.data.file_id) : Number(img.data.file?.file_id)
    const meta = attachmentsMetadata[fileId]
    const signedUrl = imageUrls[fileId] || meta?.signed_url
    return !signedUrl
  })
  const isMessageLoading = !forceShow && (isMetadataLoading || isProfileLoading || isImageLoading)

  if (isMessageLoading) {
    return (
      <div
        className={`flex w-full gap-3 ${hasPreviousFromSameUser ? 'mt-0.5' : 'mt-3'} group ${isSelf ? 'justify-end' : 'justify-start'}`}
      >
        {/* Avatar Placeholder */}
        {!isSelf &&
          (!hasPreviousFromSameUser ? (
            <div className="bg-neutral-20 border-border-1 h-8 w-8 shrink-0 animate-pulse rounded-full border" />
          ) : (
            <div className="w-8 shrink-0" />
          ))}

        {/* Bubble Placeholder */}
        <div className="flex max-w-[70%] flex-col">
          {/* Sender Name Placeholder */}
          {!isSelf && !hasPreviousFromSameUser && (
            <div className="bg-neutral-20 mb-1.5 h-3 w-24 animate-pulse rounded" />
          )}

          {/* Bubble Shape Placeholder */}
          <div
            className={`bg-neutral-20 flex w-[240px] animate-pulse flex-col gap-2 rounded-2xl px-4 py-3 shadow-sm ${
              isSelf ? 'rounded-br-sm' : 'rounded-bl-sm'
            }`}
          >
            <div className="bg-neutral-30 h-4 w-3/4 rounded" />
            <div className="bg-neutral-30 h-3 w-1/2 rounded" />
          </div>
        </div>
      </div>
    )
  }

  const counts = message.reactions_count || {}
  const hasReactions = Object.values(counts).some((c: any) => c > 0)

  return (
    <div
      className={`flex w-full gap-3 ${hasPreviousFromSameUser ? 'mt-0.5' : 'mt-3'} ${hasReactions ? 'mb-2.5' : ''} group ${isSelf ? 'justify-end' : 'justify-start'}`}
    >
      {/* Avatar (only for others) */}
      {!isSelf &&
        (!hasPreviousFromSameUser ? (
          <button
            onClick={handleShowProfile}
            className="bg-neutral-10 border-border-1 h-8 w-8 shrink-0 overflow-hidden rounded-full border transition-all hover:scale-105 active:scale-95"
          >
            {senderProfile?.avatar_url ? (
              <img
                src={senderProfile.avatar_url}
                alt={senderProfile.display_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="bg-neutral-10 text-content-dark-2 flex h-full w-full items-center justify-center text-xs font-semibold">
                {senderProfile?.display_name?.charAt(0) || '?'}
              </div>
            )}
          </button>
        ) : (
          <div className="w-8 shrink-0" />
        ))}

      {/* Bubble Container */}
      <div className="flex max-w-[70%] flex-col">
        {/* Sender Name */}
        {!isSelf && senderProfile && !hasPreviousFromSameUser && (
          <span
            onClick={handleShowProfile}
            className="typo-body-xs-semibold text-content-dark-3 mb-1 cursor-pointer text-left select-none hover:underline"
          >
            {senderProfile.display_name}
          </span>
        )}
        {/* Message body */}
        {/* Message body */}
        <div className={`flex items-end gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="relative">
            <div
              id={`bubble-${message.id}`}
              className={`transition-all ${
                message.revoked_at
                  ? 'bg-neutral-20 border-border-1 text-content-dark-3 rounded-2xl border px-4 py-2 italic shadow-sm'
                  : isImageOnly
                    ? 'border-none bg-transparent p-0 shadow-none'
                    : isSelf
                      ? `bg-data-blue-default rounded-2xl px-4 py-2 text-white shadow-sm ${
                          hasPreviousFromSameUser && hasNextFromSameUser
                            ? 'rounded-l-2xl rounded-r-md'
                            : hasPreviousFromSameUser
                              ? 'rounded-l-2xl rounded-tr-md rounded-br-2xl'
                              : hasNextFromSameUser
                                ? 'rounded-l-2xl rounded-tr-2xl rounded-br-md'
                                : 'rounded-2xl rounded-br-sm'
                        }`
                      : `bg-neutral-30 text-content-dark-1 rounded-2xl px-4 py-2 shadow-sm ${
                          hasPreviousFromSameUser && hasNextFromSameUser
                            ? 'rounded-l-md rounded-r-2xl'
                            : hasPreviousFromSameUser
                              ? 'rounded-tl-md rounded-r-2xl rounded-bl-2xl'
                              : hasNextFromSameUser
                                ? 'rounded-tl-2xl rounded-r-2xl rounded-bl-md'
                                : 'rounded-2xl rounded-bl-sm'
                        }`
              }`}
            >
              {message.revoked_at ? (
                <span>{revokedLabel}</span>
              ) : (
                <>
                  <div className="typo-body-base-regular break-words whitespace-pre-wrap">
                    {renderMessageContent()}
                  </div>
                  {renderImages()}
                  {renderFiles()}
                </>
              )}
            </div>
            {!message.revoked_at && renderReactions()}
          </div>

          {/* Message Time stamp */}
          {!hasNextFromSameUser && (
            <div className="text-content-dark-3 shrink-0 pb-1 text-[10px] select-none">
              {formatMessageTime(message.created_at)}
            </div>
          )}
        </div>
      </div>

      {/* Hover Actions Bar */}
      {!message.revoked_at && (
        <div
          className={`relative flex items-center gap-1 self-center opacity-0 transition-all duration-200 group-hover:opacity-100 ${
            isSelf ? 'order-first mr-2 flex-row-reverse' : 'ml-2 flex-row'
          }`}
        >
          {/* Reaction Button & Picker */}
          <div className="relative">
            <button
              onClick={() => setShowQuickReactions(!showQuickReactions)}
              className="border-border-1 text-content-dark-3 hover:text-content-dark-1 flex h-7 w-7 items-center justify-center rounded-full border bg-white shadow-sm transition-all hover:scale-105 active:scale-95"
              title="Thả cảm xúc"
            >
              <Smile className="h-4 w-4" />
            </button>

            {showQuickReactions && (
              <div className="border-border-1 animate-in fade-in slide-in-from-bottom-1 absolute bottom-8 left-1/2 z-40 flex w-max max-w-[280px] -translate-x-1/2 items-center gap-1 rounded-full border bg-white p-1 shadow-lg duration-150">
                {REACTION_TYPES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => handleQuickReaction(t.key)}
                    className="flex items-center justify-center p-1 transition-transform hover:scale-130"
                    title={t.label}
                  >
                    <img
                      src={t.url}
                      alt={t.label}
                      className="pointer-events-none h-5 w-5 shrink-0 object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* More Actions Button & Dropdown */}
          <div className="relative">
            <button
              onClick={handleMoreClick}
              className="border-border-1 text-content-dark-3 hover:text-content-dark-1 flex h-7 w-7 items-center justify-center rounded-full border bg-white shadow-sm transition-all hover:scale-105 active:scale-95"
              title="Thao tác khác"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {showDropdown && (
              <div className="border-border-1 animate-in fade-in slide-in-from-bottom-1 absolute right-0 bottom-8 z-50 w-44 rounded-xl border bg-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] duration-150">
                {/* Pin Action */}
                {isPinned ? (
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      unpinMessage(message.channel_id, message.id)
                    }}
                    className="text-content-dark-2 hover:bg-neutral-10 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors"
                  >
                    <Pin className="h-3.5 w-3.5 shrink-0 rotate-45 text-amber-600" />
                    <span>Bỏ ghim tin nhắn</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      handlePinMessage()
                    }}
                    className="text-content-dark-2 hover:bg-neutral-10 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors"
                  >
                    <Pin className="text-content-dark-3 h-3.5 w-3.5 shrink-0" />
                    <span>Ghim tin nhắn</span>
                  </button>
                )}

                {/* Revoke Action */}
                {!message.revoked_at && isSelf && (
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      setRevokeConfirmOpen(true)
                    }}
                    className="hover:bg-red-10 border-neutral-10 mt-1 flex w-full items-center gap-2 rounded-lg border-t px-2.5 py-2 pt-1.5 text-left text-xs font-semibold text-red-50 transition-colors"
                  >
                    <Trash className="h-3.5 w-3.5 shrink-0" />
                    <span>Thu hồi tin nhắn</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Drawer (Bottom Sheet) */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="gap-4 rounded-t-2xl border-none bg-white p-4">
          <SheetHeader className="text-left">
            <SheetTitle className="text-content-dark-3 text-sm font-semibold">
              Thao tác tin nhắn
            </SheetTitle>
          </SheetHeader>

          <div className="mt-2 flex flex-col gap-4">
            {/* Quick Reactions */}
            {!message.revoked_at && (
              <div className="bg-neutral-10 border-border-1 grid grid-cols-4 justify-items-center gap-y-4 rounded-xl border py-3 text-center">
                {REACTION_TYPES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      handleQuickReaction(t.key)
                      setDrawerOpen(false)
                    }}
                    className="flex w-12 flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95"
                  >
                    <img
                      src={t.url}
                      alt={t.label}
                      className="pointer-events-none h-6 w-6 shrink-0 object-contain"
                    />
                    <span className="text-content-dark-3 text-[10px] font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Actions list */}
            <div className="border-border-1 divide-border-1 flex flex-col divide-y overflow-hidden rounded-xl border bg-white">
              {/* Pin / Unpin Action */}
              {isPinned ? (
                <button
                  onClick={() => {
                    setDrawerOpen(false)
                    unpinMessage(message.channel_id, message.id)
                  }}
                  className="text-content-dark-1 hover:bg-neutral-20 flex w-full items-center gap-2 px-4 py-3.5 text-left text-sm font-medium"
                >
                  <Pin className="h-4 w-4 shrink-0 rotate-45 text-amber-600" />
                  <span>Bỏ ghim tin nhắn</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setDrawerOpen(false)
                    handlePinMessage()
                  }}
                  className="text-content-dark-1 hover:bg-neutral-20 flex w-full items-center gap-2 px-4 py-3.5 text-left text-sm font-medium"
                >
                  <Pin className="text-content-dark-3 h-4 w-4 shrink-0" />
                  <span>Ghim tin nhắn</span>
                </button>
              )}

              {!message.revoked_at && isSelf && (
                <button
                  onClick={() => {
                    setDrawerOpen(false)
                    setRevokeConfirmOpen(true)
                  }}
                  className="hover:bg-neutral-20 flex w-full items-center gap-2 px-4 py-3.5 text-left text-sm font-medium text-red-50"
                >
                  <Trash className="h-4 w-4 shrink-0" />
                  <span>Thu hồi tin nhắn</span>
                </button>
              )}
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-content-dark-1 hover:bg-neutral-20 w-full px-4 py-3.5 text-left text-sm font-medium"
              >
                Hủy
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ReactionsListModal
        open={reactionsModalOpen}
        onOpenChange={setReactionsModalOpen}
        messageId={message.id}
      />

      <AppDialog
        variant="alert"
        open={revokeConfirmOpen}
        onOpenChange={setRevokeConfirmOpen}
        onCancel={() => setRevokeConfirmOpen(false)}
        onConfirm={handleRevoke}
        title="Thu hồi tin nhắn"
        titleDescription="Bạn có chắc muốn thu hồi tin này?"
        content=""
        confirmText="Thu hồi"
        cancelText="Hủy"
      />

      {/* User Profile Panel (Collapsible Sheet like Group Info) */}
      <Sheet open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <SheetContent
          side="right"
          className="border-border-1 flex h-full w-[300px] max-w-full flex-col justify-between border-l bg-white p-0 [&>button]:hidden"
        >
          <div>
            {/* Header */}
            <div className="border-border-1 mb-6 flex items-center justify-between border-b p-4">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  onClick={() => setProfileDialogOpen(false)}
                  className="text-content-dark-3 hover:bg-neutral-20 hover:text-content-dark-1 rounded-lg p-1 transition-colors"
                  title="Đóng thông tin người dùng"
                >
                  <X className="h-5 w-5" />
                </button>
                <h3 className="typo-h6 text-content-dark-1 truncate">Thông tin người dùng</h3>
              </div>
            </div>

            {/* Sender profile card */}
            {senderProfile ? (
              <div className="flex flex-col items-center gap-4 px-6 py-8">
                <div className="border-border-1 bg-neutral-10 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border shadow-inner">
                  {senderProfile.avatar_url ? (
                    <img
                      src={senderProfile.avatar_url}
                      alt={senderProfile.display_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-content-dark-2 text-3xl font-bold">
                      {senderProfile.display_name?.charAt(0) || '?'}
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-content-dark-1 text-xl font-bold">
                    {senderProfile.display_name || `User #${message.user_id}`}
                  </h3>
                  <p className="text-content-dark-3 mt-1 text-sm">
                    ID người dùng: #{message.user_id}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex animate-pulse flex-col items-center gap-4 px-6 py-8">
                <div className="bg-neutral-20 h-24 w-24 rounded-full" />
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-neutral-20 h-6 w-32 rounded" />
                  <div className="bg-neutral-20 h-4 w-20 rounded" />
                </div>
              </div>
            )}
          </div>

          {/* Actions Footer */}
          {canRemoveOthers && senderProfile && (
            <div className="border-border-1 bg-neutral-5 mt-auto border-t p-4">
              <Button
                variant="secondary-border"
                className="text-action-primary-red-default border-action-primary-red-default hover:bg-action-primary-red-default/10 w-full"
                onClick={async () => {
                  try {
                    await chatWsService.send('remove_member', {
                      channel_id: message.channel_id,
                      user_id: Number(senderProfile.user_id),
                    })
                    setProfileDialogOpen(false)
                    toastService.success(`Đã xóa ${senderProfile.display_name} khỏi nhóm`)
                  } catch (e) {
                    toastService.error('Không thể xóa thành viên')
                  }
                }}
              >
                Xóa khỏi nhóm
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Facebook Messenger-like Image Lightbox */}
      {lightboxOpen && (
        <div
          className="animate-in fade-in fixed inset-0 z-[999] flex flex-col bg-black/90 backdrop-blur-md duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between bg-black/40 px-6 py-4 text-white select-none">
            <span className="max-w-[60%] truncate text-sm font-semibold">{lightboxFileName}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setScale((prev) => Math.max(prev - 0.25, 0.5))
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-white/10 active:scale-95"
                title="Thu nhỏ"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setScale(1)
                  setOffset({ x: 0, y: 0 })
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold transition-all hover:bg-white/10 active:scale-95"
                title="Độ phân giải gốc (100%)"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setScale((prev) => Math.min(prev + 0.25, 4))
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-white/10 active:scale-95"
                title="Phóng to"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(lightboxImgUrl, '_blank')
                }}
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full border-l border-white/20 pl-3 transition-all hover:bg-white/10 active:scale-95"
                title="Tải xuống"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => setLightboxOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-white/10 active:scale-95"
                title="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Large Image View */}
          <div
            className="relative flex flex-1 cursor-default items-center justify-center overflow-hidden p-4 select-none"
            onWheel={(e) => {
              e.stopPropagation()
              const zoomFactor = 0.15
              let newScale = scale + (e.deltaY < 0 ? zoomFactor : -zoomFactor)
              newScale = Math.min(Math.max(newScale, 0.5), 4)
              setScale(newScale)
              if (newScale <= 1) {
                setOffset({ x: 0, y: 0 })
              }
            }}
            onMouseDown={(e) => {
              if (scale <= 1) return
              e.preventDefault()
              e.stopPropagation()
              setIsDragging(true)
              setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
            }}
            onMouseMove={(e) => {
              if (!isDragging) return
              e.preventDefault()
              e.stopPropagation()
              setOffset({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
              })
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            <img
              src={lightboxImgUrl}
              alt={lightboxFileName}
              onDoubleClick={(e) => {
                e.stopPropagation()
                if (scale > 1) {
                  setScale(1)
                  setOffset({ x: 0, y: 0 })
                } else {
                  setScale(2)
                  setOffset({ x: 0, y: 0 })
                }
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
              }}
              className="animate-in zoom-in-95 max-h-[85vh] max-w-[90vw] origin-center rounded object-contain shadow-2xl transition-transform duration-75 duration-200 ease-out select-none"
            />
          </div>
        </div>
      )}
      <RequestAccessDialog
        open={requestAccessDialogOpen}
        onOpenChange={setRequestAccessDialogOpen}
        itemId={selectedRequestAccessItemId}
        itemName={selectedRequestAccessItemName}
        ownerName={selectedRequestAccessItemOwner}
      />
    </div>
  )
}
