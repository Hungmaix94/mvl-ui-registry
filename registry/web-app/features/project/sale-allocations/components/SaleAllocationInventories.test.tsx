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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import SaleAllocationInventories from './SaleAllocationInventories'

const SA_ID = 77

const mockMutate = vi.fn()
const mockUseList = vi.fn()

vi.mock('@/services/realestate-service', () => ({
  useSalesAllocationProductInventories: (...args: unknown[]) => mockUseList(...args),
  useDeleteSalesAllocationProductInventory: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}))

/**
 * Bảng thật được thay bằng stub phơi ra đúng `onDelete` — đủ để kiểm phần việc của tab
 * ("DS căn" nối dây xoá) mà không phải dựng cả bảng lẫn ma trận quyền quyết định dòng nào
 * có mục "Xoá". Stub KHÔNG tự gọi được gì nếu tab quên truyền prop, nên nó chính là chốt
 * chặn hồi quy cho bug gốc: menu ⋯ có "Xoá" nhưng bấm không làm gì.
 */
vi.mock(
  '@/pages/authenticated/project/product-inventories/components/ProductInventoryTable',
  () => ({
    default: ({
      onDelete,
      currentPage,
      onPaginationChange,
    }: {
      onDelete?: (record: { id: number; unit_number: string }) => void
      currentPage?: number
      onPaginationChange?: (pageIndex: number, pageSize?: number) => void
    }) => (
      <div data-testid="product-inventory-table">
        <button type="button" onClick={() => onDelete?.({ id: 501, unit_number: 'HH3-C12A06' })}>
          stub-xoa-can
        </button>
        {/* `currentPage` là số trang 1-based mà tab tự tin đang hiển thị. */}
        <span data-testid="stub-current-page">{String(currentPage)}</span>
        {/* `useTable` phát ra pageIndex 0-based: trang 2 = 1, trang 1 = 0. */}
        <button type="button" onClick={() => onPaginationChange?.(1, 25)}>
          stub-den-trang-2
        </button>
        <button type="button" onClick={() => onPaginationChange?.(0, 25)}>
          stub-ve-trang-1
        </button>
      </div>
    ),
  })
)

const renderTab = (initialUrl = '/') =>
  render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <SaleAllocationInventories saleAllocationId={SA_ID} />
    </MemoryRouter>
  )

/** Tham số `page` của lần gọi hook gần nhất — tức thứ thật sự bay lên API. */
const lastRequestedPage = () =>
  (mockUseList.mock.calls.at(-1)?.[1] as { page?: number } | undefined)?.page

/** Mọi giá trị `page` từng được yêu cầu — dùng để khẳng định `page=0` chưa bao giờ xuất hiện. */
const allRequestedPages = () =>
  mockUseList.mock.calls.map((call) => (call[1] as { page?: number } | undefined)?.page)

describe('SaleAllocationInventories — luồng xoá căn ở tab "DS căn"', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseList.mockReturnValue({
      data: { results: [{ id: 501, unit_number: 'HH3-C12A06' }], count: 1 },
      isLoading: false,
    })
  })

  it('truyền onDelete xuống bảng nên bấm "Xoá" mở được dialog xác nhận', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: 'stub-xoa-can' }))

    await waitFor(() => {
      expect(screen.getByText('Xóa Bất động sản')).toBeInTheDocument()
    })
  })

  it('dialog nhắc đúng mã căn người dùng đang nhìn thấy trên bảng', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: 'stub-xoa-can' }))

    await waitFor(() => {
      expect(screen.getByText(/HH3-C12A06/)).toBeInTheDocument()
    })
  })

  it('chỉ mở dialog, chưa gọi API xoá', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: 'stub-xoa-can' }))
    await screen.findByText('Xóa Bất động sản')

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('bấm Huỷ thì đóng dialog và không gọi API xoá', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: 'stub-xoa-can' }))
    await screen.findByText('Xóa Bất động sản')

    await user.click(screen.getByRole('button', { name: 'Huỷ' }))

    await waitFor(() => {
      expect(screen.queryByText('Xóa Bất động sản')).not.toBeInTheDocument()
    })
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('xác nhận thì gọi endpoint scoped theo bảng hàng, đúng saPk và id căn', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: 'stub-xoa-can' }))
    await screen.findByText('Xóa Bất động sản')

    await user.click(screen.getByRole('button', { name: 'Xoá' }))

    expect(mockMutate).toHaveBeenCalledTimes(1)
    expect(mockMutate.mock.calls[0][0]).toEqual({ saPk: SA_ID, id: 501 })
  })

  /**
   * Lưu ý về cơ chế đóng dialog (đo thật trên staging 19/08): `AppDialog.handleConfirm` tự gọi
   * `onOpenChange(false)` khi `onConfirm` KHÔNG throw — mà `mutate()` không throw (khác
   * `mutateAsync`). Nên dialog đóng ngay lúc bấm, không chờ API; lỗi 400 của BE hiện qua toast
   * (`BaseApiService.delete` mặc định `showErrorToast ?? true`). `onSuccess` ở đây là để RESET
   * bản ghi đang chọn, không phải để đóng dialog — đừng đọc nhầm rồi bỏ nó đi.
   */
  it('xoá xong thì reset bản ghi đang chọn qua onSuccess', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: 'stub-xoa-can' }))
    await screen.findByText('Xóa Bất động sản')
    await user.click(screen.getByRole('button', { name: 'Xoá' }))

    const onSuccess = mockMutate.mock.calls[0][1]?.onSuccess
    if (typeof onSuccess !== 'function') {
      throw new Error('mutate phải nhận callback onSuccess để reset bản ghi đang chọn')
    }
    onSuccess()

    await waitFor(() => {
      expect(screen.queryByText('Xóa Bất động sản')).not.toBeInTheDocument()
    })
  })
})

