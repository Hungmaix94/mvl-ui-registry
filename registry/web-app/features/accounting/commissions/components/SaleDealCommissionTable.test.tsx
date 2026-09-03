/**
 * Bảng Mục ① — 5 hình thái "nhận hộ" mà kế toán gặp, đo trên DOM thật.
 *
 * Số liệu lấy từ staging summary 42 / deal HD06-2026-000001 / kỳ 08/2026 (dial phí 50%):
 * NV 642 nhận hộ Đạt 100%, Hoàng 100%, Cường 60% — ba suất khác rate, gom vào MỘT deal group
 * vì BE key `by_deal` theo `deal_id`.
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/firebase', () => ({
  default: null,
  getFCMToken: vi.fn(),
  onMessageListener: vi.fn(),
  messaging: null,
  analytics: null,
}))
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }))
vi.mock('firebase/analytics', () => ({ getAnalytics: vi.fn() }))
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  onMessage: vi.fn(),
  isSupported: vi.fn().mockResolvedValue(false),
}))

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SaleDealCommissionTable from './SaleDealCommissionTable'
import type { DealPayableGroup } from '../utils/summary-breakdown'

const SALE_PCT = 'pct_sale_commission'

const item = (
  overrides: Partial<Record<string, unknown>> & { amount: string; share_full_amount: string }
) =>
  ({
    line_id: 1,
    payable_id: 1,
    pct_type: SALE_PCT,
    participation_pct: '35.000',
    effective_commission_pct: '0.6300',
    proxy_pct: '100.00',
    proxy_base_amount: overrides.amount,
    status: 'UNPAID',
    already_paid_externally: false,
    pit_withheld_at_payment: '0',
    received_on_behalf: false,
    original_beneficiary: null,
    ...overrides,
  }) as any

const proxyOf = (id: number, name: string, rest: Record<string, unknown>) =>
  item({
    line_id: id,
    payable_id: id,
    received_on_behalf: true,
    original_beneficiary: { type: 'employee', id, name },
    ...rest,
  } as any)

const deal = (items: unknown[], overrides: Partial<DealPayableGroup> = {}): DealPayableGroup =>
  ({
    deal_id: 1,
    deal_code: 'HD06-2026-000001',
    unit_id: 27,
    unit_code: 'BH000002399',
    unit_number: 'F1-0912',
    project: { id: 6, name: 'Dự án A' },
    customer: { id: 1, fullname: 'KH A' },
    fee_calculation_price: '6086978472',
    participation_pct: '35.000',
    participation_source: 'share',
    commission_percentage: '1.800',
    effective_commission_pct: '0.6300',
    total_commission: '109565612',
    received_amount: '60261086',
    payment_progress_pct: '55.00',
    dial_fee_progress_pct: '50.0000000000',
    worksheet_id: 73,
    worksheet_code: 'TCK000000073',
    receipt_dates: ['2026-08-13'],
    subtotal: '48208869',
    items,
    ...overrides,
  }) as unknown as DealPayableGroup

const renderTable = (deals: DealPayableGroup[], { canViewSplitSheet = true } = {}) =>
  render(
    <MemoryRouter>
      <SaleDealCommissionTable deals={deals} canViewSplitSheet={canViewSplitSheet} />
    </MemoryRouter>
  )

const THREE_SOURCES = [
  proxyOf(661, 'Phan Thành Đạt', {
    amount: '19173982',
    share_full_amount: '38347964',
    effective_commission_pct: '0.6300',
    proxy_pct: '100.00',
  }),
  proxyOf(652, 'Nguyễn Văn Hoàng', {
    amount: '19173982',
    share_full_amount: '38347964',
    effective_commission_pct: '0.6300',
    proxy_pct: '100.00',
  }),
  proxyOf(649, 'Bùi Quang Cường', {
    amount: '9860905',
    share_full_amount: '32869684',
    effective_commission_pct: '0.5400',
    proxy_pct: '60.00',
  }),
]

const OWN_ITEM = item({
  line_id: 90,
  payable_id: 90,
  amount: '10000000',
  share_full_amount: '20000000',
  effective_commission_pct: '1.0000',
})

describe('Mục ① — trường hợp 1: chính chủ, không nhận hộ ai', () => {
  it('một dòng phẳng, badge "Chính chủ", không có nút bung', () => {
    renderTable([deal([OWN_ITEM], { subtotal: '10000000' })])

    expect(screen.getByText('chính chủ')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Xem chi tiết từng người đứng tên/ })).toBeNull()
  })
})

describe('Mục ① — trường hợp 2: nhận hộ đúng một người', () => {
  it('badge nêu đích danh người đứng tên, vẫn một dòng phẳng', () => {
    renderTable([deal([THREE_SOURCES[0]], { subtotal: '19173982' })])

    // Pill chỉ mang quan hệ; tên đứng riêng dòng dưới nên không kéo dài pill ra.
    expect(screen.getByText('nhận hộ')).toBeInTheDocument()
    expect(screen.getByText('NV Phan Thành Đạt')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Xem chi tiết từng người đứng tên/ })).toBeNull()
  })

  it('nhận hộ một phần thì tỷ lệ nằm TRONG pill, trọn suất thì không in 100%', () => {
    const { unmount } = renderTable([deal([THREE_SOURCES[2]], { subtotal: '9860905' })])
    expect(screen.getByText('nhận hộ 60%')).toBeInTheDocument()
    expect(screen.getByText('NV Bùi Quang Cường')).toBeInTheDocument()
    unmount()

    renderTable([deal([THREE_SOURCES[0]], { subtotal: '19173982' })])
    expect(screen.getByText('nhận hộ')).toBeInTheDocument()
    expect(screen.queryByText(/nhận hộ 100%/)).toBeNull()
  })

  it('bảng kê 45 — tên dài + tỷ lệ lẻ không dồn hết vào một pill', () => {
    // "Nhận hộ · NV Nguyễn Quỳnh Trang · 50%" (34 ký tự) từng wrap giữa pill và vỡ viền bo.
    const trang = proxyOf(643, 'Nguyễn Quỳnh Trang', {
      amount: '5000000',
      share_full_amount: '20000000',
      effective_commission_pct: '0.7500',
      proxy_pct: '50.00',
    })
    renderTable([deal([trang], { subtotal: '5000000' })])

    expect(screen.getByText('nhận hộ 50%')).toBeInTheDocument()
    expect(screen.getByText('NV Nguyễn Quỳnh Trang')).toBeInTheDocument()
    // Cụm dài chỉ còn ở tooltip, không còn là nội dung của pill.
    expect(screen.queryByText('Nhận hộ · NV Nguyễn Quỳnh Trang')).toBeNull()
  })
})

describe('Mục ① — trường hợp 3-4: nhận hộ nhiều người', () => {
  it('dòng deal gộp lại và liệt kê ĐỦ số nguồn, không chỉ người đầu tiên', async () => {
    renderTable([deal(THREE_SOURCES)])

    // Bản cũ hiện đúng một badge "Nhận hộ · NV Phan Thành Đạt" cho cả ba nguồn.
    expect(screen.getByText('nhận hộ 3 người')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Xem chi tiết từng người đứng tên/ }))
    expect(screen.getByText('NV Phan Thành Đạt')).toBeInTheDocument()
    expect(screen.getByText('NV Nguyễn Văn Hoàng')).toBeInTheDocument()
    expect(screen.getByText('NV Bùi Quang Cường')).toBeInTheDocument()
  })

  it('cột "HH bán hàng" cộng cả ba nguồn thay vì in item đầu', () => {
    renderTable([deal(THREE_SOURCES)])

    // Lỗi cũ (`items.find`): 19.173.982. Đúng: 19.173.982 + 19.173.982 + 9.860.905.
    expect(screen.getAllByText('48.208.869').length).toBeGreaterThan(0)
  })

  it('"% HH" là tổng phần của người hưởng, không phải rate của riêng một sale', () => {
    renderTable([deal(THREE_SOURCES)])

    // 0,63 + 0,63 + 0,54×60% = 1,5840%. Bản cũ in 0,6300% (rate riêng của Đạt).
    expect(screen.getByText('1,5840%')).toBeInTheDocument()
    expect(screen.queryByText('0,6300%')).toBeNull()
  })

  it('"HH ghi nhận" và "HH thực tế" là hai số khác nhau, khớp với dial', () => {
    renderTable([deal(THREE_SOURCES)])

    // Ghi nhận (đủ tiền) 96.417.738 × dial 50% = thực tế 48.208.869.
    expect(screen.getAllByText('96.417.738').length).toBeGreaterThan(0)
    expect(screen.getAllByText('48.208.869').length).toBeGreaterThan(0)
  })

  it('dòng con giữ rate và tỷ lệ nhận hộ của CHÍNH người đó', async () => {
    renderTable([deal(THREE_SOURCES)])
    await userEvent.click(screen.getByRole('button', { name: /Xem chi tiết từng người đứng tên/ }))

    // Cường: 0,5400% × 60% = 0,3240%, ghi nhận 32.869.684 × 60% = 19.721.810.
    expect(screen.getByText('0,5400%')).toBeInTheDocument()
    expect(screen.getByText(/0,3240%/)).toBeInTheDocument()
    expect(screen.getByText('19.721.810')).toBeInTheDocument()
  })
})

describe('Mục ① — trường hợp 5: vừa tự bán vừa nhận hộ người khác', () => {
  it('tách "Chính chủ" và người được nhận hộ thành hai dòng con riêng', async () => {
    renderTable([deal([OWN_ITEM, THREE_SOURCES[2]], { subtotal: '19860905' })])

    // Nhãn dòng cha phải nói rõ có phần tự bán — không gọi cả dòng là "nhận hộ 2 người".
    expect(screen.getByText('chính chủ + nhận hộ 1')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Xem chi tiết từng người đứng tên/ }))
    expect(screen.getByText('chính chủ')).toBeInTheDocument()
    expect(screen.getByText('NV Bùi Quang Cường')).toBeInTheDocument()
  })
})

describe('Mục ① — entry point và ngày thu', () => {
  it('mã căn và phiếu chia đều là link', () => {
    renderTable([deal(THREE_SOURCES)])

    expect(screen.getByRole('link', { name: 'F1-0912' })).toHaveAttribute(
      'href',
      '/project-admin/project/product-inventory/27'
    )
    expect(screen.getByRole('link', { name: /Phiếu chia TCK000000073/ })).toHaveAttribute(
      'href',
      '/accounting/commission-sale/split-sheets/73'
    )
  })

  it('không có quyền xem worksheet thì ẩn link phiếu chia, mã căn vẫn còn', () => {
    renderTable([deal(THREE_SOURCES)], { canViewSplitSheet: false })

    expect(screen.queryByRole('link', { name: /Phiếu chia/ })).toBeNull()
    expect(screen.getByRole('link', { name: 'F1-0912' })).toBeInTheDocument()
  })

  it('BE không trả worksheet thì không dựng link chết', () => {
    renderTable([deal(THREE_SOURCES, { worksheet_id: null, worksheet_code: null })])

    expect(screen.queryByRole('link', { name: /Phiếu chia/ })).toBeNull()
  })

  it('ngày thu hiện dưới ô "% tiền về (đã thu)" thay vì cột riêng in cứng "—"', () => {
    renderTable([deal(THREE_SOURCES)])

    expect(screen.getByText('13/08/2026')).toBeInTheDocument()
    expect(screen.queryByText('Ngày thu')).toBeNull()
  })

  it('nhiều phiếu thu thì hiện ngày đầu kèm đuôi "+N"', () => {
    renderTable([deal(THREE_SOURCES, { receipt_dates: ['2026-08-13', '2026-08-20'] })])

    expect(screen.getByText(/13\/08\/2026 \+1/)).toBeInTheDocument()
  })
})

describe('Mục ① — dòng TỔNG', () => {
  it('cộng qua nhiều deal, kể cả deal nhận hộ nhiều người', () => {
    const second = deal([OWN_ITEM], {
      deal_id: 2,
      deal_code: 'HD06-2026-000002',
      subtotal: '10000000',
      fee_calculation_price: '1000000000',
    })
    renderTable([deal(THREE_SOURCES), second])

    // HH thực tế: 48.208.869 + 10.000.000. HH ghi nhận: 96.417.738 + 20.000.000.
    expect(screen.getAllByText('58.208.869').length).toBeGreaterThan(0)
    expect(screen.getAllByText('116.417.738').length).toBeGreaterThan(0)
  })

  it('bảng rỗng vẫn dựng dòng trống thay vì vỡ', () => {
    renderTable([])
    expect(screen.getByText('Không có deal nào được ghi nhận trong kỳ này')).toBeInTheDocument()
  })
})

describe('Mục ① — pill nguồn dùng đúng quy ước màu của bảng chia thực nhận', () => {
  it('chính chủ = pill xanh lá, nhận hộ = pill hổ phách', () => {
    renderTable([deal([OWN_ITEM, THREE_SOURCES[2]], { subtotal: '19860905' })])

    // Cùng cặp màu `RecipientPayoutTable` (màn 20.8) đang dùng — kế toán đi giữa hai màn
    // không phải học lại quy ước.
    expect(screen.getByText('chính chủ + nhận hộ 1').className).toContain('bg-amber-100')
  })

  it('nhãn viết thường, khớp bảng chia thực nhận', () => {
    renderTable([deal([OWN_ITEM], { subtotal: '10000000' })])

    const pill = screen.getByText('chính chủ')
    expect(pill.className).toContain('bg-green-100')
    expect(pill.className).toContain('text-green-800')
    expect(screen.queryByText('Chính chủ')).toBeNull()
  })
})
