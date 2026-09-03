import { describe, it, expect, vi, beforeEach } from 'vitest'

// Barrel `@/components/ui` kéo theo `src/lib/firebase.ts`, module này gọi `getMessaging()`
// ngay khi eval và ném trong jsdom (lỗi có sẵn). Chặn tại đây.
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

import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import { MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'
import MgmtCommSummaryPage from './MgmtCommSummaryPage'

const mockUseCommPayrolls = vi.fn()
const mockApprove = vi.fn().mockResolvedValue({})
const mockMarkPaid = vi.fn().mockResolvedValue({})

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('@/features/accounting/comm-payroll/services/comm-payroll-service', () => ({
  useCommPayrolls: (...args: unknown[]) => mockUseCommPayrolls(...args),
  useApproveCommPayroll: () => ({ mutateAsync: mockApprove, isPending: false }),
  useMarkPaidCommPayroll: () => ({ mutateAsync: mockMarkPaid, isPending: false }),
}))

vi.mock('@/services/toast-service', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

/**
 * Nhãn trạng thái do BE cấp qua `/api/constants/` — chép nguyên văn bản đang chạy trên dev
 * (`accounting.MonthlyBeneficiaryCommissionSummary_STATUS_CHOICES`, đo 21/08/2026), để test nói
 * đúng thứ người dùng đọc được chứ không phải nhãn tự chế trong test.
 */
vi.mock('@/hooks/useAppConstant', async () => {
  const { APP_CONSTANT_KEY } = await import('@/constants/app-constant-key')
  return {
    default: () => ({
      keysMap: new Map([
        [
          APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_STATUS_CHOICES,
          {
            DRAFT: 'Bản nháp',
            CONFIRMED: 'Đã xác nhận',
            EMAIL_SENT: 'Đã gửi email',
            PAID: 'Đã thanh toán',
          },
        ],
      ]),
      keysMapOptions: new Map(),
    }),
  }
})

vi.mock('@/features/accounting/accounting-periods/services/accounting-period-service', () => ({
  useCurrentAccountingPeriod: () => ({ data: { id: 1, year: 2026, month: 7 }, isLoading: false }),
  useAllAccountingPeriods: () => ({ data: [{ id: 1, year: 2026, month: 7 }] }),
}))

vi.mock('@/features/accounting/accounting-periods/components/AccountingPeriodSelect', () => ({
  default: () => <div data-testid="period-select" />,
}))

vi.mock('@/features/employee/services/employee-service', () => ({
  useEmployeesByIds: () => ({ data: [] }),
}))
vi.mock('@/features/accounting/collaborators/services/collaborator-service', () => ({
  useCollaborators: () => ({ data: { results: [] } }),
}))
vi.mock('@/services/realestate-service', () => ({
  useExchanges: () => ({ data: { results: [] } }),
}))

/**
 * Hai dòng của TRANG ĐANG XEM. Cố tình để số bé và tròn, khác hẳn số trong `summary`, để một
 * dòng tổng cộng nhầm trên `results` sẽ lộ ra ngay bằng con số chứ không phải bằng suy đoán.
 */
const PAGE_ROWS = [
  makeRow({
    summary_id: 1,
    role_amount: '100',
    net_payable: '90',
    pre_tax_total: '110',
    bank_payout_amount: '11',
    cash_payout_amount: '22',
  }),
  makeRow({
    summary_id: 2,
    role_amount: '200',
    net_payable: '180',
    pre_tax_total: '220',
    bank_payout_amount: '44',
    cash_payout_amount: '55',
  }),
]

/** Tổng của TOÀN kỳ 12 người — con số BE trả trong khối `summary`. */
const WHOLE_PERIOD_SUMMARY = {
  role: 'manager',
  beneficiary_count: 12,
  total_role_amount: '27241460',
  total_net: '89612579',
  tp_amount: '3419563',
  gd_amount: '300159',
  tgd_amount: '19458737',
  gdda_amount: '5131018',
  thu_ky_amount: '0',
  hhbs_amount: '79055031',
  promotion_amount: '79055031',
  backoffice_amount: '0',
  investor_bonus_amount: '0',
  other_mgmt_amount: '0',
  slk_amount: '0',
  transfer_net_amount: '0',
  role_amount: '27241460',
  // Tiền ĐÃ CHI của cả kỳ. Cố tình khác hẳn tổng hai dòng của trang (11+22+44+55 = 132) để một
  // dòng tổng cộng nhầm trên `results` lộ ra bằng con số.
  bank_payout_amount: '70000000',
  cash_payout_amount: '5000000',
  pre_tax_total: '102198601',
  pit_amount: '9586023',
  net_payable: '89612579',
}

/** Ô của MỘT cột cụ thể trong một dòng — tra theo `data-column-id` thay vì tìm text toàn bảng. */
function cellIn(row: HTMLElement, columnId: string): HTMLElement | null {
  return row.querySelector<HTMLElement>(`[data-column-id="${columnId}"]`)
}

/**
 * Dòng dữ liệu đầu tiên. Phải bám `<tbody>`: `getAllByRole('row')` trả CẢ dòng header, mà `<th>`
 * cũng mang `data-column-id` — tìm dòng theo `data-column-id` sẽ trúng header và assert đọc ra tên
 * cột thay vì số tiền.
 */
function firstDataRow(): HTMLElement {
  const row = screen
    .getAllByRole('row')
    .find(
      (r) => within(r).queryAllByRole('cell').length > 0 && !/TỔNG CỘNG/.test(r.textContent ?? '')
    )
  if (!row) throw new Error('không có dòng dữ liệu nào trong bảng')
  return row
}

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    summary_id: 1,
    year: 2026,
    month: 7,
    role: 'manager',
    beneficiary_type: 'employee',
    beneficiary_employee_id: 1,
    beneficiary_collaborator_id: null,
    beneficiary_exchange_id: null,
    role_amount: '0',
    pre_tax_total: '0',
    pit_amount: '0',
    net_payable: '0',
    tp_amount: '0',
    gd_amount: '0',
    tgd_amount: '0',
    gdda_amount: '0',
    thu_ky_amount: '0',
    other_mgmt_amount: '0',
    hhbs_amount: '0',
    promotion_amount: '0',
    backoffice_amount: '0',
    investor_bonus_amount: '0',
    slk_amount: '0',
    transfer_net_amount: '0',
    bank_payout_amount: '0',
    cash_payout_amount: '0',
    status: 'DRAFT',
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        '/accounting/report/management-commission-summary?page=1&page_size=25&year=2026&month=7',
      ]}
    >
      <SidebarProvider>
        <MgmtCommSummaryPage />
      </SidebarProvider>
    </MemoryRouter>
  )
}

