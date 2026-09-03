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
import type { EmployeePayoutBatchFilterFormData } from '@/features/accounting/employee-payout-batches/components/EmployeePayoutBatchFilter'
import EmployeePayoutBatchListPage from './EmployeePayoutBatchListPage'

const BASE_URL = '/accounting/commissions/employee-payout-batches'

const mockUseList = vi.fn()
const mockOpenExportDialog = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock(
  '@/features/accounting/employee-payout-batches/services/employee-payout-batch-service',
  () => ({
    useEmployeePayoutBatches: (...args: unknown[]) => mockUseList(...args),
    useDeleteEmployeePayoutBatch: () => ({ mutateAsync: vi.fn(), isPending: false }),
  })
)

vi.mock('@/features/accounting/_shares/hooks/useAccountingListExport', () => ({
  useAccountingListExport: () => ({
    openExportDialog: (...args: unknown[]) => mockOpenExportDialog(...args),
    isExporting: false,
  }),
}))

/**
 * Bảng thật được thay bằng stub phơi ra đúng `onDelete` — đủ để mở popup xác nhận xóa mà không
 * phải dựng cả bảng lẫn ma trận trạng thái quyết định dòng nào có nút xoá.
 */
vi.mock(
  '@/features/accounting/employee-payout-batches/components/EmployeePayoutBatchTable',
  () => ({
    default: ({ onDelete }: { onDelete?: (record: { id: number; code: string }) => void }) => (
      <div data-testid="payout-batch-table">
        <button type="button" onClick={() => onDelete?.({ id: 13, code: 'EPB000000013' })}>
          stub-xoa-dot-chi
        </button>
      </div>
    ),
  })
)

/**
 * Bộ lọc thật được thay bằng stub phơi ra đúng `getValues` / `clearForm` — các test dưới đây
 * kiểm phần việc của TRANG (URL ⇄ query param), không kiểm nội bộ các picker.
 * `filterValues` là hộp điều khiển: đặt giá trị rồi bấm "Áp dụng".
 */
const filterValues: { current: EmployeePayoutBatchFilterFormData } = { current: {} }

vi.mock(
  '@/features/accounting/employee-payout-batches/components/EmployeePayoutBatchFilter',
  () => ({
    default: forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
      useImperativeHandle(ref, () => ({
        getValues: () => filterValues.current,
        clearForm: () => {
          filterValues.current = {}
        },
      }))
      return <div data-testid="payout-batch-filter" />
    }),
  })
)

function LocationProbe() {
  const { search } = useLocation()
  return <div data-testid="search-params">{search}</div>
}

function renderPage(initialUrl = BASE_URL) {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <SidebarProvider>
        <EmployeePayoutBatchListPage />
        <LocationProbe />
      </SidebarProvider>
    </MemoryRouter>
  )
}

/** Query param cuối cùng mà trang đưa cho hook danh sách. */
function lastApiParams() {
  return mockUseList.mock.calls.at(-1)?.[0]
}

/** Tham số hiện có trên URL, đọc qua `LocationProbe`. */
function urlParams() {
  return new URLSearchParams(screen.getByTestId('search-params').textContent ?? '')
}

/** Khi có tiêu chí đang áp dụng, nút mọc thêm badge số nên tên khả truy cập là "Bộ lọc <n>". */
const FILTER_BUTTON = /^Bộ lọc/

async function openFilterDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: FILTER_BUTTON }))
  return screen.findByTestId('payout-batch-filter')
}

beforeEach(() => {
  vi.clearAllMocks()
  filterValues.current = {}
  mockUseList.mockReturnValue({ data: { results: [], count: 0 }, isLoading: false, error: null })
})

describe('EmployeePayoutBatchListPage — URL đọc thành query param', () => {
  it('chuyển đủ 3 tiêu chí từ URL sang tham số API', async () => {
    renderPage(
      `${BASE_URL}?page=1&page_size=25&year=2026&month=5&batch_date_after=2026-05-01&batch_date_before=2026-05-31&status=CONFIRMED`
    )

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()).toMatchObject({
      year: 2026,
      month: 5,
      batch_date_after: '2026-05-01',
      batch_date_before: '2026-05-31',
      status: 'CONFIRMED',
    })
  })

  it('bỏ qua kỳ tháng khi URL chỉ có year mà thiếu month', async () => {
    renderPage(`${BASE_URL}?page=1&page_size=25&year=2026`)

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()).not.toHaveProperty('year')
    expect(lastApiParams()).not.toHaveProperty('month')
  })

  it('loại trạng thái không thuộc enum để BE không trả 400', async () => {
    renderPage(`${BASE_URL}?page=1&page_size=25&status=KHONG_TON_TAI`)

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()).not.toHaveProperty('status')
  })

  it('chỉ gửi một khoảng ngày khi người dùng để hở một đầu', async () => {
    renderPage(`${BASE_URL}?page=1&page_size=25&batch_date_after=2026-05-01`)

    await waitFor(() => expect(lastApiParams()).toBeDefined())
    expect(lastApiParams()).toMatchObject({ batch_date_after: '2026-05-01' })
    expect(lastApiParams()).not.toHaveProperty('batch_date_before')
  })
})

