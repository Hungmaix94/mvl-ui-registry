// @vitest-environment jsdom
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Component chỉ đọc 1 hook service; stub để test render thuần, không đụng mạng.
const mockUseDealPaymentProgress = vi.fn()
vi.mock('../services/commission-splits-service', () => ({
  useDealPaymentProgress: (...args: unknown[]) => mockUseDealPaymentProgress(...args),
}))

import { DealPaymentProgressTable } from './DealPaymentProgressTable'

/**
 * G9 + G1 (plan_recon_progress_retro_gaps_20260729).
 *
 * Dữ liệu lấy từ deal HD06-2026-000004: kỳ IRS0008 có hóa đơn DRAFT (chưa cấp số ngoài)
 * và chưa có phiếu thu — đúng dòng đang giữ khoản lệch 1.221.391 mà trước đây render "—"
 * ở cả cột Số HĐ lẫn Phiếu thu.
 */
const period = (over: Record<string, unknown> = {}) => ({
  ir_id: 9,
  sheet_id: 8,
  ref_code: 'SST-IRS0008-001',
  invoice_no: '',
  invoice_id: 4,
  invoice_code: 'HDOUT000000004',
  invoice_status: 'DRAFT',
  vouchers: [],
  payment_period: null,
  date: '2026-07-21T09:30:26Z',
  period_pct: '30.00',
  due: {
    agency_fee: '48677530',
    bonus: '0',
    deduction: '0',
    retro: '0',
    total: '48677530',
  },
  received: '0',
  invoice_gross: '53545283',
  // BE gui % o numeric(14,10) ROUND_DOWN; FE cat xuong 2dp mot lan khi render.
  investor_paid_pct: '0.0000000000',
  fee_collection_pct: '0.0000000000',
  bonus_collection_pct: '0.0000000000',
  shared_bonus_to_sale_pct: null,
  received_fee: '0',
  received_bonus: '0',
  ...over,
})

const mount = (periods: unknown[]) => {
  mockUseDealPaymentProgress.mockReturnValue({
    data: {
      deal_id: 4,
      deal_code: 'HD06-2026-000004',
      summary: {
        total_due: '158187131',
        total_due_breakdown: {
          agency_fee: '158187131',
          extra_bonus: '0',
          shared_bonus: '0',
          fee_deduction: '0',
        },
        total_shared_bonus: '0',
        total_received: '120460562',
        total_received_net: '109509601',
        remaining: '48677530',
        payment_progress_pct: '69.23',
        fee_collection_cum_pct: '70.0000000000',
        bonus_collection_cum_pct: '0.0000000000',
      },
      periods,
      unassigned_received: '0',
      receipts: [],
    },
    isLoading: false,
  })
  return render(
    <MemoryRouter>
      <DealPaymentProgressTable dealId={4} />
    </MemoryRouter>
  )
}

beforeEach(() => mockUseDealPaymentProgress.mockReset())

describe('Cột "Số HĐ" — điểm vào hóa đơn', () => {
  it('hóa đơn DRAFT: vẫn có link, nhãn là mã nội bộ, kèm badge "Hóa đơn nháp"', () => {
    mount([period()])

    const link = screen.getByRole('link', { name: 'HDOUT000000004' })
    expect(link).toHaveAttribute('href', '/accounting/transactions/sales-invoices/4')
    expect(screen.getByText('Hóa đơn nháp')).toBeInTheDocument()
  })

  it('hóa đơn đã phát hành: ưu tiên số HĐ ngoài, không badge nháp', () => {
    mount([period({ invoice_no: 'HĐ 9/2026', invoice_status: 'ISSUED' })])

    expect(screen.getByRole('link', { name: 'HĐ 9/2026' })).toBeInTheDocument()
    expect(screen.queryByText('Hóa đơn nháp')).not.toBeInTheDocument()
  })

  it('PENDING (alias legacy của DRAFT) cũng được badge', () => {
    mount([period({ invoice_status: 'PENDING' })])

    expect(screen.getByText('Hóa đơn nháp')).toBeInTheDocument()
  })

  it('ADJUSTED: badge "Đã thay thế"', () => {
    mount([period({ invoice_no: 'HĐ 1/2026', invoice_status: 'ADJUSTED' })])

    expect(screen.getByText('Đã thay thế')).toBeInTheDocument()
  })

  it('không có hóa đơn: giữ "—", không dựng link', () => {
    mount([period({ invoice_id: null, invoice_code: '', invoice_status: null })])

    expect(screen.queryByRole('link', { name: /HDOUT/ })).not.toBeInTheDocument()
  })
})

