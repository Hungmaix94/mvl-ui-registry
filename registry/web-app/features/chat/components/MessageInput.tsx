import React, { useState, useRef, useMemo, useEffect } from 'react'
import { chatWsService } from '../services/chat-ws-service'
import { getFileService } from '@/services/file-service'
import { useChatStore } from '../store/chat-store'
import { Send, Paperclip, Smile, X, FileText } from 'lucide-react'
import toastService from '@/services/toast-service'
import { getChatApiBaseUrl } from '@/config/environment'
import { getStoredToken } from '@/utils/auth'
import { removeVietnameseDiacritics } from '@/utils/string-utils'

interface MessageInputProps {
  channelId: string
  disabled?: boolean
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  fileId?: number // confirmed ID from ERP
  error?: string
}

const POPULAR_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🎉']

export const MessageInput: React.FC<MessageInputProps> = ({ channelId, disabled }) => {
  const members = useChatStore((state) => state.members[channelId] || [])
  const cacheUserProfile = useChatStore((state) => state.cacheUserProfile)

  const userProfiles = useChatStore((state) => state.userProfiles)

  const [text, setText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [attachments, setAttachments] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // Mentions state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(-1)
  const [mentionPosition, setMentionPosition] = useState(0)
  const [apiUsers, setApiUsers] = useState<any[]>([])
  const [insertedMentions, setInsertedMentions] = useState<Record<string, string | number>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Click outside to close mention autocomplete popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mentionQuery !== null &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setMentionQuery(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mentionQuery])

  // Fetch users from API when mentionQuery changes
  useEffect(() => {
    const query = mentionQuery?.trim()
    if (!query) {
      setApiUsers([])
      return
    }

    const handler = setTimeout(async () => {
      try {
        const chatBaseUrl = getChatApiBaseUrl()
        const response = await fetch(
          `${chatBaseUrl}/api/users/?search=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${getStoredToken()}`,
            },
          }
        )
        if (response.ok) {
          const data = await response.json()
          setApiUsers(data.users || [])
        }
      } catch (err) {
        console.error('Failed to search mention users:', err)
      }
    }, 200)

    return () => clearTimeout(handler)
  }, [mentionQuery])

  // Autocomplete members list from API search
  const filteredMembers = useMemo(() => {
    if (mentionQuery === null) return []

    const specialItems = [
      {
        user_id: 'all' as any,
        profile: {
          display_name: 'Tất cả',
          avatar_url: '',
          is_system: true,
          subtitle: 'Nhắc tên tất cả mọi người',
        },
      },
      {
        user_id: 1,
        profile: {
          display_name: 'admin',
          avatar_url: '',
          is_system: true,
          subtitle: 'Nhắc tên quản trị viên',
        },
      },
      {
        user_id: 'here' as any,
        profile: {
          display_name: 'here',
          avatar_url: '',
          is_system: true,
          subtitle: 'Nhắc tên thành viên online',
        },
      },
    ]

    const normalize = (s: string) => removeVietnameseDiacritics(s.toLowerCase())
    const query = normalize(mentionQuery.trim())
    const matchingSpecials = specialItems.filter(
      (item) =>
        normalize(item.profile.display_name).includes(query) ||
        (item.user_id === 'all' && 'all'.includes(query)) ||
        (item.user_id === 'here' && 'here'.includes(query))
    )

    const channelMembers = members.map((m) => {
      const profile = userProfiles[m.user_id]
      return {
        user_id: Number(m.user_id),
        profile: {
          display_name: profile?.display_name || `User #${m.user_id}`,
          avatar_url: profile?.avatar_url,
          is_system: false,
          subtitle: `ID: #${m.user_id}`,
        },
      }
    })

    const seen = new Set<string | number>(matchingSpecials.map((item) => item.user_id))

    if (query === '') {
      // Instant list: show special system items first, then channel members
      const filteredChannelMembers = channelMembers.filter((m) => {
        if (seen.has(m.user_id)) return false
        seen.add(m.user_id)
        return true
      })
      return [...matchingSpecials, ...filteredChannelMembers.slice(0, 5)]
    }

    // Match channel members locally (accent-insensitive) so mention works
    // even when the users search API is slow or returns nothing
    const matchingMembers = channelMembers.filter((m) =>
      normalize(m.profile.display_name).includes(query)
    )

    const apiMapped = apiUsers.map((u) => {
      const uId = u.id || u.user_id
      return {
        user_id: Number(uId),
        profile: {
          display_name: u.display_name || u.fullname || u.username || `User #${uId}`,
          avatar_url: u.avatar_url,
          is_system: false,
          subtitle: `ID: #${uId}`,
        },
      }
    })

    // Merge: channel members first, then API results, dedupe by user_id
    const merged = [...matchingMembers, ...apiMapped].filter((m) => {
      if (seen.has(m.user_id)) return false
      seen.add(m.user_id)
      return true
    })

    return [...matchingSpecials, ...merged.slice(0, 8)]
  }, [apiUsers, mentionQuery, members, userProfiles])

  // Handle keypresses for autocomplete navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((prev) => (prev + 1) % filteredMembers.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filteredMembers[mentionIndex >= 0 ? mentionIndex : 0]
        if (selected) {
          selectMention(selected.user_id)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setMentionQuery(null)
      }
    } else {
      if (e.key === 'Backspace') {
        const textarea = textareaRef.current
        if (textarea) {
          const pos = textarea.selectionStart
          const textBeforeCaret = text.substring(0, pos)
          const textAfterCaret = text.substring(textarea.selectionEnd)

          // Find if there is an active mention right before the cursor
          const matchingMention = Object.keys(insertedMentions).find((mentionText) => {
            return (
              textBeforeCaret.endsWith(mentionText + ' ') || textBeforeCaret.endsWith(mentionText)
            )
          })

          if (matchingMention) {
            e.preventDefault()
            const isWithSpace = textBeforeCaret.endsWith(matchingMention + ' ')
            const mentionLength = matchingMention.length + (isWithSpace ? 1 : 0)
            const newText =
              textBeforeCaret.substring(0, textBeforeCaret.length - mentionLength) + textAfterCaret
            setText(newText)

            const newCursorPos = pos - mentionLength
            setTimeout(() => {
              textarea.focus()
              textarea.setSelectionRange(newCursorPos, newCursorPos)
            }, 0)
            return
          }
        }
      }

      if (e.key === 'Enter') {
        if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) {
          e.preventDefault()
          const textarea = e.currentTarget
          const start = textarea.selectionStart
          const end = textarea.selectionEnd
          const currentValue = textarea.value
          const newValue = currentValue.substring(0, start) + '\n' + currentValue.substring(end)
          setText(newValue)
          const newCursorPos = start + 1
          setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(newCursorPos, newCursorPos)
          }, 0)
        } else {
          e.preventDefault()
          handleSend()
        }
      }
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setText(val)

    // Detect mention trigger `@`
    const caretPos = e.target.selectionStart
    const textBeforeCaret = val.substring(0, caretPos)
    const lastAtPos = textBeforeCaret.lastIndexOf('@')

    if (lastAtPos >= 0) {
      const textAfterAt = textBeforeCaret.substring(lastAtPos + 1)
      const mentionCandidate = textBeforeCaret.substring(lastAtPos)

      // Don't re-open the popup when caret is right after an already-inserted mention
      const isAfterInsertedMention = Object.keys(insertedMentions).some(
        (m) => mentionCandidate === m || mentionCandidate.startsWith(m + ' ')
      )

      // Allow spaces in the query so full names ("Hà Đỗ") still get suggestions.
      // Bail out on newline, or when the text is too long to plausibly be a name.
      const isPlausibleName =
        !textAfterAt.includes('\n') &&
        textAfterAt.length <= 32 &&
        textAfterAt.split(' ').filter(Boolean).length <= 4 &&
        !textAfterAt.endsWith('  ') // double space = user moved on to normal text

      if (!isAfterInsertedMention && isPlausibleName) {
        setMentionQuery(textAfterAt)
        setMentionPosition(lastAtPos)
        setMentionIndex(0)
        return
      }
    }
    setMentionQuery(null)
  }

  const selectMention = (userId: number | string) => {
    if (mentionPosition === null) return
    const selected = filteredMembers.find((m) => String(m.user_id) === String(userId))
    if (!selected) return

    const displayName = selected.profile.display_name
    const mentionText = `@${displayName}`

    // Store in our mentions map
    setInsertedMentions((prev) => ({
      ...prev,
      [mentionText]: userId,
    }))

    const textBeforeAt = text.substring(0, mentionPosition)
    const textAfterCaret = text.substring(textareaRef.current?.selectionStart || 0)
    const newText = `${textBeforeAt}${mentionText} ${textAfterCaret}`
    setText(newText)
    setMentionQuery(null)

    const newCursorPos = textBeforeAt.length + mentionText.length + 1

    // Cache user profile in the store immediately so it displays username without delay (only for real user IDs)
    if (typeof userId === 'number') {
      cacheUserProfile(userId, {
        user_id: userId,
        display_name: selected.profile.display_name,
        avatar_url: selected.profile.avatar_url,
      })
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 50)
  }

  // Upload file pipeline: presign -> S3 upload -> confirm
  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return

    const newAttachments = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
    }))

    if (attachments.length + newAttachments.length > 10) {
      toastService.error('Chỉ được upload tối đa 10 tệp đính kèm')
      return
    }

    setAttachments((prev) => [...prev, ...newAttachments])

    newAttachments.forEach(async (att) => {
      try {
        // Step 1: Presign
        const presignRes = await getFileService().presignFile({
          file_name: att.file.name,
          file_type: att.file.type,
          purpose: 'chat_attachment',
        })

        if (!presignRes) throw new Error('Presign URL generation failed')

        const { upload_url, file_token } = presignRes

        // Step 2: PUT S3
        const s3Res = await fetch(upload_url, {
          method: 'PUT',
          body: att.file,
          headers: { 'Content-Type': att.file.type },
        })

        if (!s3Res.ok) throw new Error('S3 upload failed')

        // Step 3: Confirm file
        const confirmRes = await getFileService().confirmFiles({
          files: [
            {
              file_token,
              purpose: 'chat_attachment',
            },
          ],
        })

        const confirmedFiles = confirmRes?.confirmed_files || []
        if (confirmedFiles.length === 0) {
          throw new Error('File confirmation failed')
        }

        const confirmedFile = confirmedFiles[0]
        if (!confirmedFile?.id) {
          throw new Error('Confirmed file ID is missing')
        }

        setAttachments((prev) =>
          prev.map((item) =>
            item.id === att.id ? { ...item, progress: 100, fileId: confirmedFile.id } : item
          )
        )
      } catch (e: any) {
        console.error('File upload failed', e)
        setAttachments((prev) =>
          prev.map((item) =>
            item.id === att.id ? { ...item, error: e.message || 'Lỗi tải tệp' } : item
          )
        )
        toastService.error(`Không thể tải tệp ${att.file.name}: ${e.message || ''}`)
      }
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    uploadFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          let finalFile = file
          if (file.name === 'image.png' || file.name === 'blob' || !file.name) {
            const timestamp = new Date().getTime()
            finalFile = new File([file], `screenshot-${timestamp}.png`, {
              type: file.type || 'image/png',
            })
          }
          files.push(finalFile)
        }
      }
    }

    if (files.length > 0) {
      uploadFiles(files)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length > 0) {
      uploadFiles(files)
      return
    }

    const uriList = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('URL')
    const textData = e.dataTransfer.getData('text/plain')
    let droppedUrl = uriList?.trim() || ''

    if (
      !droppedUrl &&
      textData &&
      (textData.startsWith('http://') || textData.startsWith('https://'))
    ) {
      droppedUrl = textData.trim()
    }

    const appendTextAtCaret = (insertedText: string) => {
      const textarea = textareaRef.current
      if (textarea) {
        const pos = textarea.selectionStart
        const textBeforeCaret = text.substring(0, pos)
        const textAfterCaret = text.substring(textarea.selectionEnd)
        const newText = textBeforeCaret + insertedText + textAfterCaret
        setText(newText)
        const newCursorPos = pos + insertedText.length
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(newCursorPos, newCursorPos)
        }, 0)
      } else {
        setText((prev) => prev + insertedText)
      }
    }

    if (droppedUrl) {
      try {
        let filename = 'dropped_image.png'
        try {
          const urlObj = new URL(droppedUrl)
          const pathname = urlObj.pathname
          const lastSegment = pathname.substring(pathname.lastIndexOf('/') + 1)
          if (lastSegment && lastSegment.includes('.')) {
            filename = lastSegment
          }
        } catch {}

        // Timeout fetch request after 5 seconds to prevent hanging
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(droppedUrl, { signal: controller.signal })
        clearTimeout(timeoutId)

        if (!response.ok) throw new Error('Fetch failed')
        const blob = await response.blob()

        // Validate that the fetched blob is an image
        const isImage = blob.type && blob.type.startsWith('image/')
        if (!isImage) {
          throw new Error('Not an image file')
        }

        // Validate size (max 20MB)
        const MAX_SIZE = 20 * 1024 * 1024
        if (blob.size > MAX_SIZE) {
          toastService.error('Kích thước ảnh quá lớn, tối đa 20MB')
          throw new Error('Image too large')
        }

        const file = new File([blob], filename, { type: blob.type })
        uploadFiles([file])
      } catch (err: any) {
        console.warn('Failed to fetch dropped URL, falling back to text:', err)
        appendTextAtCaret(droppedUrl)
      }
      return
    }

    if (textData) {
      appendTextAtCaret(textData)
    }
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const handleSend = async () => {
    const trimmedText = text.trim()
    const uploadedIds = attachments
      .filter((a) => a.fileId)
      .map((a) => ({
        file_id: String(a.fileId!),
        file_type: a.file.type.startsWith('image/') ? 'image' : 'document',
      }))

    if (!trimmedText && uploadedIds.length === 0) return
    if (attachments.some((a) => !a.fileId && !a.error)) {
      toastService.warning('Vui lòng đợi các tệp tải lên hoàn tất')
      return
    }

    // Replace `@Name` with `<@userId>` in message content before sending
    let processedText = trimmedText
    Object.entries(insertedMentions).forEach(([mentionText, userId]) => {
      const escaped = mentionText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
      const regex = new RegExp('(?<!<)' + escaped, 'gi')
      const placeholder =
        userId === 'all' ? '<!all>' : userId === 'here' ? '<!here>' : `<@${userId}>`
      processedText = processedText.replace(regex, placeholder)
    })

    // Also replace manual mentions of channel members if they typed them directly
    members.forEach((m) => {
      const profile = userProfiles[Number(m.user_id)]
      if (profile && profile.display_name) {
        const escaped = `@${profile.display_name}`.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
        const regex = new RegExp('(?<!<)' + escaped, 'gi')
        processedText = processedText.replace(regex, `<@${m.user_id}>`)
      }
    })

    // Also replace manual specials if user typed them directly
    processedText = processedText
      .replace(/(?<!<)@Tất cả/gi, '<!all>')
      .replace(/(?<!<)@all/gi, '<!all>')
      .replace(/(?<!<)@admin/gi, '<@1>')
      .replace(/(?<!<)@here/gi, '<!here>')

    const mentions: any[] = []
    let match
    const cleanMentionsRegex = /<(?:@|!)(all|admin|here|\d+)>/g
    while ((match = cleanMentionsRegex.exec(processedText)) !== null) {
      const val = match[1]
      if (val === 'all') {
        mentions.push({ type: 'all' })
      } else if (val === 'admin') {
        mentions.push({ type: 'admin' })
      } else if (val === 'here') {
        mentions.push({ type: 'here' })
      } else {
        const uid = parseInt(val)
        mentions.push({ type: 'user', user_id: uid })
      }
    }

    try {
      const payload: any = {
        channel_id: channelId,
        client_message_id: crypto.randomUUID(),
      }

      if (processedText) payload.content = processedText
      if (mentions.length > 0) {
        payload.metadata = { ...payload.metadata, mentions }
      }
      if (uploadedIds.length > 0) {
        payload.metadata = { ...payload.metadata, attachments: uploadedIds }
      }

      // Clear input optimistically
      setText('')
      setAttachments([])
      setInsertedMentions({})

      await chatWsService.send('send_message', payload)
    } catch (e: any) {
      console.error('Failed to send message', e)
      toastService.error(`Gửi tin nhắn thất bại: ${e.message || 'Lỗi mạng'}`)
    }
  }

  const handleEmojiClick = (emoji: string) => {
    setText((prev) => prev + emoji)
    setShowEmojiPicker(false)
    textareaRef.current?.focus()
  }

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="border-border-1 relative border-t bg-white p-3"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="bg-action-primary-red-default/5 border-action-primary-red-default animate-in fade-in pointer-events-none absolute inset-0 z-30 m-2 flex items-center justify-center rounded-xl border-2 border-dashed duration-200">
          <p className="text-action-primary-red-default text-sm font-semibold">
            Thả các tệp tin tại đây để tải lên
          </p>
        </div>
      )}
      {/* Autocomplete Mentions Box */}
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div className="border-border-1 animate-in fade-in slide-in-from-bottom-2 absolute bottom-full left-4 z-50 mb-3 max-h-64 w-72 overflow-y-auto rounded-2xl border bg-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.08)] duration-150">
          <div className="text-content-dark-3 border-neutral-10 mb-1.5 flex items-center justify-between border-b px-3 py-2 text-[11px] font-semibold">
            <span>Gợi ý thành viên</span>
            <span className="text-content-dark-3 text-[10px] font-normal">
              ↑↓ để duyệt, enter để chọn
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {filteredMembers.map((m, index) => {
              const isSelected = index === mentionIndex
              return (
                <button
                  key={m.user_id}
                  onClick={() => selectMention(m.user_id)}
                  className={`relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-left transition-all duration-150 ${
                    isSelected
                      ? 'bg-neutral-10 text-content-dark-1 font-semibold'
                      : 'hover:bg-neutral-5 text-content-dark-2'
                  }`}
                >
                  {/* Left Accent Bar for Selected Item */}
                  {isSelected && (
                    <div className="bg-action-primary-red-default absolute top-2 bottom-2 left-0 w-1 rounded-r" />
                  )}

                  {/* Avatar */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border text-xs font-bold ${
                      isSelected
                        ? 'border-action-primary-red-default/45 ring-action-primary-red-default/10 ring-1'
                        : 'border-neutral-20'
                    }`}
                  >
                    {m.profile?.avatar_url ? (
                      <img
                        src={m.profile.avatar_url}
                        alt={m.profile.display_name}
                        className="h-full w-full object-cover"
                      />
                    ) : m.profile?.is_system ? (
                      <div
                        className={`flex h-full w-full items-center justify-center text-[10px] font-bold text-white select-none ${
                          m.user_id === 'all'
                            ? 'bg-blue-500'
                            : m.user_id === 'admin' || m.user_id === 1
                              ? 'bg-red-500'
                              : 'bg-emerald-500'
                        }`}
                      >
                        {m.profile.display_name === 'Tất cả'
                          ? 'ALL'
                          : m.profile.display_name === 'admin' || m.profile.display_name === 'ADM'
                            ? 'ADM'
                            : 'HER'}
                      </div>
                    ) : (
                      <div className="bg-neutral-15 text-content-dark-2 flex h-full w-full items-center justify-center">
                        {m.profile?.display_name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>

                  {/* Name and ID Info */}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">
                      {m.profile?.display_name || `User #${m.user_id}`}
                    </span>
                    <span className="text-content-dark-3 truncate text-[10px]">
                      {m.profile?.subtitle || `ID: #${m.user_id}`}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Attachments preview row */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="border-border-1 bg-neutral-10 text-content-dark-1 flex max-w-[200px] items-center gap-2 rounded-lg border px-2 py-1.5 text-xs"
            >
              <FileText className="h-4 w-4 shrink-0 text-blue-500" />
              <span className="min-w-0 truncate" title={att.file.name}>
                {att.file.name}
              </span>
              {!att.fileId && !att.error ? (
                <div className="border-action-primary-red-default h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-t-transparent" />
              ) : (
                <button
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="text-content-dark-3 hover:text-data-red-default shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rich Input Actions Bar */}
      <div className="border-border-1 bg-neutral-10 focus-within:border-action-primary-red-default flex items-end gap-2 rounded-xl border p-2 transition-all focus-within:bg-white">
        {/* Paperclip */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="text-content-dark-3 hover:bg-neutral-20 hover:text-content-dark-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          title="Đính kèm tài liệu (Tối đa 10 file)"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Emoji Panel Trigger */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className="text-content-dark-3 hover:bg-neutral-20 hover:text-content-dark-1 flex h-9 w-9 items-center justify-center rounded-lg"
            title="Biểu cảm"
          >
            <Smile className="h-5 w-5" />
          </button>

          {showEmojiPicker && (
            <div className="border-border-1 absolute bottom-full left-0 z-50 mb-2 flex gap-1 rounded-xl border bg-white p-2 shadow-xl">
              {POPULAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="flex h-8 w-8 items-center justify-center rounded text-lg transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Nhập nội dung tin nhắn... (@ để nhắc tên, Enter gửi)"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={disabled}
          className="typo-body-base-regular text-content-dark-1 max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 leading-normal outline-none"
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && attachments.length === 0)}
          className="bg-action-primary-red-default hover:bg-action-primary-red-hover flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition-colors disabled:opacity-50"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  )
}
