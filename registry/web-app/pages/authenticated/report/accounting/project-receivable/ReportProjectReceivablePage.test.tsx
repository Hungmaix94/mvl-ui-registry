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

import { forwardRef, useImperativeHandle } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import type { ProjectReceivableFilterFormData } from '@/features/report/accounting/project-receivable/ProjectReceivableFilter'
import ReportProjectReceivablePage from './ReportProjectReceivablePage'

const BASE_URL = '/accounting/report/project-receivable'
const PERIOD_QS = 'page=1&page_size=25&year=2026&month=8'
const PROJECT_ID = 196

const mockUseReport = vi.fn()
const mockOpenExportDialog = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('@/features/accounting/reports/services/report-service', () => ({
  useProjectReceivableReport: (...args: unknown[]) => mockUseReport(...args),
  useImportProjectReceivableProjections: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('@/features/accounting/accounting-periods/services/accounting-period-service', () => ({
  useCurrentAccountingPeriod: () => ({
    data: { id: 1, year: 2026, month: 8 },
    isLoading: false,
  }),
  useAllAccountingPeriods: () => ({ data: [{ id: 1, year: 2026, month: 8 }] }),
}))

vi.mock('@/features/accounting/_shares/hooks/useAccountingListExport', () => ({
  useAccountingListExport: () => ({
    openExportDialog: (...args: unknown[]) => mockOpenExportDialog(...args),
    isExporting: false,
  }),
}))

vi.mock('@/features/report/accounting/project-receivable/ProjectReceivableReportTable', () => ({
  default: () => <div data-testid="project-receivable-table" />,
}))

/**
 * Bộ lọc thật được thay bằng stub phơi ra đúng `getValues` / `clearForm` — các test dưới đây
 * kiểm phần việc của TRANG (URL ⇄ query param), không kiểm nội bộ combobox phân trang.
 *
 * `filterValues` là hộp điều khiển: đặt giá trị rồi bấm "Áp dụng". `seededValues` ghi lại
 * `initialValues` trang seed vào dialog — `null` và `''` cho ra hành vi khác hẳn nhau ở
 * `Select` thật nên phải giữ nguyên kiểu, không ép chuỗi.
 */
const filterValues: { current: ProjectReceivableFilterFormData } = {
  current: { project: null, hasDebt: true },
}
const seededValues: { current: unknown } = { current: undefined }

vi.mock('@/features/report/accounting/project-receivable/ProjectReceivableFilter', () => ({
  default: forwardRef(({ initialValues }: { initialValues?: unknown }, ref: React.Ref<unknown>) => {
    seededValues.current = initialValues
    useImperativeHandle(ref, () => ({
      getValues: () => filterValues.current,
      clearForm: () => {
        filterValues.current = { project: null, hasDebt: true }
      },
    }))
    return <div data-testid="project-receivable-filter" />
  }),
}))

function LocationProbe() {
  const { search } = useLocation()
  return <div data-testid="search-params">{search}</div>
}

function renderPage(initialUrl = `${BASE_URL}?${PERIOD_QS}`) {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <SidebarProvider>
        <ReportProjectReceivablePage />
        <LocationProbe />
      </SidebarProvider>
    </MemoryRouter>
  )
}

/** Query param cuối cùng mà trang đưa cho hook báo cáo. */
function lastApiParams() {
  return mockUseReport.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined
}

/** Tham số hiện có trên URL, đọc qua `LocationProbe`. */
function urlParams() {
  return new URLSearchParams(screen.getByTestId('search-params').textContent ?? '')
}

/** Khi có tiêu chí đang áp dụng, nút mọc thêm badge số nên tên khả truy cập là "Bộ lọc <n>". */
const FILTER_BUTTON = /^Bộ lọc/

async function openFilterDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: FILTER_BUTTON }))
  return screen.findByTestId('project-receivable-filter')
}

beforeEach(() => {
  vi.clearAllMocks()
  filterValues.current = { project: null, hasDebt: true }
  seededValues.current = undefined
  mockUseReport.mockReturnValue({ data: { by_project: [] }, isLoading: false })
})

describe('ReportProjectReceivablePage — URL đọc thành query param', () => {
  it('chuyển project trên URL thành tham số API dạng số', async () => {
    renderPage(`${BASE_URL}?${PERIOD_QS}&project=${PROJECT_ID}`)

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()).toMatchObject({ year: 2026, month: 8, project: PROJECT_ID })
  })

  it('không gửi project khi URL không chọn dự án — báo cáo giữ nguyên toàn bộ danh sách', async () => {
    renderPage()

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()?.project).toBeUndefined()
    expect(lastApiParams()).toMatchObject({ year: 2026, month: 8 })
  })

  it('mặc định gửi has_debt=true — SRS 20.16 §2.2 chỉ hiện dòng còn nợ', async () => {
    renderPage()

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()).toMatchObject({ has_debt: true })
  })

  it.each(['has_debt=0', 'has_debt=false'])('URL %s thì gửi has_debt=false', async (query) => {
    renderPage(`${BASE_URL}?${PERIOD_QS}&${query}`)

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    // Vẫn GỬI `false` chứ không bỏ param: header file Excel nhờ đó ghi "Không".
    expect(lastApiParams()).toMatchObject({ has_debt: false })
  })

  it('bỏ qua project rác trên URL thay vì gửi NaN cho BE', async () => {
    renderPage(`${BASE_URL}?${PERIOD_QS}&project=khong-phai-so`)

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()?.project).toBeUndefined()
  })
})

