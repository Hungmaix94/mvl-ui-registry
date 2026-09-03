import { getStoredToken } from '@/utils/auth'
import { getChatWsUrl } from '@/config/environment'
import { useChatStore } from '../store/chat-store'
import { shouldPlayMessageSound } from '../utils/message-notify'

export interface WsRequest {
  action: string
  request_id: string
  payload: any
}

export interface WsResponse {
  type: 'callback' | 'event' | 'force_disconnect'
  request_id?: string
  status?: 'ok' | 'error'
  event?: string
  data?: any
  code?: number
  reason?: string
  error?: {
    code: string
    message: string
    details?: any
  }
}

class ChatWsService {
  private ws: WebSocket | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000
  private requestMap = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >()
  private sendQueue: string[] = []

  private getWsUrl(): string {
    return getChatWsUrl()
  }

  public connect() {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return
    }

    const token = getStoredToken()
    if (!token) {
      console.warn('No JWT token found, delaying WebSocket connection.')
      useChatStore.getState().setConnectionStatus('disconnected')
      return
    }

    useChatStore.getState().setConnectionStatus('connecting')
    const wsUrl = this.getWsUrl()

    try {
      // Connect with JWT via query parameter to avoid reverse proxy/CDN subprotocol handshake issues
      const wsUrlWithToken = `${wsUrl}${wsUrl.includes('?') ? '&' : '?'}token=${token}`
      this.ws = new WebSocket(wsUrlWithToken)
      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      this.ws.onerror = this.handleError.bind(this)
    } catch (e) {
      console.error('Failed to create WebSocket instance', e)
      this.scheduleReconnect()
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    if (this.ws) {
      this.ws.close(1000, 'User logged out')
      this.ws = null
    }
    this.rejectAllPending('User disconnected')
    useChatStore.getState().setConnectionStatus('disconnected')
  }

  private handleOpen() {
    console.log('Chat WebSocket connected.')
    this.reconnectDelay = 1000 // Reset backoff
    useChatStore.getState().setConnectionStatus('connected')

    // Flush send queue
    while (this.sendQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const msg = this.sendQueue.shift()
      if (msg) this.ws.send(msg)
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const response: WsResponse = JSON.parse(event.data)

      if (response.type === 'callback') {
        const reqId = response.request_id
        if (reqId && this.requestMap.has(reqId)) {
          const { resolve, reject } = this.requestMap.get(reqId)!
          this.requestMap.delete(reqId)

          if (response.status === 'ok') {
            resolve(response.data)
          } else {
            reject(
              response.error || { code: 'unknown_error', message: 'Lỗi không xác định từ server' }
            )
          }
        }
      } else if (response.type === 'event') {
        this.dispatchEvent(response.event!, response.data)
      } else if (response.type === 'force_disconnect') {
        console.warn('Received force disconnect from Chat server:', response.reason)
        this.disconnect()
        // If code is 4001, token is revoked - clear auth data and redirect
        if (response.code === 4001) {
          import('@/utils/auth').then(({ clearAuthData }) => {
            clearAuthData()
            window.location.href = '/login'
          })
        }
      }
    } catch (e) {
      console.error('Error parsing WS message', e)
    }
  }

  private handleClose(event: CloseEvent) {
    console.log(`Chat WebSocket closed: ${event.code} ${event.reason}`)
    useChatStore.getState().setConnectionStatus('disconnected')

    // Redirect if server revoked token
    if (event.code === 4001) {
      import('@/utils/auth').then(({ clearAuthData }) => {
        clearAuthData()
        window.location.href = '/login'
      })
      return
    }

    this.scheduleReconnect()
  }

