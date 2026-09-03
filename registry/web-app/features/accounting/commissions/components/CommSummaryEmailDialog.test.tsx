// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// The recipient <Select> measures its trigger via ResizeObserver, unavailable in jsdom.
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

import { CommSummaryEmailDialog } from './CommSummaryEmailDialog'
import type { CommissionEmailPreview } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'

// ClickUp 86eyhu4rp: preview must show every recipient the send action would actually
// dispatch to (not just one merged view) — these tests cover the dialog's reaction to a
// single- vs multi-statement preview response, not the backend split logic itself (that
// is covered in backend/apps/accounting/tests/test_sales_monthly_split_send.py).

const mockPreviewMutateAsync = vi.fn()
const mockSendMutateAsync = vi.fn()

vi.mock('@/features/accounting/monthly-summaries/services/monthly-summary-service', () => ({
  usePreviewCommissionEmail: () => ({
    mutateAsync: mockPreviewMutateAsync,
    isPending: false,
  }),
  useSendCommissionEmail: () => ({
    mutateAsync: mockSendMutateAsync,
    isPending: false,
  }),
}))

vi.mock('@/services/toast-service', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

function singleStatementPreview(): CommissionEmailPreview {
  const statement = { email: 'duynq@maivietland.vn', html: '<p>V10021</p>', text: '', subject: 'x' }
  return { ...statement, statements: [statement] }
}

function splitPreview(): CommissionEmailPreview {
  const statements = [
    { email: 'duynq@maivietland.vn', html: '<p>V10021 only</p>', text: '', subject: 'x' },
    { email: 'phuongkt1@maivietland.vn', html: '<p>V10016 only</p>', text: '', subject: 'x' },
  ]
  return { ...statements[0], statements }
}

describe('CommSummaryEmailDialog', () => {
  beforeEach(() => {
    mockPreviewMutateAsync.mockReset()
    mockSendMutateAsync.mockReset()
  })

  it('renders no recipient selector when the summary has a single recipient', async () => {
    mockPreviewMutateAsync.mockResolvedValue(singleStatementPreview())

    render(
      <CommSummaryEmailDialog
        isOpen
        onClose={vi.fn()}
        role="sales"
        summaryId={1}
        payeeName="Nguyễn Quang Duy(N test)"
      />
    )

    await waitFor(() => expect(mockPreviewMutateAsync).toHaveBeenCalled())
    expect(screen.getByText('Người nhận: Nguyễn Quang Duy(N test)')).toBeInTheDocument()
    expect(screen.queryByText(/tách thành/)).not.toBeInTheDocument()
  })

  it('shows a recipient selector + split warning when the summary splits into multiple recipients', async () => {
    mockPreviewMutateAsync.mockResolvedValue(splitPreview())

    render(
      <CommSummaryEmailDialog
        isOpen
        onClose={vi.fn()}
        role="sales"
        summaryId={1}
        payeeName="Nguyễn Quang Duy(N test)"
      />
    )

    await waitFor(() => expect(mockPreviewMutateAsync).toHaveBeenCalled())

    // Split preview -> the misleading single payeeName label is replaced by the
    // currently-selected recipient's own email (defaults to the first statement).
    expect(await screen.findByText('Người nhận: duynq@maivietland.vn')).toBeInTheDocument()
    expect(screen.getByText(/tách thành 2 email/)).toBeInTheDocument()
  })

  it('requests the preview again (not the send) when only previewing', async () => {
    mockPreviewMutateAsync.mockResolvedValue(singleStatementPreview())

    render(<CommSummaryEmailDialog isOpen onClose={vi.fn()} role="sales" summaryId={42} />)

    await waitFor(() =>
      expect(mockPreviewMutateAsync).toHaveBeenCalledWith({ role: 'sales', kind: 'detail', id: 42 })
    )
    expect(mockSendMutateAsync).not.toHaveBeenCalled()
  })
})