describe('ReportProjectReceivablePage — dialog bộ lọc', () => {
  it('seed null (không phải chuỗi rỗng) vào dialog khi chưa chọn dự án', async () => {
    const user = userEvent.setup()
    renderPage()

    await openFilterDialog(user)

    // `''` sẽ bị Select coi là "đang chọn" → nạp option ban đầu cho giá trị rỗng →
    // `Number('')` = 0 → ô lọc hiện nhãn "0" kèm nút xoá thay vì placeholder.
    expect(seededValues.current).toEqual({ project: null, hasDebt: true })
  })

  it('seed lại lựa chọn hiện có trên URL khi mở dialog', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?${PERIOD_QS}&project=${PROJECT_ID}`)

    await openFilterDialog(user)

    expect(seededValues.current).toEqual({ project: PROJECT_ID, hasDebt: true })
  })

  it('bấm Áp dụng thì ghi project vào URL và giữ nguyên kỳ đang xem', async () => {
    const user = userEvent.setup()
    renderPage()

    await openFilterDialog(user)
    filterValues.current = { project: PROJECT_ID, hasDebt: true }
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    await waitFor(() => expect(urlParams().get('project')).toBe(String(PROJECT_ID)))
    expect(urlParams().get('year')).toBe('2026')
    expect(urlParams().get('month')).toBe('8')
  })

  it('đưa về trang 1 khi áp bộ lọc — bảng phân trang client-side nên trang cũ sẽ rỗng', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?page=3&page_size=25&year=2026&month=8`)

    await openFilterDialog(user)
    filterValues.current = { project: PROJECT_ID, hasDebt: true }
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    await waitFor(() => expect(urlParams().get('page')).toBe('1'))
  })

  it('Xoá bộ lọc rồi Áp dụng thì gỡ hẳn project khỏi URL, không để lại chuỗi rỗng', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?${PERIOD_QS}&project=${PROJECT_ID}`)

    await openFilterDialog(user)
    await user.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }))
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    await waitFor(() => expect(urlParams().has('project')).toBe(false))
    expect(lastApiParams()?.project).toBeUndefined()
  })

  it('đóng dialog mà không Áp dụng thì URL không đổi', async () => {
    const user = userEvent.setup()
    renderPage()

    await openFilterDialog(user)
    filterValues.current = { project: PROJECT_ID, hasDebt: true }
    // `AppFilterDialog` không có nút "Huỷ" — chỉ "Xoá bộ lọc", "Áp dụng" và nút X; Escape đi
    // qua đúng đường `onOpenChange(false)` mà nút X dùng.
    await user.keyboard('{Escape}')

    await waitFor(() =>
      expect(screen.queryByTestId('project-receivable-filter')).not.toBeInTheDocument()
    )
    expect(urlParams().has('project')).toBe(false)
  })
})

describe('ReportProjectReceivablePage — badge số tiêu chí', () => {
  it('mở màn đã là 1 vì "công nợ > 0" bật sẵn và đang thật sự cắt bớt dòng', async () => {
    renderPage()

    expect(await screen.findByRole('button', { name: 'Bộ lọc 1' })).toBeInTheDocument()
  })

  it('không hiện số khi bỏ tick "công nợ > 0" và chưa lọc dự án', async () => {
    renderPage(`${BASE_URL}?${PERIOD_QS}&has_debt=0`)

    expect(await screen.findByRole('button', { name: 'Bộ lọc' })).toBeInTheDocument()
  })

  it('đếm 2 khi lọc cả dự án lẫn công nợ, KHÔNG tính kỳ tháng vì kỳ nằm ngoài dialog', async () => {
    renderPage(`${BASE_URL}?${PERIOD_QS}&project=${PROJECT_ID}`)

    expect(await screen.findByRole('button', { name: 'Bộ lọc 2' })).toBeInTheDocument()
  })
})

describe('ReportProjectReceivablePage — xuất Excel', () => {
  it('xuất theo đúng dự án đang lọc', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?${PERIOD_QS}&project=${PROJECT_ID}`)

    await user.click(screen.getByRole('button', { name: 'Xuất file' }))

    expect(mockOpenExportDialog).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026, month: 8, project: PROJECT_ID })
    )
  })

  it('xuất kèm has_debt đang áp dụng — file phải khớp bảng đang xem', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?${PERIOD_QS}&has_debt=0`)

    await user.click(screen.getByRole('button', { name: 'Xuất file' }))

    expect(mockOpenExportDialog).toHaveBeenCalledWith(expect.objectContaining({ has_debt: false }))
  })
})

describe('ReportProjectReceivablePage — bỏ tick "công nợ > 0"', () => {
  it('ghi has_debt=false lên URL và về trang 1', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?page=3&page_size=25&year=2026&month=8`)

    await openFilterDialog(user)
    filterValues.current = { project: null, hasDebt: false }
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    await waitFor(() => expect(urlParams().get('has_debt')).toBe('false'))
    expect(urlParams().get('page')).toBe('1')
  })

  it('tick lại thì ghi has_debt=true, không để lại has_debt=0 cũ', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?${PERIOD_QS}&has_debt=0`)

    await openFilterDialog(user)
    filterValues.current = { project: null, hasDebt: true }
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    await waitFor(() => expect(urlParams().get('has_debt')).toBe('true'))
    expect(lastApiParams()).toMatchObject({ has_debt: true })
  })

  it('"Xoá bộ lọc" trả về mặc định của màn (công nợ > 0 BẬT), không xoá trắng', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?${PERIOD_QS}&project=${PROJECT_ID}&has_debt=0`)

    await openFilterDialog(user)
    await user.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }))
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    await waitFor(() => expect(urlParams().has('project')).toBe(false))
    expect(urlParams().get('has_debt')).toBe('true')
    expect(lastApiParams()).toMatchObject({ has_debt: true })
  })
})
