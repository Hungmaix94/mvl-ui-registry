import { describe, it, expect, vi } from 'vitest'

// Barrel `@/components/ui` kéo theo `src/lib/firebase.ts`, module này gọi `getMessaging()`
// ngay khi eval và ném trong jsdom (lỗi có sẵn). Chặn tại đây.
vi.mock('@/lib/firebase', () => ({
  default: null,
  getFCMToken: vi.fn(),
  onMessageListener: vi.fn(),
  messaging: null,
  analytics: null,
}))
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}))
vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
}))
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  onMessage: vi.fn(),
  isSupported: vi.fn().mockResolvedValue(false),
}))

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import { CommissionSplitTable } from './CommissionSplitTable'
import type { CommissionSplitListRow } from '../services/commission-splits-service'

vi.mock('@/hooks/useColumnConfig.ts', () => ({
  useColumnConfig: (defaultConfig: any) => ({
    columns: defaultConfig,
    handleApply: vi.fn(),
    handleReset: vi.fn(),
  }),
}))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({
    keysMap: new Map(),
  }),
}))

vi.mock('../services/deal-payment-suspensions-service', () => ({
  useReleasePaymentSuspension: () => ({
    mutateAsync: vi.fn(),
  }),
}))

function createMockRow(
  overrides: Partial<CommissionSplitListRow & Record<string, any>> = {}
): CommissionSplitListRow {
  return {
    worksheet_id: 1,
    worksheet_code: 'TCK001',
    worksheet_status: 'DRAFT',
    representative_pbtv_id: 10,
    deal_id: 100,
    deal_code: 'DEAL001',
    period_year: 2026,
    period_month: 8,
    investor_id: 5,
    investor_name: 'Chủ đầu tư A',
    project_id: 2,
    project_name: 'Dự án B',
    prop_code: 'CAN01',
    unit_number: 'CAN01',
    deposit_date: '2026-08-01',
    list_price: '2000000000',
    basis: '2000000000',
    fee_pct: '5.00',
    fee_amount: '100000000',
    bonus: '0',
    total: '100000000',
    invoice_no: 'HD001',
    receipt_no: 'PT001',
    received: '50000000',
    received_net: '50000000',
    paid_pct: '50.00',
    total_distribution_pct: '50.00',
    status: 'partial',
    is_locked: false,
    payment_suspended: false,
    payment_stopped: false,
    ...overrides,
  } as CommissionSplitListRow
}

function renderComponent(ui: React.ReactNode) {
  return render(
    <SidebarProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </SidebarProvider>
  )
}

describe('CommissionSplitTable — Cột "Phí trả sale (%)"', () => {
  it('hiển thị sales_fee_pct từ dữ liệu', () => {
    const mockData = [
      createMockRow({
        fee_pct: '5.00', // Phí đại lý là 5%
        sales_fee_pct: '2.50', // Phí trả sale là 2.5%
      }),
    ]

    renderComponent(<CommissionSplitTable data={mockData} isLoading={false} />)

    // Header của cột Phí trả sale (%)
    expect(screen.getByText('Phí trả sale (%)')).toBeInTheDocument()
    // Giá trị hiển thị phải là 2,5% (phí trả sale), không phải 5% (phí DT)
    expect(screen.getByText('2,5%')).toBeInTheDocument()
  })

  it('hiển thị "—" khi không có dữ liệu phí trả sale', () => {
    const mockData = [
      createMockRow({
        fee_pct: '5.00',
        sales_fee_pct: null,
      }),
    ]

    renderComponent(<CommissionSplitTable data={mockData} isLoading={false} />)

    const dashElements = screen.getAllByText('—')
    expect(dashElements.length).toBeGreaterThan(0)
  })
})