/** `<tfoot>` phơi ra như một `rowgroup`; dòng tổng là dòng duy nhất mang nhãn "TỔNG CỘNG". */
const findSummaryRow = () => screen.findByRole('row', { name: /TỔNG CỘNG/ })

function mockList(data: Record<string, unknown>) {
  mockUseCommPayrolls.mockReturnValue({ data, isLoading: false, refetch: vi.fn() })
}

describe('MgmtCommSummaryPage — dòng TỔNG CỘNG', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lấy số từ khối `summary` của API, KHÔNG cộng các dòng của trang đang xem', async () => {
    mockList({
      count: 12,
      next: null,
      previous: null,
      results: PAGE_ROWS,
      summary: WHOLE_PERIOD_SUMMARY,
    })

    renderPage()
    const row = await findSummaryRow()

    // Tổng cả kỳ...
    expect(row).toHaveTextContent('27.241.460 đ')
    expect(row).toHaveTextContent('89.612.579 đ')
    // Cột "Tổng" nay là tiền ĐÃ CHI của cả kỳ (70.000.000 + 5.000.000), không còn là
    // `pre_tax_total` — ClickUp 86eykqunv Bug1.
    expect(cellIn(row, 'payout_total')).toHaveTextContent('75.000.000 đ')
    // ...chứ KHÔNG phải tổng hai dòng đang hiển thị (100+200 / 90+180 / 11+22+44+55).
    expect(row).not.toHaveTextContent('300 đ')
    expect(row).not.toHaveTextContent('270 đ')
    expect(row).not.toHaveTextContent('132 đ')
  })

  it('nhãn đếm theo `beneficiary_count` của cả kỳ, không phải số dòng của trang', async () => {
    mockList({
      count: 12,
      next: null,
      previous: null,
      results: PAGE_ROWS,
      summary: WHOLE_PERIOD_SUMMARY,
    })

    renderPage()
    const row = await findSummaryRow()

    expect(row).toHaveTextContent('TỔNG CỘNG (12 bản ghi)')
    expect(row).not.toHaveTextContent('(2 bản ghi)')
  })

  it('thiếu khối `summary` thì in em dash, không âm thầm cộng trang thành tổng kỳ', async () => {
    mockList({ count: 12, next: null, previous: null, results: PAGE_ROWS })

    renderPage()
    const row = await findSummaryRow()

    expect(row).toHaveTextContent('—')
    expect(row).not.toHaveTextContent('300 đ')
  })

  it('kỳ rỗng không render dòng tổng', async () => {
    mockList({ count: 0, next: null, previous: null, results: [], summary: null })

    renderPage()

    expect(await screen.findByText(/Không có dữ liệu/)).toBeTruthy()
    expect(screen.queryByRole('row', { name: /TỔNG CỘNG/ })).toBeNull()
  })
})

