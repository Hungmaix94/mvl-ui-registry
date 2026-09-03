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
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }))
vi.mock('firebase/analytics', () => ({ getAnalytics: vi.fn() }))
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  onMessage: vi.fn(),
  isSupported: vi.fn().mockResolvedValue(false),
}))

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import { CommMgrMonthlyTable } from './CommMgrMonthlyTable'
import type { MonthlyBeneficiaryCommissionSummary } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'

vi.mock('@/hooks/useColumnConfig.ts', () => ({
  useColumnConfig: (defaultConfig: any) => ({
    columns: defaultConfig,
    handleApply: vi.fn(),
    handleReset: vi.fn(),
  }),
}))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMap: new Map(), keysMapOptions: new Map() }),
}))

vi.mock('../hooks/useCommissionEmailDialogs', () => ({
  useCommissionEmailDialogs: () => ({ openSingle: vi.fn(), dialogs: null }),
}))

function createRow(
  overrides: Partial<Record<string, any>> = {}
): MonthlyBeneficiaryCommissionSummary {
  return {
    id: 1,
    year: 2026,
    month: 8,
    beneficiary_type: 'EMPLOYEE',
    beneficiary_employee: 11,
    beneficiary_employee_detail: {
      id: 11,
      fullname: 'Đặng Thị Vượng',
      code: 'MV000003036',
      position: { id: 3, name: 'Giám đốc Kinh doanh' },
      branch: { id: 1, name: 'Đà Nẵng' },
      block: { id: 2, name: 'Khối Kinh doanh_Đà Nẵng' },
      department: { id: 3, name: 'Phòng Kinh Doanh 1_DN' },
    },
    deals_count: 2,
    promo_total: '0',
    mgmt_total: '613878',
    hhql_total: '0',
    bonus_total: '0',
    pre_tax_total: '613878',
    pit_method: 'NONE',
    pit_rate: null,
    pit_amount: '0',
    hold_amount: '0',
    recovered_advance_amount: '0',
    net_payable: '613878',
    status: 'DRAFT',
    ...overrides,
  } as unknown as MonthlyBeneficiaryCommissionSummary
}

/** The `<td>` whose text contains `text` — cells have no accessible name of their own. */
function cellContaining(text: string): HTMLElement {
  const cell = screen.getAllByRole('cell').find((c) => c.textContent?.includes(text))
  if (!cell) throw new Error(`No table cell contains "${text}"`)
  return cell
}

/**
 * The single row's cell sitting under `header`.
 *
 * Matching a cell by its text is ambiguous on a money table — the same amount shows up in the
 * bucket column, in "Tổng HH" and again in "Phải chi" — so a column-dropped regression would
 * still find *a* cell and pass. Positional lookup is the only assertion that actually pins it.
 */
function cellUnder(header: string): HTMLElement {
  const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())
  const index = headers.indexOf(header)
  if (index === -1) throw new Error(`No column headed "${header}". Got: ${headers.join(' | ')}`)
  return screen.getAllByRole('cell')[index]
}

function renderTable(data: MonthlyBeneficiaryCommissionSummary[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <MemoryRouter>
          <CommMgrMonthlyTable data={data} isLoading={false} />
        </MemoryRouter>
      </SidebarProvider>
    </QueryClientProvider>
  )
}

describe('CommMgrMonthlyTable — nhãn cột (CR 86eyj2er9)', () => {
  it('đổi "Cấp · Phòng" thành "Đơn vị"', () => {
    renderTable([createRow()])

    expect(screen.getByText('Đơn vị')).toBeInTheDocument()
    expect(screen.queryByText('Cấp · Phòng')).not.toBeInTheDocument()
  })

  it('đặt tên có nghĩa cho hai cột tiền từng viết tắt khó hiểu', () => {
    renderTable([createRow()])

    expect(screen.getByText('HH quản lý (TBC)')).toBeInTheDocument()
    expect(screen.getByText('HH Đầu tư, Xúc tiến & PT Dự án')).toBeInTheDocument()
    expect(screen.queryByText('TBC')).not.toBeInTheDocument()
    expect(screen.queryByText('Nhóm A (ĐT&XT)')).not.toBeInTheDocument()
  })

  // Chuỗi ghim thẳng ở đây, KHÔNG đọc ROLE_LABELS[PROMO]: component đã đọc map đó rồi, nên nếu
  // test đọc cùng nguồn thì hai vế luôn bằng nhau và phép so thành rỗng — đổi map thành chuỗi
  // gì test cũng xanh. Ghim literal là thứ duy nhất bắt được khi nhãn bị đổi ngoài ý muốn.
  it('không dùng lại nhãn "Hỗ trợ quảng cáo" của loại thưởng AD_SUPPORT cho promo_total', () => {
    // ClickUp 86eykqe00 (2026-08-21): một nhãn đang gọi hai rổ tiền khác nhau, và màn list
    // lệch với chính màn chi tiết của nó. Nhãn cũ tới từ CR 86eyj2er9 (2026-08-06).
    renderTable([createRow({ promo_total: '1500000', pre_tax_total: '2113878' })])

    expect(screen.queryByText('Hỗ trợ quảng cáo')).not.toBeInTheDocument()
  })

  it('giữ cột promo_total và hiển thị số khi quản lý có tiền Đầu tư/Xúc tiến', () => {
    // promo_total nằm trong pre_tax_total, bỏ cột đi là Tổng HH không đối chiếu được.
    renderTable([createRow({ promo_total: '1500000', pre_tax_total: '2113878' })])

    expect(screen.getByText('1.500.000')).toBeInTheDocument()
  })
})

