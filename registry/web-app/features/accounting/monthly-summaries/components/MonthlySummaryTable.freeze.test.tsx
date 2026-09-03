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

import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import MonthlySummaryTable from './MonthlySummaryTable'

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

const ROWS = [
  {
    id: 1,
    beneficiary_type: 'EMPLOYEE',
    beneficiary_employee_name: 'Đặng Thị Vượng',
    sale_total: '1000',
    mgmt_total: '200',
    f2_total: '0',
    slk_total: '0',
    pre_tax_total: '1200',
    pit_amount: '120',
    hold_amount: '0',
    recovered_advance_amount: '0',
    net_payable: '1080',
    status: 'DRAFT',
  },
  {
    id: 2,
    beneficiary_type: 'COLLABORATOR',
    beneficiary_collaborator_name: 'Nguyễn Văn A',
    sale_total: '500',
    mgmt_total: '0',
    f2_total: '0',
    slk_total: '0',
    pre_tax_total: '500',
    pit_amount: '50',
    hold_amount: '0',
    recovered_advance_amount: '0',
    net_payable: '450',
    status: 'CONFIRMED',
  },
]

const BASE_PROPS = {
  data: ROWS,
  isLoading: false,
  totalRecords: 2,
  pageSize: 25,
  pageCount: 1,
  currentPageIndex: 0,
}

function renderTable(props: Record<string, any>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrap = (p: Record<string, any>) => (
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <SidebarProvider>
          <MonthlySummaryTable {...(p as any)} />
        </SidebarProvider>
      </QueryClientProvider>
    </MemoryRouter>
  )
  const utils = render(wrap(props))
  return { ...utils, rerenderWith: (p: Record<string, any>) => utils.rerender(wrap(p)) }
}

/** Đẩy hết microtask — TanStack gom autoResetPageIndex vào `table._queue`, flush ở microtask. */
async function flush() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('MonthlySummaryTable — chống treo trang', () => {
  it('không tự gọi onPaginationChange khi render lại, dù kỳ CÓ dữ liệu', async () => {
    // Bug cũ: dòng "TỔNG CỘNG" dựng ngoài useMemo ⇒ `data` truyền vào TanStack đổi tham chiếu
    // mỗi lần render ⇒ autoResetPageIndex bắn onPaginationChange ⇒ trang cha setSearchParams
    // ⇒ render lại ⇒ lặp vô hạn, trình duyệt đứng hình. Kỳ rỗng không có dòng tổng nên không lộ.
    const onPaginationChange = vi.fn()
    const props = { ...BASE_PROPS, onPaginationChange }
    const { rerenderWith } = renderTable(props)
    await flush()

    expect(screen.getByText('TỔNG CỘNG')).toBeInTheDocument()

    onPaginationChange.mockClear()
    // Cùng props, chỉ render lại — không có gì đáng để đổi trang.
    rerenderWith(props)
    await flush()
    rerenderWith(props)
    await flush()

    expect(onPaginationChange).not.toHaveBeenCalled()
  })

  it('hiện bảng lỗi thay vì làm lệch số hook khi query hỏng giữa chừng', async () => {
    // Bug cũ: `if (error) return <TableError />` nằm TRƯỚC hai useMemo phía dưới. Lần render đầu
    // (chưa lỗi) chạy đủ hook, lần sau (đã lỗi) return sớm nên chạy thiếu ⇒ React ném
    // "Rendered fewer hooks than expected". Phải đổi props giữa chừng mới lộ.
    const { rerenderWith } = renderTable({ ...BASE_PROPS, onPaginationChange: vi.fn() })
    await flush()

    expect(() =>
      rerenderWith({
        ...BASE_PROPS,
        data: [],
        error: new Error('500'),
        onPaginationChange: vi.fn(),
      })
    ).not.toThrow()
  })
})
