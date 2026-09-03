import { useDealCommissionConfigList } from '@/features/sales/deals/services/deal-service'

import { useReconHistorySummary } from './useReconHistorySummary'

/**
 * Hai field lũy kế giảm trừ MỚI trên envelope `deals/{deal_pk}/commission-config/` (BE branch, CHƯA
 * deploy nên chưa có trong `schema.ts`). PRE-VAT, chỉ IR CONFIRMED non-voided.
 */
// TODO: remove cast after `yarn api:update:local` regen (BE thêm prior_fee_deduction_* vào envelope).
type PriorDeductionEnvelopeFields = {
  prior_fee_deduction_total?: string | null
  prior_fee_deduction_to_sale_total?: string | null
}

function toFiniteNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Đọc `prior_fee_deduction_total` / `prior_fee_deduction_to_sale_total` từ envelope commission-config
 * (narrow cast — xem TODO trên type). Envelope có thể là MẢNG hoặc MỘT object (như
 * `extractCurrentCommissionConfig`). Trả `null` khi BE chưa deploy field (⇒ fallback lịch sử).
 */
export function extractServerPriorDeduction(
  envelope: unknown
): { total: number; toSale: number } | null {
  const pick = (entry: unknown): { total: number; toSale: number } | null => {
    if (!entry || typeof entry !== 'object') return null
    const fields = entry as PriorDeductionEnvelopeFields
    const total = toFiniteNumber(fields.prior_fee_deduction_total)
    if (total == null) return null
    return { total, toSale: toFiniteNumber(fields.prior_fee_deduction_to_sale_total) ?? 0 }
  }
  return Array.isArray(envelope) ? pick(envelope[0]) : pick(envelope)
}

export interface ReconPriorDeduction {
  /** Lũy kế "Giảm trừ khác" các kỳ ĐÃ DUYỆT (PRE-VAT). */
  total: number
  /** Lũy kế "Trong đó Sale / F2 phải chịu" các kỳ ĐÃ DUYỆT (PRE-VAT). */
  toSale: number
  isLoading: boolean
  /** `server` = envelope commission-config (số BE, ưu tiên); `history` = FE tự cộng từ lịch sử (fallback). */
  source: 'server' | 'history'
}

/**
 * Lũy kế giảm trừ ("Giảm trừ khác" + "Trong đó Sale / F2 phải chịu") các kỳ ĐÃ DUYỆT của một deal —
 * basis PRE-VAT + confirmed-only, khớp `prior_*` của BE.
 *
 * Nguồn CHÍNH: envelope `deals/{deal_pk}/commission-config/` (field `prior_fee_deduction_*` — BE
 * branch, chưa deploy ⇒ narrow cast). Fallback khi BE chưa trả field: 2 field F1 của
 * `useReconHistorySummary` (cùng basis; React Query đã dedupe cả 2 query với các consumer khác của
 * line card nên KHÔNG thêm request).
 *
 * Lưu ý exclude: envelope là deal-level nên KHÔNG loại được phiếu đang xem — nhưng phiếu đang sửa
 * luôn là DRAFT (chưa confirmed) nên không lọt vào `prior_*` của BE; `excludeInvestorSheetId` chỉ
 * thực sự tác động lên nhánh fallback lịch sử.
 */
export function useReconPriorDeduction(
  dealId: number | null | undefined,
  options?: { excludeInvestorSheetId?: number | null }
): ReconPriorDeduction {
  const id = dealId && dealId > 0 ? dealId : 0

  const { data: envelope, isLoading: isEnvelopeLoading } = useDealCommissionConfigList(id, {
    enabled: id > 0,
  })
  const history = useReconHistorySummary(id, {
    excludeInvestorSheetId: options?.excludeInvestorSheetId,
  })

  const server = extractServerPriorDeduction(envelope)
  if (server) {
    return { ...server, isLoading: false, source: 'server' }
  }
  return {
    total: history.confirmedFeeDeductionTotal,
    toSale: history.confirmedFeeDeductionToSaleTotal,
    isLoading: id > 0 && (isEnvelopeLoading || history.isLoading),
    source: 'history',
  }
}
