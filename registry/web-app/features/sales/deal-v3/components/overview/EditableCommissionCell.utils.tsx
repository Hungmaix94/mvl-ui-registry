import React from 'react'
import { CreateShareRequestRecipient_kind } from '@/api/schema'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import toastService from '@/services/toast-service'
import type { RateSpec } from '@/utils/rate-spec'

export interface CommissionShare {
  share_id?: number | string | null
  id?: number | string | null
  isEmpty?: boolean
  is_custom_override?: boolean
  percentage?: string | number | null
  rate?: string | number | null
  // Nguồn sự thật khi tỷ lệ được cấu hình kiểu phân số (F2 = 1/3 của 6%…). Khi có
  // mode 'fraction', hiển thị "x / y của z" thay vì chỉ % dẫn xuất (`percentage`).
  rate_spec?: RateSpec | null
  fixed_amount?: string | number | null
  calculated_amount?: string | number | null
  amount?: string | number | null
  contribution_percentage?: string | number | null
  pct_type?: string | null
  recipient_kind?: string | null
  employee?: { id: number | string; fullname?: string; code?: string } | null
  exchange?: { id: number | string; name?: string; code?: string } | null
  collaborator?: { id: number | string; name?: string } | null
  department?: { id: number | string; name?: string } | null
  position?: { id: number | string; name?: string } | null
}

export interface CommissionRecipient {
  recipient_kind?: string | null
  employee?: { id: number | string; fullname?: string; code?: string } | null
  exchange?: { id: number | string; name?: string; code?: string } | null
  collaborator?: { id: number | string; name?: string } | null
  department?: { id: number | string; name?: string } | null
  position?: { id: number | string; name?: string } | null
}

export type EditField = 'percentage' | 'fixed_amount' | 'contribution_percentage'

export const formatPct = (val: string | number | null | undefined) => {
  if (val == null || val === '') return '—'
  const num = Number(val)
  return formatPercent(num)
}

export const formatAmt = (value?: string | number | null) => {
  if (!value && value !== 0) return '—'
  return formatCurrencyVND(Number(value))
}

export const RECIPIENT_LOOKUP: ReadonlyArray<{
  shareField: 'employee' | 'exchange' | 'collaborator' | 'department' | 'position'
  kind: CreateShareRequestRecipient_kind
}> = [
  { shareField: 'employee', kind: CreateShareRequestRecipient_kind.employee },
  { shareField: 'exchange', kind: CreateShareRequestRecipient_kind.exchange },
  { shareField: 'collaborator', kind: CreateShareRequestRecipient_kind.collaborator },
  { shareField: 'department', kind: CreateShareRequestRecipient_kind.department },
  { shareField: 'position', kind: CreateShareRequestRecipient_kind.position },
]

export const getValidShareId = (share: CommissionShare): number | null => {
  const id = share.share_id
  if (!id || typeof id === 'string' || String(id).startsWith('empty_')) return null
  return id as number
}

export const alignPctType = (rawType: unknown, field: EditField): string | undefined => {
  if (typeof rawType !== 'string' || !rawType) return undefined
  if (field === 'percentage') return rawType.replace(/^amt_/, 'pct_')
  if (field === 'fixed_amount') return rawType.replace(/^pct_/, 'amt_')
  return rawType
}

export const resolveRecipientFromShare = (
  share: CommissionShare
): { kind: string; id: number } | null => {
  for (const { shareField, kind } of RECIPIENT_LOOKUP) {
    const id = share[shareField]?.id
    if (!id) continue
    const resolvedKind = shareField === 'exchange' ? share.recipient_kind || kind : kind
    return { kind: resolvedKind, id: Number(id) }
  }
  return null
}

export const isAmtField = (type?: string | null): boolean => {
  if (!type) return false
  return type.startsWith('amt_') || type.includes('_bonus')
}

export const isPctField = (type?: string | null): boolean => {
  if (!type) return false
  return (
    (type.startsWith('pct_') && !type.includes('_bonus')) ||
    type.includes('_fee') ||
    type.includes('_commission')
  )
}