/**
 * Cột này từng là `cell: () => '-'` cứng, nên BE trả tiền thật mà màn vẫn trống (ClickUp 86eykq956,
 * phần "dev check thêm logic các cột khác"). Số dùng ở đây lấy từ dev kỳ 07/2026: hai người có
 * `thu_ky_amount`, tổng cả kỳ 5.030.250đ. Giá trị dòng và giá trị tổng cố tình khác nhau để một
 * bên hỏng không thể núp sau bên còn lại.
 */
describe('MgmtCommSummaryPage — cột "Thưởng thư ký"', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /** Ô ở cột `header` của dòng dữ liệu đầu tiên, dò theo vị trí cột chứ không theo nội dung. */
  async function cellUnderHeader(header: string) {
    const headers = await screen.findAllByRole('columnheader')
    const index = headers.findIndex((th) => th.textContent?.trim() === header)
    expect(index).toBeGreaterThanOrEqual(0)

    const dataRow = screen
      .getAllByRole('row')
      .find((row) => within(row).queryAllByRole('cell').length > index)
    expect(dataRow).toBeTruthy()

    return within(dataRow!).getAllByRole('cell')[index]
  }

  it('in `thu_ky_amount` của dòng thay vì gạch ngang cố định', async () => {
    mockList({
      count: 1,
      next: null,
      previous: null,
      results: [makeRow({ summary_id: 1, thu_ky_amount: '2300162' })],
      summary: { ...WHOLE_PERIOD_SUMMARY, beneficiary_count: 2, thu_ky_amount: '5030250' },
    })

    renderPage()

    expect(await cellUnderHeader('Thưởng thư ký')).toHaveTextContent('2.300.162 đ')
  })

  it('dòng TỔNG CỘNG lấy `thu_ky_amount` của cả kỳ, không phải của trang', async () => {
    mockList({
      count: 1,
      next: null,
      previous: null,
      results: [makeRow({ summary_id: 1, thu_ky_amount: '2300162' })],
      summary: { ...WHOLE_PERIOD_SUMMARY, beneficiary_count: 2, thu_ky_amount: '5030250' },
    })

    renderPage()
    const row = await findSummaryRow()

    expect(row).toHaveTextContent('5.030.250 đ')
    expect(row).not.toHaveTextContent('2.300.162 đ')
  })

  it('không có thưởng thư ký thì in gạch ngang, không phải "0 đ"', async () => {
    mockList({
      count: 1,
      next: null,
      previous: null,
      results: [makeRow({ summary_id: 1, thu_ky_amount: '0' })],
      summary: { ...WHOLE_PERIOD_SUMMARY, beneficiary_count: 1, thu_ky_amount: '0' },
    })

    renderPage()
    const cell = await cellUnderHeader('Thưởng thư ký')

    expect(cell.textContent?.trim()).toBe('-')
  })
})