  private handleError(event: Event) {
    console.error('Chat WebSocket error observed:', event)
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null
      console.log(`Reconnecting Chat WebSocket (delay: ${this.reconnectDelay}ms)`)
      this.connect()
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
    }, this.reconnectDelay)
  }

  private dispatchEvent(event: string, data: any) {
    const store = useChatStore.getState()
    switch (event) {
      case 'connection.ready':
        if (data.channels) {
          store.setChannels(data.channels)
        }
        break
      case 'message.created': {
        store.addMessage(data.channel_id, data)
        const currentUserId = store.currentUserId
        const isFromOtherUser =
          data.user_id && currentUserId && Number(data.user_id) !== Number(currentUserId)
        // US-222 (CR 86eygp5xz) — chuông cục bộ chỉ kêu cho mention hoặc channel
        // đã opt-in nhận tin thường (không còn kêu cho mọi tin nhắn nữa).
        const currentUserMembership = currentUserId
          ? store.members[data.channel_id]?.find((m) => Number(m.user_id) === Number(currentUserId))
          : undefined
        if (
          isFromOtherUser &&
          currentUserId &&
          shouldPlayMessageSound(data, currentUserId, currentUserMembership)
        ) {
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav')
            audio.volume = 0.5
            audio.play().catch(() => {
              // Ignore play-permission errors in case the browser hasn't had user interaction yet
            })
          } catch (e) {
            console.error('Failed to play message sound', e)
          }
        }
        break
      }
      case 'message.revoked':
        store.updateMessageRevokedStatus(
          data.channel_id,
          data.message_id,
          data.revoked_at,
          data.revoked_by_user_id
        )
        break
      case 'member.added':
        store.addMember(data.channel_id, {
          user_id: Number(data.user_id),
          channel_id: data.channel_id,
          role: data.role,
          is_muted: false,
          notify_new_messages: false,
          last_read_message_id: null,
          joined_at: new Date().toISOString(),
        })
        break
      case 'member.removed':
      case 'channel.left':
        store.removeMember(data.channel_id, Number(data.user_id))
        break
      case 'member.role_changed':
        store.updateMemberRole(data.channel_id, Number(data.user_id), data.new_role)
        break
      case 'channel.created':
        if (data) {
          data.owner_user_id = Number(data.owner_user_id ?? data.owner_id)
        }
        store.addChannel(data)
        break
      case 'channel.deleted':
        store.removeChannel(data.channel_id)
        break
      case 'channel.disabled':
        store.updateChannelState(data.channel_id, 'disabled')
        break
      case 'channel.enabled':
        store.updateChannelState(data.channel_id, 'active')
        break
      case 'channel.write_policy_changed':
        store.updateChannelWritePolicy(data.channel_id, data.write_policy)
        break
      case 'reaction.added':
        store.addMessageReaction(
          data.channel_id,
          data.message_id,
          data.user_id,
          data.type,
          data.reactions_count
        )
        break
      case 'reaction.removed':
        store.removeMessageReaction(
          data.channel_id,
          data.message_id,
          data.user_id,
          data.type,
          data.reactions_count
        )
        break
      case 'read_receipt':
        store.updateReadReceipt(data.channel_id, data.user_id, data.last_read_message_id)
        break
      case 'member.muted':
        store.updateMemberMuteStatus(
          data.channel_id,
          useChatStore.getState().currentUserId || 0,
          true
        )
        break
      case 'member.unmuted':
        store.updateMemberMuteStatus(
          data.channel_id,
          useChatStore.getState().currentUserId || 0,
          false
        )
        break
      case 'channel.notify_preference_changed':
        // Chỉ push tới các device KHÁC của cùng user (multi-device sync) — không
        // kèm user_id trong payload vì luôn ngầm định là chính mình.
        store.updateMemberNotifyPreference(
          data.channel_id,
          useChatStore.getState().currentUserId || 0,
          data.notify_new_messages
        )
        break
      default:
        console.log(`Unhandled WS event: ${event}`, data)
    }
  }

  private rejectAllPending(reason: string) {
    this.requestMap.forEach(({ reject }) => {
      try {
        reject(new Error(reason))
      } catch (e) {
        console.error(e)
      }
    })
    this.requestMap.clear()
    this.sendQueue = []
  }

  public async send<T = any>(action: string, payload: any): Promise<T> {
    const request_id = crypto.randomUUID()
    const request: WsRequest = { action, request_id, payload }
    const messageStr = JSON.stringify(request)

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.requestMap.has(request_id)) {
          this.requestMap.delete(request_id)
          reject(new Error(`WebSocket request timeout for action: ${action}`))
        }
      }, 10000)

      this.requestMap.set(request_id, {
        resolve: (val) => {
          clearTimeout(timeout)
          resolve(val)
        },
        reject: (err) => {
          clearTimeout(timeout)
          reject(err)
        },
      })

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(messageStr)
      } else {
        // Enqueue if not connected yet
        this.sendQueue.push(messageStr)
      }
    })
  }
}

export const chatWsService = new ChatWsService()