// Decide which value field (percentage / fixed_amount / contribution_percentage) the cell
// should display and pre-select for editing, based on the share's data and pct_type.
export const deriveComputedField = (
  field: EditField,
  share: CommissionShare,
  pctType: string | undefined,
  pctOnly: boolean | undefined,
  hasPct: boolean | undefined,
  hasAmt: boolean | undefined
): EditField => {
  if (pctOnly) return 'percentage'
  if (field === 'contribution_percentage') return 'contribution_percentage'

  if (hasAmt && !hasPct) return 'fixed_amount'
  if (hasPct && !hasAmt) return 'percentage'

  const currentPctType = share.pct_type || pctType
  if (currentPctType) {
    if (isAmtField(currentPctType)) return 'fixed_amount'
    if (isPctField(currentPctType)) return 'percentage'
  }

  if (!share.isEmpty) {
    if (share.fixed_amount != null && Number(share.fixed_amount) > 0) return 'fixed_amount'
    const pct = share.percentage ?? share.rate
    if (pct != null && Number(pct) > 0) return 'percentage'
  }

  return field
}

// Validate a numeric text input, surfacing the appropriate toast error. Returns false on failure.
// `decimal` controls comma→dot normalization (% fields accept "1,5"; the currency field does not).
export const validateNumeric = (
  raw: string | number,
  msgs: { empty: string; invalid: string; negative: string; max?: string },
  decimal: boolean
): boolean => {
  let cleaned = String(raw || '').trim()
  if (decimal) cleaned = cleaned.replace(',', '.')
  if (!cleaned) {
    toastService.error(msgs.empty)
    return false
  }
  const num = Number(cleaned)
  if (isNaN(num)) {
    toastService.error(msgs.invalid)
    return false
  }
  if (num < 0) {
    toastService.error(msgs.negative)
    return false
  }
  if (msgs.max && num > 100) {
    toastService.error(msgs.max)
    return false
  }
  return true
}

// Presentational cell value: the main figure plus its secondary line ("= amount" or "--%").
// When the % rate was entered as a fraction (`fractionText`), keep the fraction "x / y của z" as
// the primary figure — matching the "đang áp dụng" tables — and drop the derived % to a muted line.
export const DisplayValue: React.FC<{
  computedField: EditField
  displayPct: string
  displayAmt: string
  displayContrib: string
  pctVal: string | number | null | undefined
  absCalculatedAmount: number | null
  isCustomOverride?: boolean | null
  fractionText?: string | null
  /**
   * Số quy đổi của phân số (`formatRateSpecEquivalent`) cho dòng "≈ …" — cùng nguồn chữ và cùng quy
   * tắc làm tròn với mọi màn khác. Bỏ trống ⇒ rơi về `displayPct` (cache `percentage` của BE).
   */
  fractionEquivalent?: string | null
}> = ({
  computedField,
  displayPct,
  displayAmt,
  displayContrib,
  pctVal,
  absCalculatedAmount,
  isCustomOverride,
  fractionText,
  fractionEquivalent,
}) => {
  const showFraction = computedField === 'percentage' && !!fractionText && displayPct !== '—'
  const isOverrideStyle = isCustomOverride
    ? 'text-data-blue-default font-semibold'
    : 'typo-body-base text-content-dark-1'

  const mainText =
    computedField === 'contribution_percentage'
      ? displayContrib
      : computedField === 'percentage'
        ? showFraction
          ? fractionText
          : displayPct
        : displayAmt

  const hasAbsAmt = absCalculatedAmount != null
  const hasPctVal = Number(pctVal) > 0

  let subText: React.ReactNode = null
  if (showFraction) {
    subText =
      Number(pctVal) !== 0
        ? `≈ ${fractionEquivalent ?? displayPct}`
        : `= ${formatAmt(absCalculatedAmount)}`
  } else if (
    computedField === 'percentage' &&
    displayPct !== '—' &&
    (Number(pctVal) !== 0 || hasAbsAmt)
  ) {
    subText = `= ${formatAmt(absCalculatedAmount)}`
  } else if (computedField === 'fixed_amount' && hasPctVal) {
    // Dòng phụ ở đây CHỈ để hiện phép quy đổi sang đơn vị còn lại. Khoản nhập thẳng bằng
    // số tiền mà không quy đổi được ra % thì không có gì để hiện — trước đây in "--%",
    // một chỗ trống đội lốt dữ liệu: người đọc tưởng tỷ lệ bị thiếu chứ không hiểu là
    // khoản này vốn không có tỷ lệ. Bỏ hẳn dòng, con số chính đã nói đủ.
    subText = `= ${displayPct}`
  }

  return (
    <div className="relative z-10 flex flex-col items-end">
      <span className={isOverrideStyle}>{mainText}</span>
      {subText && (
        <span className="text-content-dark-3 mt-0.5 text-[11px] font-medium">{subText}</span>
      )}
    </div>
  )
}