describe('MgmtCommSummaryPage — cột hiển thị', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /** ClickUp 86eykqe00 — QA khoanh "THỪA CỘT": bảng từng cõng HAI cặp cột cho cùng một
   *  khái niệm nhận tiền, cả hai cặp đều chưa có nguồn dữ liệu. Giữ cặp cuối bảng
   *  ("Chuyển khoản" / "Tiền mặt"), bỏ cặp trùng nghĩa phía trước. */
  it('bỏ "Nhận qua ngân hàng" và "Nhận tiền mặt", giữ "Chuyển khoản" và "Tiền mặt"', async () => {
    mockList({
      count: 12,
      next: null,
      previous: null,
      results: PAGE_ROWS,
      summary: WHOLE_PERIOD_SUMMARY,
    })

    renderPage()
    await findSummaryRow()

    expect(screen.queryByRole('columnheader', { name: 'Nhận qua ngân hàng' })).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'Nhận tiền mặt' })).toBeNull()
    expect(screen.getByRole('columnheader', { name: 'Chuyển khoản' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Tiền mặt' })).toBeTruthy()
  })
})

/**
 * ClickUp 86eykqunv Bug3 — "Cộng thực tế" phải cộng ra được từ các cột hiển thị bên trái nó.
 * Đo trên dev kỳ 07/2026 trước CR: lệch ở 15/24 dòng vì ba nguồn tiền của wave quản lý không có
 * cột nào (SLK, chuyển/khấu trừ HHQL, và HHQL không map vào bucket tổ chức). Cùng luật mà màn
 * tham chiếu "HH theo tháng — Quản lý" đã canh trong `CommMgrMonthlyTable.test.tsx`.
 */
describe('MgmtCommSummaryPage — "Cộng thực tế" phải đối chiếu được với các cột thành phần', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /** Mọi cột nằm trong khoảng "Hoa hồng TP" → "F2" mà biểu mẫu cộng vào "Cộng thực tế". */
  const COMPONENT_HEADERS = [
    'Hoa hồng TP',
    'Hoa hồng GĐ',
    'Hoa Hồng TGĐ',
    'HHGĐ Dự Án',
    'Thưởng HHBS',
    'Thưởng thư ký',
    'HHQL khác',
    'Backoffice',
    'HH Sàn liên kết',
    'Chuyển/Khấu trừ HHQL',
  ]

  it('có đủ cột cho mọi nguồn tiền của wave quản lý', async () => {
    mockList({
      count: 12,
      next: null,
      previous: null,
      results: PAGE_ROWS,
      summary: WHOLE_PERIOD_SUMMARY,
    })
    renderPage()
    await findSummaryRow()

    for (const header of COMPONENT_HEADERS) {
      expect(screen.getByRole('columnheader', { name: header })).toBeTruthy()
    }
  })

  it('ba cột mới nằm TRƯỚC "Cộng thực tế" — biểu mẫu đọc "Sum từ HH TP đến hết F2"', async () => {
    mockList({
      count: 12,
      next: null,
      previous: null,
      results: PAGE_ROWS,
      summary: WHOLE_PERIOD_SUMMARY,
    })
    renderPage()
    await findSummaryRow()

    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())
    // Phải ném khi vắng cột: `indexOf` trả -1, mà `-1 < <bất kỳ số dương nào>` là true, nên một
    // phép so sánh trần vẫn XANH kể cả khi cột bị gỡ mất — đúng thứ test này sinh ra để bắt.
    const at = (name: string) => {
      const i = headers.indexOf(name)
      if (i < 0) throw new Error(`không có cột "${name}" trên bảng`)
      return i
    }
    // Đặt sau "Cộng thực tế" thì con số vẫn đúng nhưng công thức của biểu mẫu lại sai.
    expect(at('Hoa hồng TP')).toBeLessThan(at('HHQL khác'))
    expect(at('HHQL khác')).toBeLessThan(at('Cộng thực tế'))
    expect(at('HH Sàn liên kết')).toBeLessThan(at('Cộng thực tế'))
    expect(at('Chuyển/Khấu trừ HHQL')).toBeLessThan(at('F2'))
    expect(at('F2')).toBeLessThan(at('Cộng thực tế'))
  })

  it('in số của dòng chỉ có tiền SLK / chuyển vào, thay vì gạch ngang', async () => {
    // Ca thật kỳ 07/2026: có người cả kỳ chỉ là `slk` (2.292.864) hoặc chỉ là tiền chuyển vào
    // (11.111.111). Trước CR mọi cột thành phần đều "-" trong khi "Cộng thực tế" vẫn có số.
    mockList({
      count: 1,
      next: null,
      previous: null,
      results: [
        makeRow({
          summary_id: 9,
          slk_amount: '2292864',
          transfer_net_amount: '11111111',
          role_amount: '13403975',
        }),
      ],
      summary: WHOLE_PERIOD_SUMMARY,
    })
    renderPage()
    await findSummaryRow()

    const dataRow = firstDataRow()
    expect(cellIn(dataRow, 'slk')).toHaveTextContent('2.292.864 đ')
    expect(cellIn(dataRow, 'transfer_net')).toHaveTextContent('11.111.111 đ')
  })

  it('khấu trừ hiện số ÂM tô đỏ, không nuốt thành "-"', async () => {
    mockList({
      count: 1,
      next: null,
      previous: null,
      results: [makeRow({ summary_id: 9, transfer_net_amount: '-21111110', role_amount: '0' })],
      summary: WHOLE_PERIOD_SUMMARY,
    })
    renderPage()
    await findSummaryRow()

    const negative = screen.getByText('-21.111.110 đ')
    // Cùng design token màn tham chiếu dùng — không phải raw `text-red-500`.
    expect(negative.className).toContain('text-data-red-default')
  })
})

