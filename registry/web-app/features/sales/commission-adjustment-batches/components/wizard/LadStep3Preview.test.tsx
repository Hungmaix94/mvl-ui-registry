import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { LadPreviewResult } from '../../types/lad-types'
import LadStep3Preview from './LadStep3Preview'

// 86eyk0ake: `warnings` giờ dịch từ mã snake_case (BE manual_override_reasons) sang tiếng Việt —
// stub các phần không phải chủ đề (mutation preview, join dữ liệu deal cho cột Căn/Giá HĐ).
const previewResult: LadPreviewResult = {
  deal_count: 1,
  delta_total: 0,
  lines: [
    {
      deal_id: 42,
      deal_code: 'HD06-2026-000042',
      customer_name: 'Khách A',
      sale_type: null,
      exchange_id: null,
      line_status: 'draft',
      before: {},
      after: {},
      before_total: '0',
      after_total: '0',
      delta_total_fee: 0,
      changed_fields: [],
      warnings: ['revenue_overridden'],
    },
  ],
} as unknown as LadPreviewResult

const mutateAsync = vi.fn().mockResolvedValue(previewResult)
vi.mock('../../services/commission-adjustment-batch-service', () => ({
  usePreviewLad: () => ({ mutateAsync, isPending: false }),
}))
vi.mock('@/features/sales/deals/services/deal-service', () => ({
  useDeals: () => ({ data: { results: [] } }),
}))

describe('LadStep3Preview — dịch mã cảnh báo sang tiếng Việt', () => {
  it('hiển thị lời giải thích tiếng Việt cho mã "revenue_overridden", không phải mã thô', async () => {
    render(<LadStep3Preview batchId={1} saleAllocationId={2037} />)

    const warningText = await screen.findByText(/GD đã được duyệt điều chỉnh doanh thu riêng/)
    expect(warningText).toBeInTheDocument()
    expect(screen.queryByText(/• HD06-2026-000042: revenue_overridden$/)).not.toBeInTheDocument()
  })
})