/**
 * Bug 86eyp02ev: "Click page số 2 => Click page số 1 thì báo lỗi".
 *
 * `useTable.onPaginationChange` phát ra `pageIndex` **0-based**, còn `page` trên URL và trên API là
 * **1-based**. Tab này ghi thẳng pageIndex vào URL nên bấm về trang đầu ghi `page=0`, và
 * `GET /api/realestate/sales-allocations/<id>/product-inventories/?page=0` trả **404
 * `Invalid page.`** (đo thật trên SA 1826, 20/08) ⇒ bảng rỗng "Chưa có dữ liệu có sẵn".
 *
 * Nửa còn lại của cùng một lỗi thì im lặng: bấm trang 2 ghi `page=1` nên bảng hiện lại trang 1, và
 * `currentPage - 1` kéo highlight về trang 1 — người dùng không rời khỏi trang đầu được.
 */
describe('SaleAllocationInventories — phân trang 1-based (86eyp02ev)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseList.mockReturnValue({
      data: { results: [{ id: 501, unit_number: 'HH3-C12A06' }], count: 51 },
      isLoading: false,
    })
  })

  it('URL chưa có page thì hỏi API trang 1', () => {
    renderTab()

    expect(lastRequestedPage()).toBe(1)
    expect(screen.getByTestId('stub-current-page')).toHaveTextContent('1')
  })

  it('bấm sang trang 2 thì hỏi API trang 2, không phải trang 1', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: 'stub-den-trang-2' }))

    await waitFor(() => expect(lastRequestedPage()).toBe(2))
    expect(screen.getByTestId('stub-current-page')).toHaveTextContent('2')
  })

  it('từ trang 2 bấm về trang 1 thì hỏi API trang 1 — không bao giờ gửi page=0', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(screen.getByRole('button', { name: 'stub-den-trang-2' }))
    await waitFor(() => expect(lastRequestedPage()).toBe(2))

    await user.click(screen.getByRole('button', { name: 'stub-ve-trang-1' }))

    await waitFor(() => expect(lastRequestedPage()).toBe(1))
    expect(
      allRequestedPages(),
      'page=0 làm API trả 404 "Invalid page." — đúng lỗi QA báo'
    ).not.toContain(0)
  })

  it('URL cũ còn page=0 (bookmark/share) vẫn mở được, tự coi là trang 1', () => {
    renderTab('/?tab=inventory&page=0&page_size=25')

    expect(lastRequestedPage()).toBe(1)
    expect(allRequestedPages()).not.toContain(0)
  })

  it('page rác trên URL không lọt xuống API', () => {
    renderTab('/?page=abc')

    expect(lastRequestedPage()).toBe(1)
  })

  it('URL có page=3 thì hỏi đúng trang 3 (không tự cộng thêm lần nữa)', () => {
    renderTab('/?page=3&page_size=25')

    expect(lastRequestedPage()).toBe(3)
    expect(screen.getByTestId('stub-current-page')).toHaveTextContent('3')
  })
})
