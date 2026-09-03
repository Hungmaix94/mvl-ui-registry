// @vitest-environment jsdom
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

/**
 * Chọn một kỳ ở Mục 3 = XEM CHI TIẾT KỲ ĐÓ.
 *
 * Bug (dev deal 2897, worksheet 172 "kỳ trước" / 178 "kỳ hiện tại"): bấm kỳ trước chỉ đổi
 * `?worksheet_id=`, nhưng state dial của màn vẫn seed từ worksheet trên ROUTE. Hệ quả trên
 * Mục 3: thẻ kỳ đang xem hiện % của kỳ hiện tại. Cùng nguyên nhân đó, cột "% thanh toán kỳ
 * này" ở Mục 4 và toàn bộ TIỀN Mục 4 cũng bị kéo theo tỷ lệ của kỳ khác.
 *
 * Quy tắc đã chốt: mọi giá trị/hành vi bám kỳ ĐANG CHỌN; thứ duy nhất còn neo theo kỳ mở từ
 * danh sách là badge "Hiện tại" trên các box kỳ.
 */

// Stub trọn module service: import thật kéo theo store/BaseApiService (vòng import) —
// mạng không nằm trong phạm vi test này.
vi.mock('../services/commission-splits-service', () => ({
  useSetPeriodProgress: () => ({ mutateAsync: vi.fn(), isPending: false }),
  refetchWorksheetQueries: vi.fn(),
}))
vi.mock('@/services/toast-service', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

import type { CommissionSplitDetail } from '../services/commission-splits-service'

import { type Allocation, PaymentProgressTimeline } from './PaymentProgressTimeline'

const ROUTE_WS = 178 // kỳ 08/2026 — mở từ danh sách
const PREV_WS = 172 // kỳ 07/2026 — kỳ trước, đang được chọn

/** Dial đã chốt của kỳ 07 (BE lưu 10dp). Kỳ 08 chưa chốt dial. */
const PREV_FEE_PCT = '29.2929292929'

const allocations: Allocation[] = [
  {
    id: 777,
    worksheet_id: PREV_WS,
    period_year: 2026,
    period_month: 7,
    distribution_pct: PREV_FEE_PCT,
    fee_progress_pct: PREV_FEE_PCT,
    bonus_progress_pct: null,
    f2_progress_pct: null,
    bonus_f2_progress_pct: null,
    bonus_dial_pct: '0',
    amount_received: '187000000',
    date: '2026-07-29',
    status: 'APPROVED',
    worksheet_status: 'APPROVED',
    code: 'Kỳ 07/2026',
    payout_allocated_amount: '187000000',
  },
  {
    id: 784,
    worksheet_id: ROUTE_WS,
    period_year: 2026,
    period_month: 8,
    distribution_pct: '43.4318616136',
    fee_progress_pct: null,
    bonus_progress_pct: null,
    f2_progress_pct: null,
    bonus_f2_progress_pct: null,
    bonus_dial_pct: '0',
    amount_received: '250000000',
    date: '2026-08-03',
    status: 'DRAFT',
    worksheet_status: 'ADMIN_APPROVED',
    code: 'Kỳ 08/2026',
    payout_allocated_amount: '250000000',
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

/**
 * `detail` = payload của kỳ ĐANG CHỌN, `currentDetail` = payload của kỳ trên route —
 * đúng như `CommissionSplitDetailPage` truyền xuống.
 */
function renderTimeline({
  worksheetId,
  localFeePct,
}: {
  worksheetId: number
  localFeePct: number
}) {
  const selectedDetail = {
    period_year: 2026,
    period_month: worksheetId === PREV_WS ? 7 : 8,
    recipients_editable: true,
    dial_note: '',
    receipt_vouchers: [],
    positions: [],
    previous_periods: [],
  }
  const routeDetail = {
    period_year: 2026,
    period_month: 8,
    recipients_editable: true,
    dial_note: '',
    receipt_vouchers: [],
    positions: [],
    // Kỳ 07 nằm trong previous_periods của kỳ 08 (route), KHÔNG nằm trong của chính nó.
    previous_periods: [{ period_year: 2026, period_month: 7, positions: [], receipt_vouchers: [] }],
  }

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/split-sheets/${ROUTE_WS}?worksheet_id=${worksheetId}`]}>
        <PaymentProgressTimeline
          detail={selectedDetail as unknown as CommissionSplitDetail}
          currentDetail={routeDetail as unknown as CommissionSplitDetail}
          sortedAllocations={allocations}
          worksheetId={worksheetId}
          routeIdStr={String(ROUTE_WS)}
          localFeePct={localFeePct}
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
          totalCumPct={72.72}
          currentTotalPaid={0}
          currentMgmtTotalThis={0}
          isTkdaView={false}
          canEditDial
          dialNote=""
          setDialNote={vi.fn()}
          feeDefaultPct={null}
          f2DefaultPct={null}
        />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

/** Thẻ của một kỳ. Phải khoanh đúng thẻ: thanh tiến độ và ô "Lũy kế" in cùng những con số %. */
const periodCard = (year: number, month: number) =>
  within(screen.getByTestId(`period-card-${year}-${month}`))

/** Ô "% TT phí" của một thẻ kỳ. */
const feePctOf = (year: number, month: number) =>
  periodCard(year, month).getByTestId('period-fee-pct').textContent?.trim()

describe('Mục 3 — chọn kỳ nào thì hiển thị số của kỳ đó', () => {
  it('xem kỳ trước: ô "% TT phí" của thẻ kỳ đó là dial của CHÍNH nó, không phải của kỳ route', () => {
    // localFeePct đã được seed từ kỳ đang chọn (29,29), không còn là 43,43 của kỳ route.
    renderTimeline({ worksheetId: PREV_WS, localFeePct: 29.2929292929 })

    expect(feePctOf(2026, 7)).toBe('29,29%')
    // Kỳ 08 không được chọn → đọc số đã lưu của nó (chưa chốt dial → % tiền về của kỳ).
    expect(feePctOf(2026, 8)).toBe('43,43%')
  })

  it('badge "Hiện tại" vẫn neo theo kỳ mở từ danh sách, không nhảy theo kỳ đang chọn', () => {
    renderTimeline({ worksheetId: PREV_WS, localFeePct: 29.2929292929 })

    expect(periodCard(2026, 8).getByText('Hiện tại')).toBeInTheDocument()
    expect(periodCard(2026, 7).queryByText('Hiện tại')).toBeNull()
  })

  it('khối chỉnh dial đi theo kỳ ĐANG CHỌN — kỳ 07 đã duyệt chi nên khoá sửa', () => {
    renderTimeline({ worksheetId: PREV_WS, localFeePct: 29.2929292929 })

    const card = periodCard(2026, 7)
    expect(card.getByText('% THANH TOÁN KỲ NÀY')).toBeInTheDocument()
    expect(card.getByText('Đã duyệt chi (Khóa sửa)')).toBeInTheDocument()
    // Kỳ không được chọn không render khối dial, dù nó là kỳ trên route.
    expect(periodCard(2026, 8).queryByText('% THANH TOÁN KỲ NÀY')).toBeNull()
  })

  it('quay lại kỳ route: dial của kỳ đó hiển thị, kỳ 07 trở về số đã lưu', () => {
    renderTimeline({ worksheetId: ROUTE_WS, localFeePct: 43.4318616136 })

    expect(feePctOf(2026, 8)).toBe('43,43%')
    expect(feePctOf(2026, 7)).toBe('29,29%')
    expect(periodCard(2026, 8).getByText('% THANH TOÁN KỲ NÀY')).toBeInTheDocument()
  })
})
