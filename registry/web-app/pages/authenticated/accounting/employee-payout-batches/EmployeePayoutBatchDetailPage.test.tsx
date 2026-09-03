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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import EmployeePayoutBatchDetailPage from './EmployeePayoutBatchDetailPage'
import { EmployeePayoutBatchStatus as BatchStatus } from '@/constants/api-schema-aliases'

const BATCH_CODE = 'EPB000000013'

const mockUseDetail = vi.fn()
const mockDelete = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock(
  '@/features/accounting/employee-payout-batches/services/employee-payout-batch-service',
  () => ({
    useEmployeePayoutBatch: (...args: unknown[]) => mockUseDetail(...args),
    useConfirmEmployeePayoutBatch: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useExportEmployeePayoutBatch: () => ({ mutateAsync: vi.fn(), isPending: false }),
    usePostEmployeePayoutBatch: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useRecalculateEmployeePayoutBatch: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useDeleteEmployeePayoutBatch: () => ({ mutateAsync: mockDelete, isPending: false }),
  })
)

vi.mock('@/features/accounting/bank-accounts/services/bank-account-service', () => ({
  useBankAccounts: () => ({ data: { results: [] } }),
}))

vi.mock('@/lib/ability', () => ({
  useAbility: () => ({ can: () => true }),
}))

vi.mock(
  '@/features/accounting/employee-payout-batches/components/EmployeePayoutBatchDetailLines',
  () => ({
    EmployeePayoutBatchDetailLines: () => <div data-testid="payout-batch-lines" />,
  })
)

/** Chỉ đợt chi ở trạng thái nháp/đã huỷ mới hiện nút "Xóa đợt chi". */
const DRAFT_BATCH = {
  id: 13,
  code: BATCH_CODE,
  month: 6,
  year: 2026,
  wave: 'CTV',
  status: BatchStatus.DRAFT,
  batch_date: '2026-08-11',
  total_amount: '90000000',
  lines: [],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/accounting/commissions/employee-payout-batches/13']}>
      <SidebarProvider>
        <Routes>
          <Route
            path="/accounting/commissions/employee-payout-batches/:id"
            element={<EmployeePayoutBatchDetailPage />}
          />
        </Routes>
      </SidebarProvider>
    </MemoryRouter>
  )
}

async function openDeleteDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Xóa đợt chi' }))
  return screen.findByText('Xác nhận xóa đợt chi')
}

/**
 * Câu mô tả bị cắt làm ba mảnh vì mã đợt chi nằm trong `<strong>`, nên không khớp được bằng
 * chuỗi phẳng. Lọc thẳng tới thẻ `<p>` mang trọn câu — lấy đúng phần tử đang giữ lớp căn chỉnh
 * mà không cần trèo cây DOM.
 */
function deleteDialogParagraph() {
  return screen.getByText(
    (_text, element) =>
      element?.tagName === 'P' &&
      (element.textContent ?? '')
        .replace(/\s+/g, ' ')
        .includes(`Bạn có chắc chắn muốn xóa đợt chi ${BATCH_CODE} không?`)
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseDetail.mockReturnValue({ data: DRAFT_BATCH, isLoading: false, error: null })
})

describe('EmployeePayoutBatchDetailPage — popup xác nhận xóa đợt chi', () => {
  it('mở được popup từ nút "Xóa đợt chi" khi đợt chi đang ở trạng thái nháp', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await openDeleteDialog(user)).toBeInTheDocument()
    expect(deleteDialogParagraph()).toHaveTextContent(
      `Bạn có chắc chắn muốn xóa đợt chi ${BATCH_CODE} không? Hành động này không thể hoàn tác.`
    )
  })

  /**
   * `AppAlertDialog` bọc content trong `<div className="w-full">` trần — không padding ngang,
   * không căn giữa — trong khi tiêu đề và cụm nút đều `px-6` + căn giữa. Thiếu hai lớp này thì
   * câu mô tả dính sát mép trái popup, đúng lỗi mà task 86eykeq0q báo. Test canh để không tái phạm.
   */
  it('căn câu mô tả khớp tiêu đề: có padding ngang và căn giữa, không dính mép popup', async () => {
    const user = userEvent.setup()
    renderPage()
    await openDeleteDialog(user)

    const paragraph = deleteDialogParagraph()
    expect(paragraph).toHaveClass('px-6')
    expect(paragraph).toHaveClass('text-center')
  })

  it('bấm "Huỷ" thì đóng popup và không gọi API xóa', async () => {
    const user = userEvent.setup()
    renderPage()
    await openDeleteDialog(user)

    await user.click(screen.getByRole('button', { name: 'Huỷ' }))

    expect(mockDelete).not.toHaveBeenCalled()
    expect(screen.queryByText('Xác nhận xóa đợt chi')).not.toBeInTheDocument()
  })

  it('bấm "Xóa" thì gọi API xóa đúng id của đợt chi đang xem', async () => {
    const user = userEvent.setup()
    renderPage()
    await openDeleteDialog(user)

    await user.click(screen.getByRole('button', { name: 'Xóa' }))

    expect(mockDelete).toHaveBeenCalledWith(13)
  })
})
