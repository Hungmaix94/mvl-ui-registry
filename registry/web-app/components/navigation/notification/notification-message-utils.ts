import type { Notification } from '@/services/notification-service'
import { APP_PATH } from '@/routes'

/**
 * Verb của notification "hợp đồng sắp hết hạn".
 * Message của loại này chứa placeholder dạng `{{0}}`, `{{1}}`... map vào `extra_data.contracts`.
 */
export const CONTRACT_EXPIRING_SOON_VERB = 'contract.expiring_soon'

/** Một dòng hợp đồng trong `extra_data.contracts` của notification hết hạn HĐ. */
export type NotificationContractEntry = {
  placeholder: string
  employee_id?: string | null
  employee_name?: string | null
  contract_id?: string | null
  contract_code?: string | null
  expiration_date?: string | null
}

/** Token sau khi tách message theo placeholder. */
export type NotificationMessageToken =
  | { type: 'text'; value: string }
  | { type: 'contract-link'; value: string; contractId: number }

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function toContractEntry(value: unknown): NotificationContractEntry | null {
  if (!isObject(value)) {
    return null
  }
  const placeholder = value.placeholder
  if (typeof placeholder !== 'string' || placeholder.length === 0) {
    return null
  }
  return {
    placeholder,
    employee_id: toStringOrNull(value.employee_id),
    employee_name: toStringOrNull(value.employee_name),
    contract_id: toStringOrNull(value.contract_id),
    contract_code: toStringOrNull(value.contract_code),
    expiration_date: toStringOrNull(value.expiration_date),
  }
}

/** Lấy danh sách hợp đồng từ `extra_data` (an toàn, trả `[]` khi shape không khớp). */
export function getNotificationContractEntries(
  notification: Notification
): NotificationContractEntry[] {
  const extraData = notification.extra_data
  if (!isObject(extraData)) {
    return []
  }
  const contracts = extraData.contracts
  if (!Array.isArray(contracts)) {
    return []
  }
  return contracts
    .map(toContractEntry)
    .filter((entry): entry is NotificationContractEntry => entry != null)
}

function parseContractId(rawId: string | null | undefined): number | null {
  if (rawId == null) {
    return null
  }
  const parsed = Number(rawId)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }
  return parsed
}

/** Đường dẫn màn chi tiết hợp đồng. */
export function getContractDetailPath(contractId: number): string {
  return APP_PATH.CONTRACT_MANAGE_DETAIL.replace(':id', String(contractId))
}

/**
 * Tách `message` thành các token `text` + `contract-link` dựa trên placeholder `{{n}}`
 * map vào `extra_data.contracts`.
 *
 * - Không có message → `[]`.
 * - Không có placeholder hoặc không có contracts → 1 token `text` chứa toàn bộ message.
 * - Placeholder lệch dữ liệu (thiếu contract_id/tên) → giữ tên nhân sự dạng text, hoặc giữ
 *   nguyên placeholder gốc để lộ lỗi dữ liệu thay vì ẩn đi.
 */
export function getNotificationMessageTokens(
  notification: Notification
): NotificationMessageToken[] {
  const message = notification.message ?? ''
  if (!message) {
    return []
  }

  const entries = getNotificationContractEntries(notification)
  if (entries.length === 0) {
    return [{ type: 'text', value: message }]
  }

  const entryByPlaceholder = new Map(entries.map((entry) => [entry.placeholder, entry]))
  const placeholderPattern = /\{\{\d+\}\}/g
  const tokens: NotificationMessageToken[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = placeholderPattern.exec(message)) !== null) {
    const placeholder = match[0]

    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: message.slice(lastIndex, match.index) })
    }

    const entry = entryByPlaceholder.get(placeholder)
    const contractId = parseContractId(entry?.contract_id)
    const label = entry?.employee_name?.trim()

    if (entry && label && contractId != null) {
      tokens.push({ type: 'contract-link', value: label, contractId })
    } else {
      tokens.push({ type: 'text', value: label || placeholder })
    }

    lastIndex = match.index + placeholder.length
  }

  if (lastIndex < message.length) {
    tokens.push({ type: 'text', value: message.slice(lastIndex) })
  }

  return tokens
}