/**
 * Màn này giờ phủ CẢ wave MANAGEMENT chứ không chỉ `mgmt_total > 0` (BE 2026-08-07), nên mọi
 * bucket cộng vào `pre_tax_total` đều phải có cột riêng. Thiếu một cột là kế toán cộng tay các
 * cột thành phần không ra "Tổng HH" — lỗi im lặng, không có thông báo nào.
 */
describe('CommMgrMonthlyTable — Tổng HH phải đối chiếu được với các cột thành phần', () => {
  const COMPONENT_HEADERS = [
    'HH Đầu tư, Xúc tiến & PT Dự án',
    'HH quản lý (TBC)',
    'HHQL',
    'Thưởng',
    'HH Giám đốc dự án',
    'HH Sàn liên kết',
    'HH Back office',
    'Khấu trừ thưởng người khác',
    'Thưởng từ khấu trừ',
    'Khấu trừ khác',
  ]

  it('có đủ cột cho mọi bucket của wave MANAGEMENT', () => {
    renderTable([createRow()])

    for (const header of COMPONENT_HEADERS) {
      expect(screen.getByText(header)).toBeInTheDocument()
    }
  })

  it('hiển thị dòng chỉ có tiền điều chuyển, không có bucket hoa hồng nào', () => {
    // Ca thật trên kỳ 08/2026: cả kỳ của một người chỉ là `transfer_in` 500.000. Trước đây mọi
    // cột thành phần đều "—" trong khi Tổng HH vẫn 500.000.
    renderTable([
      createRow({
        mgmt_total: '0',
        transfer_in_total: '500000',
        pre_tax_total: '500000',
        net_payable: '500000',
      }),
    ])

    // Phải soi ĐÚNG cột: "500.000" còn xuất hiện ở Tổng HH và Phải chi, nên một phép tìm
    // chung chung vẫn xanh kể cả khi cột "Thưởng từ khấu trừ" bị bỏ mất.
    expect(cellUnder('Thưởng từ khấu trừ')).toHaveTextContent('500.000')
    expect(cellUnder('HH quản lý (TBC)')).toHaveTextContent('—')
  })

  it('hiển thị khấu trừ dưới dạng số ÂM, tô đỏ — không nuốt thành "—"', () => {
    renderTable([
      createRow({ transfer_out_total: '-1500000', pre_tax_total: '963031', net_payable: '963031' }),
    ])

    const negative = screen.getByText('-1.500.000')
    expect(cellUnder('Khấu trừ thưởng người khác')).toContainElement(negative)
    // Design token, không phải raw `text-red-500` — cột "Thuế TNCN" cạnh bên cũng dùng token này.
    expect(negative.className).toContain('text-data-red-default')
  })

  it('đọc HH Giám đốc dự án từ `project_director_total`', () => {
    // Cell cũ đoán `gdda_amount` / `gdda_total` / `gdda_commission` — không field nào tồn tại,
    // nên cột luôn ra "—" dù tiền vẫn nằm trong Tổng HH.
    renderTable([createRow({ project_director_total: '7250000', pre_tax_total: '7863878' })])

    expect(screen.getByText('7.250.000')).toBeInTheDocument()
  })
})

describe('CommMgrMonthlyTable — chức vụ và đơn vị (CR 86eyj2er9)', () => {
  it('hiển thị chức vụ ở cell Nhân viên dưới dạng text thường', () => {
    renderTable([createRow()])

    // Text thường, không phải Chip: Chip cố định bề rộng nên tên chức vụ dài bị tràn cell.
    expect(screen.getByText('Giám đốc Kinh doanh').tagName).toBe('SPAN')
    // Và nó nằm cùng cell với tên + mã nhân viên.
    const employeeCell = cellContaining('Đặng Thị Vượng')
    expect(within(employeeCell).getByText('MV000003036')).toBeInTheDocument()
    expect(within(employeeCell).getByText('Giám đốc Kinh doanh')).toBeInTheDocument()
  })

  it('cột Đơn vị chỉ chứa chi nhánh / khối / phòng ban, không còn chức vụ', () => {
    renderTable([createRow()])

    const orgCell = cellContaining('Chi nhánh:')

    expect(within(orgCell).getByText('Đà Nẵng')).toBeInTheDocument()
    expect(within(orgCell).getByText('Khối Kinh doanh_Đà Nẵng')).toBeInTheDocument()
    expect(within(orgCell).getByText('Phòng Kinh Doanh 1_DN')).toBeInTheDocument()
    expect(within(orgCell).queryByText('Giám đốc Kinh doanh')).not.toBeInTheDocument()
  })

  it('không vỡ khi nhân viên chưa gán chức vụ / đơn vị', () => {
    renderTable([
      createRow({
        beneficiary_employee_detail: {
          id: 11,
          fullname: 'Nhân viên chưa gán',
          code: 'MV000000000',
        },
      }),
    ])

    expect(screen.getByText('Nhân viên chưa gán')).toBeInTheDocument()
    expect(screen.queryByText('Chi nhánh:')).not.toBeInTheDocument()
  })
})
