import { DealSplitSection } from '@/features/sales/deal-v3/components/overview/DealSplitSection'
import { useDealWorkspace } from '@/features/sales/deals/services/deal-service'

import type { CommissionSplitDetail } from '../services/commission-splits-service'

interface DealPartiesSectionProps {
  /** Neo theo đúng field trang truyền vào, khỏi khai rộng hơn thực tế. */
  dealId: CommissionSplitDetail['deal_id']
}

/**
 * Mục ① Phân chia HH — Các bên tham gia. Chỉ đọc, mượn nguyên khối của màn chi tiết deal
 * (deal-v3) để hai màn không lệch nhau khi tỷ lệ chia đổi.
 *
 * Tự lấy `pricing` thay vì nhận props: React Query dedupe theo key nên không thêm request,
 * đổi lại trang không phải cầm hộ dữ liệu mà nó không dùng tới.
 */
export function DealPartiesSection({ dealId }: DealPartiesSectionProps) {
  // `useDealWorkspace` trả `any` (drf-spectacular mất shape của workspace) — ép hẹp ngay tại
  // biên. `pricing` chỉ được CHUYỂN TIẾP nguyên vẹn xuống `DealSplitSection`, màn này không
  // đọc field nào của nó, nên `unknown` mới là mô tả đúng — đừng bịa ra một shape giả.
  const dealWorkspaceQuery = useDealWorkspace(dealId, { enabled: !!dealId }) as {
    data?: { pricing?: unknown }
  }
  const pricing = dealWorkspaceQuery.data?.pricing

  if (!dealId) return null

  return (
    // `deal-split-table` là móc để căn giữa dọc cell của bảng Radix bên trong — Tailwind
    // không làm được việc này, lý do đầy đủ nằm ở src/assets/styles/radix-overide.css.
    <div className="deal-split-table border-border-1 overflow-hidden rounded-md border bg-white">
      <DealSplitSection dealId={dealId} pricing={pricing} sectionNo="1" readOnly />
    </div>
  )
}
