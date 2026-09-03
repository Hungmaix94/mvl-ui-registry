import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { InvestorReconciliationLine } from '@/features/sales/investor-reconciliations/services/investor-reconciliation-line-service'

vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: () => true }) }))

// `@/routes` pulls the whole route tree (and menu-items) in; the card only needs two paths.
vi.mock('@/routes', () => ({
  APP_PATH: {
    DEAL_DETAIL: '/deal/:id',
    PROJECT_PRODUCT_INVENTORIES_DETAIL: '/product-inventory/:id',
  },
}))

vi.mock(
  '@/features/sales/investor-reconciliations-v2/hooks/useInvestorReconciliationLineDelete',
  () => ({
    useInvestorReconciliationLineDelete: () => ({ openDeleteLineDialog: vi.fn() }),
  })
)

// The three expanded-panel children each fetch on mount — stubbing them keeps this suite about
// the card's own layout/toggle behaviour and lets the test assert when they get mounted at all.
vi.mock(
  '@/features/sales/investor-reconciliations-v2/components/InvestorReconciliationUnitLedger',
  () => ({ default: () => <div data-testid="ledger" /> })
)
vi.mock(
  '@/features/sales/investor-reconciliations-v2/components/AddInvestorReconciliationUnitHistoryCards',
  () => ({ default: () => <div data-testid="history" /> })
)
vi.mock(
  '@/features/sales/investor-reconciliations-v2/components/InvestorReconciliationBonusAdvanceSection',
  () => ({ default: () => <div data-testid="bonus-advance" /> })
)

import InvestorReconciliationUnitCard from './InvestorReconciliationUnitCard'

/**
 * Số tiền của fixture cộng khớp nhau (VAT 10%) để dải tổng kết đọc được như một phép cộng:
 *   phí đại lý 165.000.000 (gồm VAT) → 150.000.000 chưa VAT
 * + thưởng      22.000.000 (gồm VAT) →  20.000.000 chưa VAT
 * = tổng chưa VAT 170.000.000 → tổng có VAT 187.000.000
 * Tiến độ base (0 → 25%) cố ý KHÁC tiến độ kỳ này (0 → 30%) để test phân biệt được hai dải.
 */
const LINE = {
  id: 1,
  deal: 77,
  deal_detail: { code: 'HD06-2026-001785' },
  product_inventory: 9,
  product_inventory_detail: { unit_number: 'VH100017' },
  status: 'confirmed',
  recon_check: null,
  fee_calculation_price: '10000000000',
  progress_from_pct: '0',
  progress_to_pct: '30',
  pct_agency_fee: '5',
  amt_agency_fee: null,
  base_pct_agency_fee: '5',
  base_amt_agency_fee: null,
  base_progress_from_pct: '0',
  base_progress_to_pct: '25',
  vat_rate: '10',
  period_commission: '165000000',
  retroactive_adjustment_amount: '0',
  shared_bonus_period_amount: '22000000',
  extra_bonus_period_amount: null,
  fee_deduction: null,
  total_amount: '170000000',
  total_amount_with_vat: '187000000',
  is_agency_fee_include_vat: true,
  is_shared_bonus_include_vat: true,
} as unknown as InvestorReconciliationLine

function renderCard(props: Partial<{ canManage: boolean; item: InvestorReconciliationLine }> = {}) {
  return render(
    <MemoryRouter>
      <InvestorReconciliationUnitCard
        sheetId={1532}
        item={props.item ?? LINE}
        canManage={props.canManage ?? true}
      />
    </MemoryRouter>
  )
}