describe('Cột "Phiếu thu" — vì sao kỳ này chưa ra tiền', () => {
  it('đã phát hành mà chưa có phiếu thu: badge "Chưa có phiếu thu"', () => {
    mount([period({ invoice_no: 'HĐ 9/2026', invoice_status: 'ISSUED' })])

    expect(screen.getByText('Chưa có phiếu thu')).toBeInTheDocument()
  })

  it('hóa đơn còn nháp: KHÔNG lặp badge ở cột phiếu thu (đã có badge cột Số HĐ)', () => {
    mount([period()])

    expect(screen.queryByText('Chưa có phiếu thu')).not.toBeInTheDocument()
  })

  it('đã có phiếu thu: hiện mã phiếu, không badge', () => {
    mount([
      period({
        invoice_no: 'HĐ 3/2026',
        invoice_status: 'PAID',
        vouchers: [{ voucher_id: 3, code: 'PT000000003', amount: '35696855' }],
      }),
    ])

    expect(screen.getByRole('link', { name: 'PT000000003' })).toBeInTheDocument()
    expect(screen.queryByText('Chưa có phiếu thu')).not.toBeInTheDocument()
  })
})

describe('Cột "Phí đại lý" — dòng truy hồi', () => {
  it('retro âm: hiện dòng "Truy hồi: −..."', () => {
    mount([period({ due: { ...period().due, retro: '-2035651' } })])

    expect(screen.getByText(/Truy hồi: −/)).toBeInTheDocument()
  })

  it('retro dương: hiện dấu +', () => {
    mount([period({ due: { ...period().due, retro: '4071301' } })])

    expect(screen.getByText(/Truy hồi: \+/)).toBeInTheDocument()
  })

  it('retro = 0: ẩn hoàn toàn', () => {
    mount([period()])

    expect(screen.queryByText(/Truy hồi/)).not.toBeInTheDocument()
  })
})

describe('Làm tròn % — dòng phải cộng lại ra đúng ô "Lũy kế toàn căn"', () => {
  /**
   * Bug đã nhận từ kế toán trên split-sheet 1: hai dòng "% TT phí" hiện 69,22 khi cộng tay
   * nhưng ô lũy kế hiện 69,23. Nguyên nhân là làm tròn ở ba điểm khác nhau — mỗi dòng tròn
   * 2dp, tổng tròn 2dp riêng trên số chưa tròn, và Mục 3 lại cộng các số đã tròn.
   *
   * Số ở đây dựng đúng vùng gây lệch: 34,6124 + 34,6126 = 69,225. Half-up cho 34,61 + 34,61
   * = 69,22 ở dòng nhưng 69,23 ở tổng. Cắt xuống (floor) cho cả hai đều 69,22.
   */
  const twoPeriods = [
    period({ ir_id: 1, fee_collection_pct: '34.6124000000', investor_paid_pct: '50.0000000000' }),
    period({ ir_id: 2, fee_collection_pct: '34.6126000000', investor_paid_pct: '50.0000000000' }),
  ]

  it('cắt xuống 2dp: hai dòng 34,61% và lũy kế 69,22% — không còn 69,23%', () => {
    mockUseDealPaymentProgress.mockReturnValue({
      data: {
        deal_id: 4,
        deal_code: 'HD06-2026-000004',
        summary: {
          total_due: '158187131',
          total_due_breakdown: {
            agency_fee: '158187131',
            extra_bonus: '0',
            shared_bonus: '0',
            fee_deduction: '0',
          },
          total_shared_bonus: '0',
          total_received: '120460562',
          total_received_net: '109509601',
          remaining: '48677530',
          payment_progress_pct: '69.2250000000',
          fee_collection_cum_pct: '69.2250000000',
          bonus_collection_cum_pct: '0.0000000000',
        },
        periods: twoPeriods,
        unassigned_received: '0',
        receipts: [],
      },
      isLoading: false,
    })
    render(
      <MemoryRouter>
        <DealPaymentProgressTable dealId={4} />
      </MemoryRouter>
    )

    expect(screen.getAllByText('34,61%')).toHaveLength(2)
    expect(screen.getByText('69,22%')).toBeInTheDocument()
    expect(screen.queryByText('69,23%')).not.toBeInTheDocument()
    expect(screen.queryByText('34,62%')).not.toBeInTheDocument()
  })
})
