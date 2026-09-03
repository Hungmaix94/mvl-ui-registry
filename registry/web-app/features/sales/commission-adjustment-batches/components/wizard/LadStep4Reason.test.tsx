import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { LadBatchDetail } from '../../types/lad-types'
import LadStep4Reason from './LadStep4Reason'

// 86eyk0ake: checkbox mới cho `override_per_deal_revenue` (đè có chủ đích cho deal đã điều chỉnh
// doanh thu riêng). Stub các phần không phải chủ đề của test này (attachments upload, PATCH call).
const mutateAsync = vi.fn().mockResolvedValue(undefined)
vi.mock('../../services/commission-adjustment-batch-service', () => ({
  usePatchLadBatch: () => ({ mutateAsync, isPending: false }),
}))
vi.mock('./LadStep4Attachments', () => ({ LadStep4Attachments: () => null }))

// `override_per_deal_revenue` chưa có trong schema sinh ra (xem shim trong LadStep4Reason.tsx).
function makeBatch(
  overrides: Partial<LadBatchDetail> & { override_per_deal_revenue?: boolean } = {}
): LadBatchDetail {
  return {
    id: 1,
    code: 'LAD-2026-0001-DRAFT',
    name: 'Lô test',
    reason: 'Lý do có sẵn',
    override_locked: false,
    override_per_deal_revenue: false,
    filter_criteria: {},
    ...overrides,
  } as unknown as LadBatchDetail
}

describe('LadStep4Reason — checkbox "Ghi đè cả những GD đã có điều chỉnh doanh thu riêng"', () => {
  it('mặc định KHÔNG check khi batch chưa khai báo override_per_deal_revenue', () => {
    render(<LadStep4Reason batchId={1} batch={makeBatch()} />)

    const checkbox = screen.getByRole('checkbox', {
      name: /Ghi đè cả những GD đã có điều chỉnh doanh thu riêng/,
    })
    expect(checkbox).not.toBeChecked()
  })

  it('seed đúng trạng thái CHECKED khi batch.override_per_deal_revenue = true', () => {
    render(<LadStep4Reason batchId={1} batch={makeBatch({ override_per_deal_revenue: true })} />)

    const checkbox = screen.getByRole('checkbox', {
      name: /Ghi đè cả những GD đã có điều chỉnh doanh thu riêng/,
    })
    expect(checkbox).toBeChecked()
  })

  it('bật checkbox rồi save() gửi override_per_deal_revenue=true trong PATCH', async () => {
    const user = userEvent.setup()
    let savedFn: (() => Promise<boolean>) | null = null

    render(
      <LadStep4Reason
        batchId={1}
        batch={makeBatch()}
        onRegisterSave={(fn) => {
          savedFn = fn
        }}
      />
    )

    const checkbox = screen.getByRole('checkbox', {
      name: /Ghi đè cả những GD đã có điều chỉnh doanh thu riêng/,
    })
    await user.click(checkbox)

    expect(savedFn).not.toBeNull()
    const ok = await savedFn!()

    expect(ok).toBe(true)
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        data: expect.objectContaining({ override_per_deal_revenue: true }),
      })
    )
  })

  it('không bật checkbox → save() gửi override_per_deal_revenue=false (mặc định, không đổi hành vi cũ)', async () => {
    let savedFn: (() => Promise<boolean>) | null = null

    render(
      <LadStep4Reason
        batchId={1}
        batch={makeBatch()}
        onRegisterSave={(fn) => {
          savedFn = fn
        }}
      />
    )

    // Đổi tên lô để buộc save() thực sự gọi API (khác baseline seed).
    const nameInput = screen.getByLabelText('Tên lô')
    const user = userEvent.setup()
    await user.clear(nameInput)
    await user.type(nameInput, 'Lô test đổi tên')

    await savedFn!()

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ override_per_deal_revenue: false }),
      })
    )
  })
})
