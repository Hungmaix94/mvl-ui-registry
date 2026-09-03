import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { LadLineStatus } from '../../constants/lad-constants'
import type { LadBatchLine } from '../../types/lad-types'
import LadStep1Scope from './LadStep1Scope'

// LadStep1Scope pulls in React-Query mutations, the global dialog, an async date-range picker and
// the (heavy) add-deal dialog. None of that is the subject of THIS test — the bug was purely the
// Bước-1 counter copy + hint text drifting from BE behaviour — so we stub those boundaries and keep
// the assertions on the rendered counter/annotation only.
vi.mock('@/hooks/useDialog', () => ({
  useDialog: () => ({
    displayConfirm: vi.fn(),
    displayCustom: vi.fn(),
    displayClose: vi.fn(),
  }),
}))

vi.mock('../../services/commission-adjustment-batch-service', () => ({
  usePatchLadBatch: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePatchLadLine: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteLadLine: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/components/ui/date-range-picker/DateRangePicker', () => ({
  DateRangePicker: () => null,
}))

vi.mock('./LadAddDealDialog', () => ({ LadAddDealDialog: () => null }))

let nextId = 1

/**
 * `CommissionAdjustmentBatchLine` is a generated schema with many readonly fields; the counter only
 * reads `line_status`, so we declare just what's used and cast ONCE at the test boundary rather than
 * sprinkling `as` in the component.
 */
function makeLine(status: LadLineStatus, overrides: Record<string, unknown> = {}): LadBatchLine {
  const id = nextId++
  return {
    id,
    deal: 1000 + id,
    deal_code: `GD-${id}`,
    line_status: status,
    project: { name: `Dự án ${id}` },
    product_inventory: { unit_number: `A-${id}` },
    customer: null,
    ...overrides,
  } as unknown as LadBatchLine
}

function renderScope(lines: LadBatchLine[]) {
  return render(
    <LadStep1Scope batchId={1} saleAllocationId={2037} batch={undefined} lines={lines} />
  )
}

describe('LadStep1Scope — bộ đếm "Danh sách giao dịch bị ảnh hưởng"', () => {
  it('đếm GD sẽ áp dụng (không bị Loại trừ) và GD đã loại trừ', () => {
    // draft + applied ⇒ sẽ áp dụng; excluded ⇒ đã loại trừ.
    const lines = [
      makeLine(LadLineStatus.draft),
      makeLine(LadLineStatus.applied),
      makeLine(LadLineStatus.excluded),
    ]
    renderScope(lines)

    expect(screen.getByText(/Danh sách giao dịch bị ảnh hưởng \(3\)/)).toBeInTheDocument()

    const counter = screen.getByText(/sẽ áp dụng/)
    expect(counter).toHaveTextContent('2 sẽ áp dụng · 1 đã loại trừ')
  })

  it('đếm 0 sẽ áp dụng khi mọi GD đều bị Loại trừ', () => {
    renderScope([makeLine(LadLineStatus.excluded), makeLine(LadLineStatus.excluded)])

    expect(screen.getByText(/sẽ áp dụng/)).toHaveTextContent('0 sẽ áp dụng · 2 đã loại trừ')
  })

  it('KHÔNG dùng lại khái niệm "đã xác nhận" ở bộ đếm (copy cũ)', () => {
    renderScope([makeLine(LadLineStatus.draft)])

    // Bộ đếm mới không được chứa "đã xác nhận" / "còn dự kiến" (định dạng "N/M đã xác nhận" cũ).
    // Lưu ý: nút "Import GD đã xác nhận" có chứa cụm này nên chỉ soi trong chính phần bộ đếm.
    const counter = screen.getByText(/sẽ áp dụng/)
    expect(counter).not.toHaveTextContent('đã xác nhận')
    expect(counter).not.toHaveTextContent('còn dự kiến')
  })
})

describe('LadStep1Scope — chú thích xanh cuối bước 1', () => {
  it('mô tả đúng hành vi BE: Dự kiến sẽ áp khi lô được duyệt, hoặc Loại trừ', () => {
    renderScope([makeLine(LadLineStatus.draft)])

    const hint = screen.getByText(/GD trong lô ở trạng thái Dự kiến/)
    expect(hint).toHaveTextContent('sẽ được áp dụng khi lô được duyệt')
    expect(hint).toHaveTextContent('Loại trừ')
  })

  it('KHÔNG còn copy sai cũ ("chuyển sang Xác nhận" / "gửi duyệt")', () => {
    renderScope([makeLine(LadLineStatus.draft)])

    // Copy cũ (registry 2026-05-29) hướng dẫn thao tác không tồn tại ở BE.
    expect(screen.queryByText(/chuyển sang Xác nhận/)).not.toBeInTheDocument()
    expect(screen.queryByText(/mới được áp dụng khi gửi duyệt/)).not.toBeInTheDocument()
  })
})
