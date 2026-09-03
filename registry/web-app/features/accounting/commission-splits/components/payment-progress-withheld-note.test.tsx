// @vitest-environment jsdom
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * Cảnh báo "dial đang ghim thấp hơn tiền về" ở Mục 3 in ra hai dấu phần trăm.
 *
 * `formatPctFloor` đã tự gắn '%' vào chuỗi trả về, nhưng JSX còn gõ thêm một '%' nữa, nên
 * kế toán đọc được "đang ghim 70%% trong khi tiền về đã 99,99%%" (đo trực tiếp trên
 * staging worksheet 2, ClickUp 86eye2vrk). Test khoá lại đúng chuỗi hiển thị.
 */

vi.mock('../services/commission-splits-service', () => ({
  useSetPeriodProgress: () => ({ mutateAsync: vi.fn(), isPending: false }),
  refetchWorksheetQueries: vi.fn(),
}))
vi.mock('@/services/toast-service', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import type { CommissionSplitDetail } from '../services/commission-splits-service'

import { type Allocation, PaymentProgressTimeline } from './PaymentProgressTimeline'

const WS = 2

const allocations: Allocation[] = [
  {
    id: 1,
    worksheet_id: WS,
    period_year: 2026,
    period_month: 7,
    distribution_pct: '99.9999999999',
    fee_progress_pct: '70.0000000000',
    bonus_progress_pct: null,
    f2_progress_pct: null,
    bonus_f2_progress_pct: null,
    bonus_dial_pct: '0',
    amount_received: '154620394',
    date: '2026-07-27',
    status: 'DRAFT',
    worksheet_status: 'ADMIN_APPROVED',
    code: 'Kỳ 07/2026',
    payout_allocated_amount: '108234276',
  },
]

const noCaps = {
  feeCollected: null,
  bonusCollected: null,
  bonusDial: null,
  feeMax: null,
  bonusMax: null,
  f2Prior: null,
  f2Max: null,
  bonusF2Prior: null,
  bonusF2Max: null,
}

/** Dial phí ghim 70% trong khi tiền về đã ~100% → BE trả `fee_withheld_amount`. */
function renderTimeline() {
  const detail = {
    period_year: 2026,
    period_month: 7,
    recipients_editable: true,
    dial_note: '',
    receipt_vouchers: [],
    positions: [],
    previous_periods: [],
    fee_progress_pct: '70.0000000000',
    fee_default_pct: '99.9999999999',
    fee_withheld_amount: '46386118',
  }

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/split-sheets/${WS}`]}>
        <PaymentProgressTimeline
          detail={detail as unknown as CommissionSplitDetail}
          currentDetail={detail as unknown as CommissionSplitDetail}
          sortedAllocations={allocations}
          worksheetId={WS}
          routeIdStr={String(WS)}
          localFeePct={70}
          setLocalFeePct={vi.fn()}
          localBonusPct={null}
          setLocalBonusPct={vi.fn()}
          localF2Pct={null}
          setLocalF2Pct={vi.fn()}
          localBonusF2Pct={null}
          setLocalBonusF2Pct={vi.fn()}
          maxFeePct={100}
          maxBonusPct={100}
          maxF2Pct={100}
          maxBonusF2Pct={100}
          hasF2={false}
          hasF2Bonus={false}
          dialCaps={noCaps}
          totalCumPct={70}
          currentTotalPaid={108234276}
          currentMgmtTotalThis={0}
          isTkdaView={false}
          canEditDial
          dialNote=""
          setDialNote={vi.fn()}
          feeDefaultPct={99.9999999999}
          f2DefaultPct={null}
        />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Mục 3 — cảnh báo tiền bị dial giữ lại', () => {
  it('in đúng MỘT dấu phần trăm cho mỗi tỷ lệ', () => {
    renderTimeline()

    const note = screen.getByText(/chưa được mở để chia/).textContent ?? ''

    expect(note).toContain('đang ghim 70%')
    expect(note).toContain('tiền về đã 99,99%')
    expect(note).not.toContain('%%')
  })

  it('vẫn nêu đủ số tiền đang bị giữ lại', () => {
    renderTimeline()

    expect(screen.getByText(/chưa được mở để chia/).textContent).toContain('46.386.118')
  })
})