/**
 * ClickUp 86eykqunv Bug1 — biểu mẫu: cột "Tổng" ở cuối = Chuyển khoản + Tiền mặt.
 * Trước CR cột này in `pre_tax_total` (thu nhập trước thuế), một đại lượng khác hẳn và đã có mặt
 * ở cột "Cộng thực tế"; hai cột nguồn thì hard-code "-" trên 24/24 dòng.
 */
describe('MgmtCommSummaryPage — cột "Tổng" = Chuyển khoản + Tiền mặt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cộng hai cột chi, KHÔNG in pre_tax_total', async () => {
    mockList({
      count: 1,
      next: null,
      previous: null,
      results: [
        makeRow({
          summary_id: 9,
          bank_payout_amount: '7000000',
          cash_payout_amount: '2000000',
          // Cố tình khác hẳn 9.000.000 để bản cũ (in `pre_tax_total`) lộ ra bằng con số.
          pre_tax_total: '123456789',
          role_amount: '55555555',
        }),
      ],
      summary: WHOLE_PERIOD_SUMMARY,
    })
    renderPage()
    await findSummaryRow()

    const dataRow = firstDataRow()
    expect(cellIn(dataRow, 'payout_total')).toHaveTextContent('9.000.000 đ')
    // `pre_tax_total` không còn cột nào trên bảng — bản cũ in nó ở đúng ô này.
    expect(dataRow).not.toHaveTextContent('123.456.789 đ')
  })

  it('kỳ chưa chi đồng nào thì Tổng = 0, không phải số phải trả', async () => {
    // Đúng cảnh kỳ 07/2026 trên dev: 24/24 payout wave còn PENDING, paid_amount = 0đ.
    mockList({
      count: 1,
      next: null,
      previous: null,
      results: [makeRow({ summary_id: 9, role_amount: '216898657', pre_tax_total: '216898657' })],
      summary: WHOLE_PERIOD_SUMMARY,
    })
    renderPage()
    await findSummaryRow()

    const dataRow = firstDataRow()
    expect(cellIn(dataRow, 'actual_total')).toHaveTextContent('216.898.657 đ')
    expect(cellIn(dataRow, 'payout_total')).toHaveTextContent('0 đ')
  })

  it('dòng TỔNG CỘNG cũng cộng hai cột chi của cả kỳ', async () => {
    mockList({
      count: 12,
      next: null,
      previous: null,
      results: PAGE_ROWS,
      summary: {
        ...WHOLE_PERIOD_SUMMARY,
        bank_payout_amount: '5000000',
        cash_payout_amount: '1500000',
      },
    })
    renderPage()
    const summaryRow = await findSummaryRow()

    expect(within(summaryRow).getByText('6.500.000 đ')).toBeTruthy()
  })
})

/**
 * ClickUp 86eybw3xw — QA chụp cột "Thao tác": nút Duyệt vỡ hình, và 2/9 dòng mang badge
 * "Chưa duyệt" mà không có nút nào.
 *
 * Gốc bệnh không phải CSS: màn này so trạng thái với `'APPROVED'`, một giá trị BE KHÔNG hề có.
 * `MonthlySummaryStatus` của BE là DRAFT · CONFIRMED · EMAIL_SENT · PAID, nên phiếu vừa duyệt
 * xong (CONFIRMED) rơi vào nhánh mặc định và hiện NGƯỢC thành "Chưa duyệt", kèm mất luôn thao tác.
 *
 * Luồng thật của BE (apps/accounting/services/monthly_summary_service.py):
 *   DRAFT --confirm--> CONFIRMED --gửi email đối chiếu--> EMAIL_SENT --mark_paid--> PAID
 * `mark_paid` đòi EMAIL_SENT, gọi lúc CONFIRMED là 409 — nên "Đánh dấu đã chi" KHÔNG được hiện
 * sớm hơn EMAIL_SENT.
 */
