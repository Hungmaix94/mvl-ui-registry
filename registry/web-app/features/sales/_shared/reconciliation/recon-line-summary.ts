import { formatCurrencyVND } from '@/utils/common'
import { CTVReconciliationPeriod_type } from '@/api/schema'

import type { InvestorReconciliationSheetCreateItemValues } from '@/features/sales/_shared/reconciliation/recon-sheet-schema'
import type { ReconLineDerived } from './useReconLineDerived'

function money(value: number): string {
  return `${formatCurrencyVND(value, { maximumFractionDigits: 0 })} đ`
}

function signedMoney(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${money(Math.abs(value))}`
}

/**
 * Pure builder for the COLLAPSED line-card one-line summary (mockup `rf5-mini`).
 *
 * Mặc định: `% TT` + `Phí ĐL` rồi conditionally Truy hồi / Thưởng / Khấu trừ / Tăng thêm (khi ≠ 0).
 * Riêng **Kỳ điều chỉnh thuần** đẩy **Truy hồi** lên đầu và ẩn `% TT`/`Phí ĐL` khi không tăng tiến độ
 * (trọng tâm theo mockup). Money từ {@link ReconLineDerived} (preview/server-frozen); % off form item.
 * Caller joins the returned segments with " · ".
 */
export function buildReconLineSummary(
  item: InvestorReconciliationSheetCreateItemValues | undefined,
  derived: ReconLineDerived,
  options: { includeExtraBonus?: boolean } = {}
): string[] {
  // Preset F2 (simple) tắt phí tăng thêm ⇒ bỏ segment "Tăng thêm" khỏi tóm tắt thu gọn. Default = giữ.
  const { includeExtraBonus = true } = options
  // `item` can be momentarily undefined when useFieldArray `fields` and useWatch `items` desync for
  // one render (right after append/remove) — return nothing rather than dereferencing it.
  if (!item) return []

  const from = item.progress_from_pct ?? 0
  const to = item.progress_to_pct ?? 0
  const bonus = item.shared_bonus_period_amount ?? 0
  const deduct = item.fee_deduction ?? 0

  // Kỳ điều chỉnh thuần: trọng tâm là Truy hồi — đẩy lên đầu, ẩn "% TT"/"Phí ĐL" khi không tăng tiến độ.
  if (item.period_type === CTVReconciliationPeriod_type.adjustment_only) {
    const segments: string[] = []
    if (derived.retroactiveAdjustment !== 0) {
      segments.push(`Truy hồi: ${signedMoney(derived.retroactiveAdjustment)}`)
    }
    if (to !== from) segments.push(`% TT: ${from}→${to}%`)
    if (derived.periodCommission !== 0) segments.push(`Phí ĐL: ${money(derived.periodCommission)}`)
    if (bonus > 0) segments.push(`Thưởng: ${money(bonus)}`)
    if (deduct > 0) segments.push(`Khấu trừ: ${money(deduct)}`)
    if (includeExtraBonus && derived.extraBonusPeriodAmount !== 0) {
      segments.push(`Tăng thêm: ${money(derived.extraBonusPeriodAmount)}`)
    }
    return segments.length > 0 ? segments : ['Điều chỉnh giá / % HH']
  }

  const segments: string[] = [`% TT: ${from}→${to}%`, `Phí ĐL: ${money(derived.periodCommission)}`]

  if (derived.retroactiveAdjustment !== 0) {
    segments.push(`Truy hồi: ${signedMoney(derived.retroactiveAdjustment)}`)
  }
  if (bonus > 0) {
    segments.push(`Thưởng: ${money(bonus)}`)
  }
  if (deduct > 0) {
    segments.push(`Khấu trừ: ${money(deduct)}`)
  }
  if (derived.extraBonusPeriodAmount !== 0) {
    segments.push(`Tăng thêm: ${money(derived.extraBonusPeriodAmount)}`)
  }

  return segments
}