describe('InvestorReconciliationUnitCard — dải thông tin thu gọn', () => {
  // Regression: the strip used a fixed `md:grid-cols-6`, which at a ~924px card gave 134px
  // tracks while the money values need 142–162px, so amounts rendered as "10.000.000.000 V…".
  it('renders money amounts in full instead of truncating them', () => {
    renderCard()

    expect(screen.getByText('10.000.000.000 VNĐ')).toBeInTheDocument()
    expect(screen.getByText('187.000.000 VNĐ')).toBeInTheDocument()
  })

  it('keeps the VAT badge inside the same wrap-capable cell as the amount', () => {
    renderCard()

    // One element holding exactly "<amount><badge>" proves they share a container — the badge
    // used to be nested inside a `truncate` span, where it was clipped instead of wrapping.
    const cell = screen.getByText(
      (_, el) => el?.textContent === '187.000.000 VNĐVAT' && el.className.includes('flex-wrap')
    )
    expect(cell).toBeInTheDocument()
  })

  it('exposes the full label via title so a narrow track can ellipsize it safely', () => {
    renderCard()

    expect(screen.getByText('Phí đại lý')).toHaveAttribute('title', 'Phí đại lý')
  })

  // Hai dải tiến độ là hai trục KHÁC nhau: base neo phần chi ra Sale/F2/CTV, còn tiến độ kỳ này
  // mới là cái nhân ra tiền đối chiếu với CĐT. Mỗi dải hiện đủ mốc luỹ kế "từ → đến" kèm Δ của kỳ
  // trong ngoặc — Δ là chữ thường, KHÔNG bọc pill.
  /**
   * Δ nằm ở span con nên `getByText('0% → 25% (+25%)')` KHÔNG khớp: RTL chỉ ghép các text-node
   * trực tiếp của một element. Khớp trên `textContent` và chốt `tagName === 'SPAN'` để chỉ trúng
   * đúng span bọc ngoài của ô, không trúng luôn các thẻ cha bao nó.
   */
  const progressValue = (text: string) =>
    screen.queryByText((_, el) => el?.tagName === 'SPAN' && el.textContent === text)

  it('hiện cả hai dải tiến độ với mốc từ → đến kèm Δ trong ngoặc', () => {
    renderCard()

    expect(screen.getByText('Tiến độ ĐC base')).toBeInTheDocument()
    expect(progressValue('0% → 25% (+25%)')).toBeInTheDocument()
    expect(screen.getByText('Tiến độ ĐC kỳ này')).toBeInTheDocument()
    expect(progressValue('0% → 30% (+30%)')).toBeInTheDocument()
  })

  it('không hiện tiến độ khi thiếu một trong hai mốc thay vì coi mốc thiếu là 0', () => {
    renderCard({
      item: { ...LINE, base_progress_from_pct: null } as unknown as InvestorReconciliationLine,
    })

    // Chỉ dải base thiếu mốc: 25% biến mất hoàn toàn, còn dải kỳ này phải nguyên vẹn.
    expect(screen.queryByText(/25%/)).not.toBeInTheDocument()
    expect(progressValue('0% → 30% (+30%)')).toBeInTheDocument()
  })
})

describe('InvestorReconciliationUnitCard — dải số tiền kỳ này', () => {
  it('gom đủ các cấu phần tạo nên tổng tiền của căn', () => {
    renderCard()

    expect(screen.getByText('Phí đại lý kỳ này')).toBeInTheDocument()
    expect(screen.getByText('150.000.000 VNĐ')).toBeInTheDocument()
    expect(screen.getByText('Thưởng kỳ này')).toBeInTheDocument()
    expect(screen.getByText('20.000.000 VNĐ')).toBeInTheDocument()
    expect(screen.getByText('Tổng chưa VAT')).toBeInTheDocument()
    expect(screen.getByText('170.000.000 VNĐ')).toBeInTheDocument()
    expect(screen.getByText('Tổng có VAT')).toBeInTheDocument()
  })

  // Mỗi cấu phần lưu theo cờ VAT RIÊNG của nó. In số thô cạnh nhau là đặt các số khác trục lên
  // cùng một dòng — đọc cộng ra tổng chưa VAT sẽ sai. Quy về chưa VAT bằng đúng phép của bảng
  // ledger (reconVatPair) để cả dải nằm trên một trục.
  it('quy cấu phần đang gồm VAT về chưa VAT thay vì in số thô', () => {
    renderCard()

    expect(screen.getByText('150.000.000 VNĐ')).toBeInTheDocument()
    expect(screen.queryByText('165.000.000 VNĐ')).not.toBeInTheDocument()
    expect(screen.queryByText('22.000.000 VNĐ')).not.toBeInTheDocument()
  })

  it('ẩn cấu phần bằng 0 / không có để dải không phình', () => {
    renderCard()

    expect(screen.queryByText('Truy hồi')).not.toBeInTheDocument()
    expect(screen.queryByText('Phí tăng thêm')).not.toBeInTheDocument()
    expect(screen.queryByText('Khấu trừ')).not.toBeInTheDocument()
  })

  it('hiện truy hồi / phí tăng thêm / khấu trừ kèm dấu khi căn có phát sinh', () => {
    renderCard({
      item: {
        ...LINE,
        retroactive_adjustment_amount: '-5500000',
        extra_bonus_period_amount: '3300000',
        is_extra_bonus_include_vat: true,
        fee_deduction: '11000000',
        is_fee_deduction_include_vat: true,
      } as unknown as InvestorReconciliationLine,
    })

    expect(screen.getByText('−5.000.000 VNĐ')).toBeInTheDocument()
    expect(screen.getByText('+3.000.000 VNĐ')).toBeInTheDocument()
    expect(screen.getByText('−10.000.000 VNĐ')).toBeInTheDocument()
  })
})

