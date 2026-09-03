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

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'

const canMock = vi.fn(() => true)
vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: canMock }) }))

const toastErrorMock = vi.fn()
vi.mock('@/services/toast-service', () => ({
  default: {
    error: (...args: any[]) => toastErrorMock(...args),
    warning: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@/hooks/useColumnConfig.ts', () => ({
  useColumnConfig: (defaultConfig: any) => ({
    columns: defaultConfig,
    handleApply: vi.fn(),
    handleReset: vi.fn(),
  }),
}))

/**
 * `useEmployeeMonthlyKpis` is the assertion surface for two of this CR's requirements at once:
 * R9 (exactly one call) and R1/R4 (the params the controls feed it). Spying on the hook rather
 * than the network keeps both checks in one place and independent of transport details.
 */
const useEmployeeMonthlyKpisMock = vi.fn()
const useDepartmentMonthlyKpiMock = vi.fn()
vi.mock(
  '@/features/accounting/department-monthly-kpi/services/department-monthly-kpi-service',
  () => ({
    useDepartmentMonthlyKpi: (...args: any[]) => useDepartmentMonthlyKpiMock(...args),
    useEmployeeMonthlyKpis: (...args: any[]) => useEmployeeMonthlyKpisMock(...args),
  })
)

// Dialog bộ lọc tự gọi API nhân viên / chức vụ / app-constant; test này chỉ quan tâm tới bảng.
vi.mock('@/features/accounting/employee-monthly-kpi/components/EmployeeMonthlyKpiFilter', () => ({
  EmployeeMonthlyKpiFilter: () => <div data-testid="filter-form" />,
  EMPLOYEE_MONTHLY_KPI_FILTER_FIELDS: ['employee', 'position', 'employee_type_snapshot'],
}))

import CommissionByRevenueDetailPage from './CommissionByRevenueDetailPage'

const DEPARTMENT_KPI = {
  id: 182297,
  year: 2026,
  month: 8,
  department: 55,
  actual_amount: '0',
  // Hai mục tiêu này là HAI thứ khác nhau ở BE và phải khác giá trị trong mock, nếu không
  // phép assert của thẻ "Chỉ tiêu quản lý" vẫn xanh dù map nhầm sang field kia.
  target_amount: '333333336',
  business_target_amount: '841333330',
  completion_pct: '0',
  manager_splits: [],
  department_detail: {
    id: 55,
    name: 'Phòng Kinh Doanh 18_BG',
    branch: { id: 1, name: 'Chi nhánh Bắc Giang' },
    block: { id: 2, name: 'Khối Kinh Doanh' },
  },
}

function createEmployeeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    employee: 109,
    employee_detail: {
      id: 109,
      code: 'CTV000000109',
      fullname: 'Đào Thanh Tùng',
      position: { id: 7, name: 'Trưởng Phòng Kinh Doanh' },
      department: { id: 55, name: 'Phòng Kinh Doanh 18_BG' },
    },
    employee_start_date: '2023-12-23',
    employee_note: '',
    employee_type_change_date: '2026-04-01',
    employee_type_snapshot: 'OFFICIAL',
    employee_type_label: 'Chính thức',
    standard_working_days: '26',
    business_target_amount: '100000000',
    actual_revenue: '50000000',
    business_completion_pct: '50',
    revenue_deals_count: 2,
    ...overrides,
  }
}

function renderPage(url = '/accounting/commission-management/by-revenue/182297') {
  return render(
    <SidebarProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/accounting/commission-management/by-revenue/:id"
            element={<CommissionByRevenueDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    </SidebarProvider>
  )
}

/** Params of the single list call the page is allowed to make. */
function listParams() {
  return useEmployeeMonthlyKpisMock.mock.calls[0][0]
}

beforeEach(() => {
  vi.clearAllMocks()
  canMock.mockReturnValue(true)
  useDepartmentMonthlyKpiMock.mockReturnValue({
    data: DEPARTMENT_KPI,
    isLoading: false,
    isError: false,
  })
  useEmployeeMonthlyKpisMock.mockReturnValue({
    data: { count: 1, results: [createEmployeeRow()] },
    isLoading: false,
  })
})

describe('CommissionByRevenueDetailPage — lỗi tải danh sách', () => {
  it('báo lỗi thay vì để bảng rỗng đóng giả "không có nhân viên nào"', () => {
    // Bảng rỗng là kết quả HỢP LỆ của màn này, nên nếu nuốt lỗi thì một cú 400 (ví dụ
    // `employee_type_snapshot` sai giá trị) đọc ra y hệt "phòng này không có ai khớp".
    useEmployeeMonthlyKpisMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Hãy chọn một lựa chọn hợp lệ.'),
    })

    renderPage()

    expect(toastErrorMock).toHaveBeenCalledTimes(1)
  })

  it('không báo lỗi khi danh sách rỗng một cách hợp lệ', () => {
    useEmployeeMonthlyKpisMock.mockReturnValue({
      data: { count: 0, results: [] },
      isLoading: false,
    })

    renderPage()

    expect(toastErrorMock).not.toHaveBeenCalled()
  })
})