describe('CommissionSplitTable — thứ tự cột (CR 86eym80zg)', () => {
  /**
   * Đọc nhãn cột theo đúng thứ tự chúng nằm trong DOM.
   *
   * Header 3 tầng: tầng 0 là chữ cái Excel (`(D)`, `(B)`…), tầng 1 mang NHÃN, tầng 2 ẩn. Lọc
   * theo danh sách nhãn đã biết nên chỉ còn đúng tầng 1, và `getAllByRole` trả về theo thứ tự
   * tài liệu — tức đúng thứ tự người dùng nhìn thấy.
   */
  function readColumnLabels(known: string[]): string[] {
    return screen
      .getAllByRole('columnheader')
      .map((header) => header.textContent?.trim() ?? '')
      .filter((text) => known.includes(text))
  }

  it('ba cột "Trạng thái duyệt", "Duyệt lệch tiền về", "Mã deal" nằm cuối bảng', () => {
    renderComponent(<CommissionSplitTable data={[createMockRow()]} isLoading={false} />)

    // Bốn cột đầu bảng cũ + ba cột phải xuống cuối. Đủ để chứng minh chiều di chuyển mà không
    // phải chép lại toàn bộ 28 nhãn (danh sách đó đã được `worksheet-list-columns.test.ts` khoá).
    const known = [
      'Dự án',
      'Mã BĐS',
      'Chủ đầu tư / Nguồn hàng',
      'Trạng thái',
      'Trạng thái duyệt',
      'Duyệt lệch tiền về',
      'Mã deal',
    ]
    const labels = readColumnLabels(known)

    // Lọc theo nhãn nên đổi tên một cột là nó rụng khỏi `labels` — không chốt độ dài thì phép so
    // bên dưới báo lỗi kiểu "thiếu phần tử", đọc không ra nguyên nhân thật.
    expect(labels, 'có nhãn cột trong `known` không tìm thấy trên header').toHaveLength(
      known.length
    )
    expect(labels.slice(-3)).toEqual(['Trạng thái duyệt', 'Duyệt lệch tiền về', 'Mã deal'])
    // Đợt 2 của CR: ba cột định danh xếp Dự án → Mã BĐS → Chủ đầu tư, mở đầu bảng.
    expect(labels.slice(0, 3)).toEqual(['Dự án', 'Mã BĐS', 'Chủ đầu tư / Nguồn hàng'])
  })

  it('hai cột "Dự án" và "Mã BĐS" đông cứng ở đúng toạ độ kế tiếp nhau', () => {
    renderComponent(<CommissionSplitTable data={[createMockRow()]} isLoading={false} />)

    // Đo trên ô THÂN BẢNG (cột lá) — đây mới là phần từng bị bỏ sót: header dính mà thân trôi.
    const cells = screen.getAllByRole('cell')
    const read = (id: string) => {
      const cell = cells.find((c) => c.getAttribute('data-column-id') === id)
      expect(cell, `không thấy ô thân bảng của '${id}'`).toBeTruthy()
      // `sticky` là class Tailwind, `left` là inline style — phải đủ CẢ HAI thì ô mới dính:
      // có `left` mà thiếu class thì `position: static`, `left` bị bỏ qua hoàn toàn.
      return { sticky: cell!.classList.contains('sticky'), left: cell!.style.left }
    }

    // STT có `size` = 64 (w-16). Cột lá KHÔNG có `size` — `useTable` chỉ quy đổi `meta.width` →
    // `size` ở cột cấp 1 — nên bảng render lá ở 150px mặc định của TanStack, KHÔNG phải 180px
    // như `meta.width` ghi. Vậy Mã BĐS dính ở 64 + 150 = 214. Lấy nhầm theo `meta.width` ra 244
    // là hở 30px và nội dung đang cuộn lộ qua khe (đã đo thật trên trình duyệt).
    expect(read('project_name_col')).toEqual({ sticky: true, left: '64px' })
    expect(read('unit_number_col')).toEqual({ sticky: true, left: '214px' })
    // Cột ngay sau khối đông cứng KHÔNG được dính, nếu không cả bảng đứng im.
    expect(read('investor_name_col').sticky).toBe(false)
  })
})