describe('MgmtCommSummaryPage — trạng thái & thao tác bám luồng của BE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderWithStatus(status: string) {
    mockList({
      count: 1,
      next: null,
      previous: null,
      results: [makeRow({ summary_id: 9, status })],
      summary: WHOLE_PERIOD_SUMMARY,
    })
    renderPage()
  }

  const menuButton = () => screen.queryByRole('button', { name: 'Open actions menu' })

  function openMenu() {
    const button = menuButton()
    if (!button) throw new Error('dòng này không có nút mở menu thao tác')
    fireEvent.click(button)
  }

  it('DRAFT: badge "Bản nháp" và menu chỉ có "Duyệt bảng kê"', async () => {
    renderWithStatus(MonthlyStatus.DRAFT)
    await findSummaryRow()

    expect(cellIn(firstDataRow(), 'status')).toHaveTextContent('Bản nháp')

    openMenu()
    expect(screen.getByRole('menuitem', { name: /Duyệt bảng kê/ })).toBeTruthy()
    // Chưa gửi email đối chiếu thì BE từ chối mark-paid (409) — không được mời người dùng bấm.
    expect(screen.queryByRole('menuitem', { name: /Đánh dấu đã chi/ })).toBeNull()
  })

  it('DRAFT: bấm "Duyệt bảng kê" gọi API với đúng summary_id của dòng', async () => {
    renderWithStatus(MonthlyStatus.DRAFT)
    await findSummaryRow()

    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: /Duyệt bảng kê/ }))

    expect(mockApprove).toHaveBeenCalledTimes(1)
    expect(mockApprove.mock.calls[0][0]).toEqual({ role: 'manager', id: 9 })
  })

  it('CONFIRMED: hiện "Đã xác nhận" chứ KHÔNG còn hiện ngược thành "Chưa duyệt"', async () => {
    renderWithStatus(MonthlyStatus.CONFIRMED)
    await findSummaryRow()

    const cell = cellIn(firstDataRow(), 'status')
    // Vế khẳng định đi kèm là bắt buộc: thiếu nó thì một selector sai cũng làm vế phủ định XANH.
    expect(cell).toHaveTextContent('Đã xác nhận')
    expect(cell).not.toHaveTextContent('Chưa duyệt')

    // Đã duyệt rồi thì không mời duyệt lại; bước kế tiếp (gửi email đối chiếu) nằm ở màn HHQL
    // theo tháng, nên dòng này không còn thao tác nào và menu ⋮ tự ẩn.
    expect(menuButton()).toBeNull()
  })

  it('EMAIL_SENT: menu chỉ có "Đánh dấu đã chi", không mời duyệt lại', async () => {
    renderWithStatus(MonthlyStatus.EMAIL_SENT)
    await findSummaryRow()

    expect(cellIn(firstDataRow(), 'status')).toHaveTextContent('Đã gửi email')

    openMenu()
    expect(screen.getByRole('menuitem', { name: /Đánh dấu đã chi/ })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: /Duyệt bảng kê/ })).toBeNull()
  })

  it('EMAIL_SENT: bấm "Đánh dấu đã chi" gọi API với đúng summary_id của dòng', async () => {
    renderWithStatus(MonthlyStatus.EMAIL_SENT)
    await findSummaryRow()

    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: /Đánh dấu đã chi/ }))

    expect(mockMarkPaid).toHaveBeenCalledTimes(1)
    expect(mockMarkPaid.mock.calls[0][0]).toEqual({ role: 'manager', id: 9 })
  })

  it('PAID: hiện "Đã thanh toán" và hết thao tác', async () => {
    renderWithStatus(MonthlyStatus.PAID)
    await findSummaryRow()

    expect(cellIn(firstDataRow(), 'status')).toHaveTextContent('Đã thanh toán')
    expect(menuButton()).toBeNull()
  })
})
