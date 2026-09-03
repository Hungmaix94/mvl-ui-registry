import { CTVReconciliationPeriod_type, CTVReconciliationReconciliation_type } from '@/api/schema'

/**
 * Loại kỳ (period_type) options for the đối chiếu CĐT screen.
 * `cancellation` is EXCLUDED here on purpose — this list feeds the XLSX import label map, whose
 * template does not carry kỳ hủy cọc. Use {@link RECON_PERIOD_TYPE_PICKER_OPTIONS} for the pickers.
 * Labels mirror the SRS mockup (recon_UI.html, V5/V6) and recon_flows §5.
 */
export type ReconPeriodTypeColor = 'blue' | 'purple' | 'orange' | 'green' | 'grey'

export type ReconPeriodTypeOption = {
  value: CTVReconciliationPeriod_type
  label: string
  short: string
  description: string
  color: ReconPeriodTypeColor
}

export const RECON_PERIOD_TYPE_OPTIONS: ReconPeriodTypeOption[] = [
  {
    value: CTVReconciliationPeriod_type.normal_payment,
    label: 'Kỳ thanh toán thường',
    short: 'TT thường',
    description: '',
    color: 'blue',
  },
  {
    value: CTVReconciliationPeriod_type.progress_with_adjustment,
    label: 'Kỳ tiến độ kèm điều chỉnh',
    short: 'Tiến độ + ĐC',
    description: 'Vừa tăng tiến độ vừa thay đổi giá / % hoa hồng',
    color: 'purple',
  },
  {
    value: CTVReconciliationPeriod_type.adjustment_only,
    label: 'Kỳ điều chỉnh thuần',
    short: 'ĐC thuần',
    description: 'Chỉ điều chỉnh giá / % hoa hồng — KHÔNG tăng tiến độ',
    color: 'orange',
  },
  {
    value: CTVReconciliationPeriod_type.bonus_deduction,
    label: 'Kỳ thưởng / khấu trừ',
    short: 'Thưởng / KT',
    description: 'Chỉ ghi nhận thưởng / khấu trừ phát sinh',
    color: 'green',
  },
]

/**
 * Loại kỳ the user picks in the "Thêm/Sửa căn" dialog — deliberately only TWO (chốt 04/08/2026).
 *
 * The other three (tiến độ kèm điều chỉnh / điều chỉnh thuần / thưởng - khấu trừ) are NOT offered:
 * they are shades of a normal period that the BE already infers from what was entered
 * (``derive_period_type``), so asking the user to classify their own row adds a way to get it wrong
 * with no upside. Kỳ hủy cọc is the one the BE cannot infer — it changes the deal's fate
 * (``settle_cancellation`` → Deal.status = cancelled_settled) — so it must be stated explicitly.
 *
 * Kỳ hủy cọc still RECOGNIZES the period's amounts (phí kỳ này, phí tăng thêm kỳ này, thưởng kỳ này,
 * giảm trừ) — what it does not do is move the PROGRESS frontier (chốt 04/08/2026). The BE enforces
 * that: `resolve_period_progress` returns None for this period type. The reason goes in "Ghi chú căn".
 */
export const RECON_PERIOD_TYPE_PICKER_OPTIONS: ReconPeriodTypeOption[] = [
  RECON_PERIOD_TYPE_OPTIONS[0]!, // Kỳ thanh toán thường
  {
    value: CTVReconciliationPeriod_type.cancellation,
    label: 'Kỳ hủy cọc',
    short: 'Hủy cọc',
    description: 'Đóng giao dịch không thành — nhập khấu trừ nếu có',
    color: 'grey',
  },
]

export const RECON_PERIOD_TYPE_LABELS: Record<CTVReconciliationPeriod_type, string> = {
  [CTVReconciliationPeriod_type.normal_payment]: 'Kỳ thanh toán thường',
  [CTVReconciliationPeriod_type.progress_with_adjustment]: 'Kỳ tiến độ kèm điều chỉnh',
  [CTVReconciliationPeriod_type.adjustment_only]: 'Kỳ điều chỉnh thuần',
  [CTVReconciliationPeriod_type.bonus_deduction]: 'Kỳ thưởng / khấu trừ',
  [CTVReconciliationPeriod_type.cancellation]: 'Kỳ hủy cọc',
}