describe('CommissionByRevenueDetailPage — gọi API (CR 86eyj31ch R9)', () => {
  it('chỉ gọi list nhân viên đúng MỘT lần khi load', () => {
    renderPage()

    expect(useEmployeeMonthlyKpisMock).toHaveBeenCalledTimes(1)
  })

  it('không gọi thêm lần nào để dựng dòng tổng, kể cả khi tổng bản ghi lớn hơn một trang', () => {
    useEmployeeMonthlyKpisMock.mockReturnValue({
      data: { count: 500, results: [createEmployeeRow()] },
      isLoading: false,
    })

    renderPage()

    expect(useEmployeeMonthlyKpisMock).toHaveBeenCalledTimes(1)
  })
})

describe('CommissionByRevenueDetailPage — bảng (CR 86eyj31ch R5, R6, R7)', () => {
  it('không còn dòng TỔNG trong bảng', () => {
    renderPage()

    expect(screen.queryByText(/TỔNG/i)).not.toBeInTheDocument()
  })

  it('không còn cột Phòng ban', () => {
    renderPage()

    expect(screen.queryByRole('columnheader', { name: 'Phòng ban' })).not.toBeInTheDocument()
  })

  it('hiện Chi nhánh / Khối / Phòng ban ở phần đầu trang thay cho cột', () => {
    renderPage()

    expect(screen.getByText('Chi nhánh')).toBeInTheDocument()
    expect(screen.getByText('Chi nhánh Bắc Giang')).toBeInTheDocument()
    expect(screen.getByText('Khối')).toBeInTheDocument()
    expect(screen.getByText('Khối Kinh Doanh')).toBeInTheDocument()
    expect(screen.getByText('Phòng ban')).toBeInTheDocument()
  })

  it('dùng bộ page size chung của hệ thống (25/50/100), không dùng bộ 10/20 cũ', () => {
    renderPage()

    expect(listParams().page_size).toBe(25)
  })

  it('bỏ qua page_size lạ trên URL và rơi về mặc định chung', () => {
    renderPage('/accounting/commission-management/by-revenue/182297?page_size=20')

    expect(listParams().page_size).toBe(25)
  })
})

