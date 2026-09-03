import type { RateSpec } from '@/utils/rate-spec'

export const F2_CATEGORIES = [
  { key: 'f2_commission', label: 'Hoa hồng sàn liên kết', hasVat: true },
  { key: 'f2_bonus', label: 'Thưởng từ CĐT', hasVat: true },
  { key: 'f2_inventory_hold', label: 'Tỷ lệ giữ giỏ hàng', hasVat: false },
  // "Thưởng cho sàn LK từ MV" (mv_bonus_to_f2) ẩn khỏi UI cấu hình F2 (ClickUp 86eycwqq1).
  // Field vẫn còn ở schema BE + form (giữ giá trị cũ khi sửa) — chỉ không hiển thị/nhập nữa.
] as const

export type F2CreateParams = {
  cloneId?: number | string
  source?: string
  exchangeId?: number
  exchangeName?: string
}

export type F2Record = {
  id?: number
  exchange?: number | { id?: number }
  tbc_source?: string
  effective_from?: string
  effective_to?: string | null
  f2_commission_spec?: RateSpec | null
  [key: string]: unknown
}

export type F2PeriodEntry = {
  id?: number
  record?: F2Record
  entry?: {
    period_status?: string
    is_current?: boolean
    tbc_source?: string
  }
  is_current?: boolean
  period_status?: string
  tbc_source?: string
  can_edit?: boolean
  can_delete?: boolean
  lock_reason?: string | null
}

export function resolveF2ExchangeId(exchange: F2Record['exchange']): number | undefined {
  if (exchange == null) return undefined
  if (typeof exchange === 'object') return exchange.id
  return exchange
}