describe('InvestorReconciliationUnitCard — mở/thu thẻ', () => {
  it('starts collapsed and mounts nothing from the expanded panel', () => {
    renderCard()

    expect(screen.queryByTestId('ledger')).not.toBeInTheDocument()
    expect(screen.queryByTestId('bonus-advance')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mở rộng' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('mounts the panel on expand', async () => {
    renderCard()

    await userEvent.click(screen.getByRole('button', { name: 'Mở rộng' }))

    expect(screen.getByTestId('ledger')).toBeInTheDocument()
    expect(screen.getByTestId('bonus-advance')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thu gọn' })).toHaveAttribute('aria-expanded', 'true')
  })

  // The history list is a second fetch behind its own toggle — expanding the card must not
  // trigger it, otherwise every card open costs an extra request.
  it('leaves the history section closed and unfetched when the card opens', async () => {
    renderCard()

    await userEvent.click(screen.getByRole('button', { name: 'Mở rộng' }))

    expect(screen.getByText('Lịch sử đối chiếu')).toBeInTheDocument()
    expect(screen.queryByTestId('history')).not.toBeInTheDocument()
  })

  it('mounts the history list only once its own toggle is opened', async () => {
    renderCard()

    await userEvent.click(screen.getByRole('button', { name: 'Mở rộng' }))
    await userEvent.click(screen.getByText('Lịch sử đối chiếu'))

    expect(screen.getByTestId('history')).toBeInTheDocument()
  })

  it('collapses back and unmounts the panel', async () => {
    renderCard()

    await userEvent.click(screen.getByRole('button', { name: 'Mở rộng' }))
    await userEvent.click(screen.getByRole('button', { name: 'Thu gọn' }))

    expect(screen.queryByTestId('ledger')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mở rộng' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })
})

describe('InvestorReconciliationUnitCard — cảnh báo lệch cấu hình MV', () => {
  /** Đúng như căn GN10001 của phiếu DAVTT-IRS1535: thiếu số phí tăng thêm + sai cờ VAT của nó. */
  const LINE_WITH_MISMATCHES = {
    ...LINE,
    recon_check: {
      extra_bonus_amount: {
        submitted: null,
        mv_config: '55000000',
        delta: null,
        match: false,
      },
      is_extra_bonus_include_vat: {
        submitted: false,
        mv_config: true,
        delta: null,
        match: false,
      },
      pct_agency_fee: { submitted: '5.00', mv_config: '5.00', delta: '0.00', match: true },
    },
  } as unknown as InvestorReconciliationLine

  /**
   * Bất biến: badge nói "N Cảnh báo" thì mở rộng ra phải đọc được ĐỦ N.
   *
   * Regression: badge đếm cả 3 cờ VAT, còn bảng ledger không có dòng nào để gắn chip cho chúng ⇒
   * căn GN10001 hiện "2 Cảnh báo" mà mở rộng chỉ thấy 1 (cái còn lại là lệch cờ VAT phí tăng thêm).
   */
  it('mở rộng đọc được đủ số cảnh báo mà badge đếm', async () => {
    renderCard({ item: LINE_WITH_MISMATCHES })

    expect(screen.getByText('2 Cảnh báo')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Mở rộng' }))

    expect(screen.getAllByTestId('recon-mismatch-item')).toHaveLength(2)
    expect(screen.getByText('Phí tăng thêm (số tiền)')).toBeInTheDocument()
    expect(screen.getByText('Phí tăng thêm gồm VAT')).toBeInTheDocument()
  })

  it('căn không lệch thì không có badge lẫn khối cảnh báo', async () => {
    renderCard()

    expect(screen.queryByText(/Cảnh báo/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Mở rộng' }))

    expect(screen.queryByTestId('recon-mismatch-item')).not.toBeInTheDocument()
  })

  it('không còn nút xác nhận đối chiếu từng căn', () => {
    renderCard({ item: LINE_WITH_MISMATCHES })

    expect(screen.queryByRole('button', { name: /Xác nhận/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Đã xác nhận')).not.toBeInTheDocument()
  })
})