describe('CommissionByRevenueDetailPage — cột Nhân viên (CR 86eyj31ch R2, R3)', () => {
  it('gộp mã NV và họ tên vào một cột duy nhất', () => {
    renderPage()

    expect(screen.getByRole('columnheader', { name: 'Nhân viên' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Mã NV' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Họ và tên' })).not.toBeInTheDocument()
  })

  it('tên nhân viên là link mở tab mới sang hồ sơ nhân viên', () => {
    renderPage()

    const link = screen.getByRole('link', { name: 'Đào Thanh Tùng' })
    expect(link).toHaveAttribute('href', '/employee/management/109')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('tên nhân viên để màu đen chứ không dùng màu action', () => {
    renderPage()

    expect(screen.getByRole('link', { name: 'Đào Thanh Tùng' })).toHaveClass('text-content-dark-1')
  })

  it('thiếu quyền xem nhân viên thì thành chữ thường, không còn link', () => {
    // Từ chối ĐÚNG quyền mà `EmployeeProfileLink` hỏi (`employee.retrieve`), không phải mọi
    // quyền: từ 86eync7g0 trang này còn hỏi `departmentmonthlykpi.retrieve` cho
    // `DetailPageWrapper`, nên `mockReturnValue(false)` trần sẽ khoá cả trang thành
    // "không có quyền truy cập" và bảng biến mất — test khi đó đỏ vì lý do chẳng liên quan gì
    // tới cái nó muốn kiểm.
    canMock.mockImplementation(
      (action?: string, subject?: string) => !(action === 'retrieve' && subject === 'employee')
    )

    renderPage()

    // Vế đối chứng: bảng VẪN render (nếu gate trang bị khoá nhầm thì dòng dưới đỏ trước).
    expect(screen.getByText('CTV000000109')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Đào Thanh Tùng' })).not.toBeInTheDocument()
    expect(screen.getByText('Đào Thanh Tùng')).toBeInTheDocument()
  })

  it('mã nhân viên vẫn hiện cùng dòng với tên', () => {
    renderPage()

    const row = screen.getByRole('row', { name: /Đào Thanh Tùng/ })
    expect(within(row).getByText('CTV000000109')).toBeInTheDocument()
  })
})

/**
 * Ba cột này từng đọc `hire_date` / `notes` / `status_change_date` — những tên KHÔNG tồn tại
 * trong payload, nên mọi dòng in dấu chỗ và đọc ra thành "chưa có dữ liệu" chứ không phải
 * "sai tên trường". Các assertion dưới đây khoá đúng tên field hiện hành.
 */
describe('CommissionByRevenueDetailPage — ba cột roster', () => {
  it('Ngày làm việc lấy từ employee_start_date, định dạng dd/MM/yyyy', () => {
    renderPage()

    expect(screen.getByText('23/12/2023')).toBeInTheDocument()
  })

  it('Ngày đổi trạng thái lấy từ employee_type_change_date (đổi LOẠI nhân viên)', () => {
    renderPage()

    expect(screen.getByText('01/04/2026')).toBeInTheDocument()
  })

  it('Ghi chú lấy từ employee_note, cắt một dòng kèm title cho ghi chú dài', () => {
    const note = 'Nghỉ thai sản từ tháng 9, bàn giao khách cho Nguyễn Văn Đạt'
    useEmployeeMonthlyKpisMock.mockReturnValue({
      data: { count: 1, results: [createEmployeeRow({ employee_note: note })] },
      isLoading: false,
    })

    renderPage()

    const cell = screen.getByTitle(note)
    expect(cell).toHaveTextContent(note)
    expect(cell).toHaveClass('truncate')
  })

  it('ngày rỗng vẫn hiện "-" chứ không phải chuỗi ngày vô nghĩa', () => {
    useEmployeeMonthlyKpisMock.mockReturnValue({
      data: {
        count: 1,
        results: [
          createEmployeeRow({ employee_type_change_date: null, employee_start_date: null }),
        ],
      },
      isLoading: false,
    })

    renderPage()

    expect(screen.queryByText('01/04/2026')).not.toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })
})

describe('CommissionByRevenueDetailPage — ô rỗng (CR 86eyj31ch R8)', () => {
  it('hiện "-" chứ không phải "---" khi giá trị rỗng', () => {
    useEmployeeMonthlyKpisMock.mockReturnValue({
      data: {
        count: 1,
        results: [
          createEmployeeRow({
            employee_detail: {
              id: 109,
              code: null,
              fullname: null,
              position: null,
            },
          }),
        ],
      },
      isLoading: false,
    })

    renderPage()

    expect(screen.queryByText('---')).not.toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })

  it('phòng ban chưa có chi nhánh / khối thì dải thông tin cũng hiện "-"', () => {
    useDepartmentMonthlyKpiMock.mockReturnValue({
      data: { ...DEPARTMENT_KPI, department_detail: { id: 55, name: 'Phòng Kinh Doanh 18_BG' } },
      isLoading: false,
      isError: false,
    })

    renderPage()

    expect(screen.queryByText('---')).not.toBeInTheDocument()
  })
})

describe('CommissionByRevenueDetailPage — bộ lọc và tìm kiếm (CR 86eyj31ch R1, R4)', () => {
  it('đẩy search trên URL vào request', () => {
    renderPage('/accounting/commission-management/by-revenue/182297?search=Tung')

    expect(listParams().search).toBe('Tung')
  })

  it('không gửi search khi ô tìm kiếm để trống', () => {
    renderPage()

    expect(listParams().search).toBeUndefined()
  })

  it('đẩy chức vụ và loại nhân viên vào request', () => {
    renderPage(
      '/accounting/commission-management/by-revenue/182297?position=7&employee_type_snapshot=PROBATION'
    )

    expect(listParams().position).toBe(7)
    expect(listParams().employee_type_snapshot).toBe('PROBATION')
  })

  it('badge bộ lọc đếm cả nhân viên, chức vụ và loại NV — nhưng không đếm ô tìm kiếm', () => {
    renderPage(
      '/accounting/commission-management/by-revenue/182297?employee=109&position=7&employee_type_snapshot=OFFICIAL&search=Tung'
    )

    expect(screen.getByText('3')).toBeInTheDocument()
  })
})

/**
 * Badge và request phải nói cùng một chuyện. Bài học rút ra từ CR bộ lọc màn list: badge đếm
 * "có giá trị trên URL" còn request lọc qua parser ⇒ một link rác cho badge khoe "đang lọc"
 * trong khi danh sách chẳng lọc gì (hoặc tệ hơn, vỡ với 400).
 */
describe('CommissionByRevenueDetailPage — badge và request cùng một nguồn', () => {
  it('id rác không được gửi đi, và cũng không được tính vào badge', () => {
    renderPage('/accounting/commission-management/by-revenue/182297?position=abc&employee=xyz')

    expect(listParams().position).toBeUndefined()
    expect(listParams().employee).toBeUndefined()
    // Nhắm thẳng vào nút bộ lọc: chữ "1" trần còn xuất hiện ở cột STT và ở nút phân trang.
    expect(screen.getByRole('button', { name: /Bộ lọc/ })).toHaveTextContent(/^Bộ lọc$/)
  })

  it('id bằng 0 cũng bị loại — không có khoá chính nào là 0', () => {
    renderPage('/accounting/commission-management/by-revenue/182297?position=0')

    expect(listParams().position).toBeUndefined()
  })

  it('dialog seed lại từ giá trị đã phân giải, không phải chuỗi thô trên URL', () => {
    renderPage('/accounting/commission-management/by-revenue/182297?position=007')

    // `007` là id hợp lệ nên vẫn lọc, nhưng phải chuẩn hoá về số trước khi gửi đi.
    expect(listParams().position).toBe(7)
  })
})

describe('CommissionByRevenueDetailPage — thẻ số liệu quản lý (bug 86eyr1vam)', () => {
  const SPLITS = [
    { role: 'TPKD', pct: '4', amount: '2909091' },
    { role: 'GDKD', pct: '1', amount: '727273' },
    { role: 'CEO', pct: '0.5', amount: '363636' },
  ]

  function renderWithSplits(manager_splits: Record<string, unknown>[] = SPLITS) {
    useDepartmentMonthlyKpiMock.mockReturnValue({
      data: { ...DEPARTMENT_KPI, manager_splits },
      isLoading: false,
      isError: false,
    })
    return renderPage()
  }

  it('ba thẻ tiền quản lý gọi là "HH" kèm tỷ lệ, khớp cách màn danh sách gọi', () => {
    renderWithSplits()

    expect(screen.getByText('HH TP (4%)')).toBeInTheDocument()
    expect(screen.getByText('HH GĐ (1%)')).toBeInTheDocument()
    expect(screen.getByText('HH TGĐ (0.5%)')).toBeInTheDocument()
  })

  it('không thẻ nào còn gọi khoản này là "Thưởng"', () => {
    renderWithSplits()

    // Vế đối chứng nằm ngay trên: ba thẻ PHẢI hiện với nhãn "HH ...". Không có nó thì phép
    // assert vắng mặt dưới đây vẫn xanh kể cả khi cả ba thẻ biến mất hẳn khỏi màn.
    expect(screen.getByText('HH TP (4%)')).toBeInTheDocument()
    expect(screen.queryByText(/^Thưởng /)).not.toBeInTheDocument()
  })

  it('vai TKKD cũng đi qua cùng một nhãn, không sót nhánh nào', () => {
    renderWithSplits([{ role: 'SALE_ADMIN_LEAD', pct: '2', amount: '1000000' }])

    expect(screen.getByText('HH TKKD (2%)')).toBeInTheDocument()
    expect(screen.queryByText(/^Thưởng /)).not.toBeInTheDocument()
  })

  it('hai thẻ đầu không phải khoản hoa hồng nên giữ nguyên tên', () => {
    renderWithSplits()

    expect(screen.getByText('Doanh số phòng')).toBeInTheDocument()
    expect(screen.getByText('Chỉ tiêu quản lý')).toBeInTheDocument()
  })

  /**
   * Thẻ "Chỉ tiêu quản lý" phải lấy `target_amount` (BE: "Management target amount", thứ
   * `completion_pct = actual / target_amount × 100` chia xuống), KHÔNG phải
   * `business_target_amount` ("Business target amount" — tổng KPI bán hàng, đã hiện đúng nghĩa
   * ở cột "Chỉ tiêu kinh doanh" của bảng nhân viên phía dưới).
   *
   * Trước đây test chỉ assert NHÃN của thẻ nên map nhầm field vẫn xanh: màn danh sách hiện
   * 333.333.336 còn màn này hiện 283.333.335 cho cùng một phòng cùng một kỳ.
   */
  it('thẻ "Chỉ tiêu quản lý" lấy target_amount, không lấy chỉ tiêu kinh doanh', () => {
    renderWithSplits()

    // `getByText` ném lỗi khi khớp NHIỀU HƠN một node, nên nó đã kiêm luôn phép assert "con số
    // này chỉ hiện đúng một chỗ". Không scope bằng `parentElement` — `testing-library/no-node-access`
    // cấm, và scope kiểu đó cũng chỉ mạnh hơn nếu thẻ giữ nguyên cấu trúc DOM hiện tại.
    expect(screen.getByText('333.333.336')).toBeInTheDocument()
    // Vế đối chứng, mới là thứ bắt đúng con bug: chỉ tiêu KINH DOANH không được hiện ở mức phòng.
    expect(screen.queryByText('841.333.330')).not.toBeInTheDocument()
  })
})