/** Short pill label in lịch sử đối chiếu + summary bar (mockup §4). */
export const RECON_PERIOD_TYPE_SHORT: Record<CTVReconciliationPeriod_type, string> = {
  [CTVReconciliationPeriod_type.normal_payment]: 'TT thường',
  [CTVReconciliationPeriod_type.progress_with_adjustment]: 'Tiến độ + ĐC',
  [CTVReconciliationPeriod_type.adjustment_only]: 'ĐC thuần',
  [CTVReconciliationPeriod_type.bonus_deduction]: 'Thưởng / KT',
  [CTVReconciliationPeriod_type.cancellation]: 'Hủy cọc',
}

/** Tinted pill for loại kỳ column (mirrors `PERIOD_STRIP_CLS` on line cards). */
export const RECON_PERIOD_STRIP_CLS: Record<CTVReconciliationPeriod_type, string> = {
  [CTVReconciliationPeriod_type.normal_payment]: 'bg-data-blue-disabled text-data-blue-hover',
  [CTVReconciliationPeriod_type.progress_with_adjustment]:
    'bg-data-purple-disabled text-data-purple-hover',
  [CTVReconciliationPeriod_type.adjustment_only]: 'bg-data-orange-disabled text-data-orange-hover',
  [CTVReconciliationPeriod_type.bonus_deduction]: 'bg-data-green-disabled text-data-green-hover',
  [CTVReconciliationPeriod_type.cancellation]: 'bg-data-red-disabled text-data-red-default',
}

/**
 * Left-accent border tone per loại kỳ — used as the 3px left rail on the "Kỳ" cell of the
 * lịch sử đối chiếu ledger (depth + a second visual home for period_type).
 */
export const RECON_PERIOD_BORDER_CLS: Record<CTVReconciliationPeriod_type, string> = {
  [CTVReconciliationPeriod_type.normal_payment]: 'border-data-blue-default',
  [CTVReconciliationPeriod_type.progress_with_adjustment]: 'border-data-purple-default',
  [CTVReconciliationPeriod_type.adjustment_only]: 'border-data-orange-default',
  [CTVReconciliationPeriod_type.bonus_deduction]: 'border-data-green-default',
  [CTVReconciliationPeriod_type.cancellation]: 'border-data-red-default',
}

/** Grey fallback rail when a row has no period_type (older saved rows). */
export const RECON_PERIOD_BORDER_FALLBACK_CLS = 'border-border-1'

/** Short label for reconciliation_type (Tạm ứng / Tất toán) — caption in the lịch sử ledger. */
export const RECON_RECONCILIATION_TYPE_SHORT: Record<CTVReconciliationReconciliation_type, string> =
  {
    [CTVReconciliationReconciliation_type.advance]: 'Tạm ứng',
    [CTVReconciliationReconciliation_type.settlement]: 'Tất toán',
  }

/** Which input parts are active per period_type (recon_flows §5). Phần 0 is ALWAYS shown. */
export type ReconPartVisibility = {
  /** Phần 1 — Tiến độ. */
  p1: boolean
  /** Phần 2 — Điều chỉnh giá/HH → truy hồi. */
  p2: boolean
  /** Phần 3 — Thưởng / Khấu trừ. */
  p3: boolean
}

// Show-all model (confirmed with user 2026-06-02 via 2 real DOM examples, see
// `_docs/period-types-spec.md` §0): every non-cancel kind renders Phần 0+1+2+3; period_type only
// drives color/icon/label + validations + collapsed-summary emphasis. ONLY Kỳ hủy cọc hides parts
// (Phần 0 + 3 only — Phần 0 then read-only since p2 is off). p4 (Phí tăng thêm) + giá riêng Sale/F2
// remain opt-in toggles handled outside this map.
export const RECON_PART_VISIBILITY: Record<CTVReconciliationPeriod_type, ReconPartVisibility> = {
  [CTVReconciliationPeriod_type.normal_payment]: { p1: true, p2: true, p3: true },
  [CTVReconciliationPeriod_type.progress_with_adjustment]: { p1: true, p2: true, p3: true },
  [CTVReconciliationPeriod_type.adjustment_only]: { p1: true, p2: true, p3: true },
  [CTVReconciliationPeriod_type.bonus_deduction]: { p1: true, p2: true, p3: true },
  [CTVReconciliationPeriod_type.cancellation]: { p1: false, p2: false, p3: true },
}

export function getReconPartVisibility(
  periodType: CTVReconciliationPeriod_type | undefined | null
): ReconPartVisibility {
  if (!periodType) return RECON_PART_VISIBILITY[CTVReconciliationPeriod_type.normal_payment]
  return (
    RECON_PART_VISIBILITY[periodType] ??
    RECON_PART_VISIBILITY[CTVReconciliationPeriod_type.normal_payment]
  )
}