describe('EmployeePayoutBatchListPage — badge số tiêu chí', () => {
  it('đếm kỳ tháng là MỘT tiêu chí dù nó chiếm hai param year+month', async () => {
    renderPage(
      `${BASE_URL}?page=1&page_size=25&year=2026&month=5&batch_date_after=2026-05-01&status=DRAFT`
    )

    // Kỳ tháng + khoảng ngày + trạng thái = 3, không phải 4.
    expect(await screen.findByRole('button', { name: 'Bộ lọc 3' })).toBeInTheDocument()
  })

  it('đếm khoảng ngày là MỘT tiêu chí dù có cả hai đầu mút', async () => {
    // Badge phải khớp SỐ Ô trong dialog (3), không phải số query param (5).
    renderPage(
      `${BASE_URL}?page=1&page_size=25&year=2026&month=5&batch_date_after=2026-05-01&batch_date_before=2026-05-31&status=DRAFT`
    )

    expect(await screen.findByRole('button', { name: 'Bộ lọc 3' })).toBeInTheDocument()
  })

  it('đếm khoảng ngày hở một đầu vẫn là một tiêu chí', async () => {
    renderPage(`${BASE_URL}?page=1&page_size=25&batch_date_before=2026-05-31`)

    expect(await screen.findByRole('button', { name: 'Bộ lọc 1' })).toBeInTheDocument()
  })

  it('không hiện badge khi chưa lọc gì', async () => {
    renderPage(`${BASE_URL}?page=1&page_size=25`)

    expect(await screen.findByRole('button', { name: 'Bộ lọc' })).toBeInTheDocument()
  })
})

describe('EmployeePayoutBatchListPage — áp dụng bộ lọc', () => {
  it('ghi kỳ tháng, khoảng ngày và trạng thái lên URL rồi về trang 1', async () => {
    const user = userEvent.setup()
    renderPage(`${BASE_URL}?page=3&page_size=25`)

    await openFilterDialog(user)
    filterValues.current = {
      period: new Date(2026, 4, 1),
      batchDateFrom: new Date(2026, 4, 1),
      batchDateTo: new Date(2026, 4, 31),
      status: 'PAID',
    }
    await user.click(screen.getByRole('button', { name: /áp dụng/i }))

    await waitFor(() => expect(urlParams().get('status')).toBe('PAID'))

    const params = urlParams()
    expect(params.get('year')).toBe('2026')
    expect(params.get('month')).toBe('5')
    expect(params.get('batch_date_after')).toBe('2026-05-01')
    expect(params.get('batch_date_before')).toBe('2026-05-31')
    // Đổi bộ lọc phải kéo về trang 1, nếu không người dùng nhìn vào trang trống.
    expect(params.get('page')).toBe('1')
  })

  it('gỡ sạch tiêu chí cũ khỏi URL khi áp dụng bộ lọc rỗng', async () => {
    const user = userEvent.setup()
    renderPage(
      `${BASE_URL}?page=1&page_size=25&year=2026&month=5&batch_date_after=2026-05-01&status=DRAFT`
    )

    await openFilterDialog(user)
    // Bấm "Xoá lọc" rồi "Áp dụng" — đúng thao tác người dùng làm khi muốn xem lại toàn bộ.
    await user.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }))
    await user.click(screen.getByRole('button', { name: /áp dụng/i }))

    await waitFor(() => expect(urlParams().get('year')).toBeNull())

    const params = urlParams()
    expect(params.get('month')).toBeNull()
    expect(params.get('batch_date_after')).toBeNull()
    expect(params.get('batch_date_before')).toBeNull()
    expect(params.get('status')).toBeNull()
  })
})

describe('EmployeePayoutBatchListPage — popup xác nhận xóa đợt chi', () => {
  /**
   * `AppAlertDialog` bọc content trong `<div className="w-full">` trần — không padding ngang,
   * không căn giữa — trong khi tiêu đề và cụm nút đều `px-6` + căn giữa. Thiếu hai lớp này thì
   * câu mô tả dính sát mép trái popup, đúng lỗi task 86eykeq0q báo ở màn chi tiết. Popup ở đây
   * là cùng một popup nên canh luôn để hai màn không lệch nhau.
   */
  it('căn câu mô tả khớp tiêu đề: có padding ngang và căn giữa, không dính mép popup', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'stub-xoa-dot-chi' }))

    // Mã đợt chi nằm trong `<strong>` nên câu mô tả không khớp được bằng chuỗi phẳng — lọc
    // thẳng tới thẻ `<p>` mang trọn câu.
    const paragraph = await screen.findByText(
      (_text, element) =>
        element?.tagName === 'P' &&
        (element.textContent ?? '')
          .replace(/\s+/g, ' ')
          .includes('Bạn có chắc chắn muốn xóa đợt chi EPB000000013 không?')
    )
    expect(paragraph).toHaveClass('px-6')
    expect(paragraph).toHaveClass('text-center')
  })
})

describe('EmployeePayoutBatchListPage — xuất Excel', () => {
  it('xuất theo đúng bộ lọc đang xem, không kèm tham số phân trang', async () => {
    const user = userEvent.setup()
    renderPage(
      `${BASE_URL}?page=2&page_size=25&year=2026&month=5&batch_date_after=2026-05-01&status=DRAFT`
    )

    await user.click(screen.getByRole('button', { name: 'Xuất file' }))

    expect(mockOpenExportDialog).toHaveBeenCalledWith({
      year: 2026,
      month: 5,
      batch_date_after: '2026-05-01',
      status: 'DRAFT',
    })
  })
})
