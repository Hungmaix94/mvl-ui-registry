import { useQuery } from '@tanstack/react-query'

import { useReconKind } from './ReconKindContext'
import { buildReconHistoryQuery } from './recon-history-source'
import { summarizeReconHistory, type ReconHistorySummaryData } from './recon-history-summary'

export type UseReconHistorySummaryOptions = {
  /** Phiếu đang xem/sửa — loại khỏi lũy kế để không tự tham chiếu chính nó. */
  excludeInvestorSheetId?: number | null
}

export interface ReconHistorySummary extends ReconHistorySummaryData {
  isLoading: boolean
}

/**
 * Tóm tắt lịch sử đối chiếu của một GIAO DỊCH (deal) cho header "Lịch sử đối chiếu" (mockup §4). Fetch
 * NGAY khi đã resolve deal (`dealId > 0`) — scope theo deal để không lẫn đối chiếu của deal cũ (cùng
 * căn, đã hủy cọc). Dùng chung query key với `ReconHistoryTable` nên React Query dedupe (chỉ 1
 * request). Phép tính thuần nằm trong {@link summarizeReconHistory}.
 */
export function useReconHistorySummary(
  dealId: number,
  options?: UseReconHistorySummaryOptions
): ReconHistorySummary {
  // Preset đối chiếu chọn endpoint lịch sử (F2/CTV → adapt sang canonical; còn lại → CĐT). Dùng chung
  // query key với `ReconHistoryTable` nên React Query dedupe (1 request).
  const kind = useReconKind().kind
  const { data, isLoading } = useQuery(buildReconHistoryQuery(kind, dealId))

  return {
    ...summarizeReconHistory(data?.results ?? [], options?.excludeInvestorSheetId),
    isLoading: isLoading && dealId > 0,
  }
}
