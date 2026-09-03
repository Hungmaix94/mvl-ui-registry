import { describe, it, expect, vi, beforeEach } from 'vitest'

// `Select` đo bề rộng trigger qua ResizeObserver — jsdom không có. Stub như các test khác trong repo.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

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

import { createRef } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmployeePayoutBatchFilter, {
  type EmployeePayoutBatchFilterRef,
} from './EmployeePayoutBatchFilter'

const mockKeysMapOptions = new Map<string, Array<{ value: string; label: string }>>()

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMapOptions: mockKeysMapOptions, keysMap: new Map(), constants: {} }),
}))

const INITIAL = {
  period: new Date(2026, 4, 1),
  batchDateFrom: new Date(2026, 4, 1),
  batchDateTo: new Date(2026, 4, 31),
  status: 'CONFIRMED',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockKeysMapOptions.clear()
  mockKeysMapOptions.set('EmployeeCommissionPayoutBatch_STATUS_CHOICES', [
    { value: 'DRAFT', label: 'Bản nháp' },
    { value: 'CONFIRMED', label: 'Đã xác nhận' },
    { value: 'PAID', label: 'Paid' },
  ])
})

describe('EmployeePayoutBatchFilter', () => {
  it('hiện đủ 3 tiêu chí của bộ lọc', () => {
    render(<EmployeePayoutBatchFilter />)

    expect(screen.getByText('Kỳ tháng')).toBeInTheDocument()
    expect(screen.getByText('Ngày tạo đợt')).toBeInTheDocument()
    expect(screen.getByText('Trạng thái')).toBeInTheDocument()
  })

  it('nạp lại giá trị đang lọc từ URL vào form', () => {
    const ref = createRef<EmployeePayoutBatchFilterRef>()
    render(<EmployeePayoutBatchFilter ref={ref} initialValues={INITIAL} />)

    expect(ref.current?.getValues()).toMatchObject({
      period: INITIAL.period,
      batchDateFrom: INITIAL.batchDateFrom,
      batchDateTo: INITIAL.batchDateTo,
      status: 'CONFIRMED',
    })
  })

  it('xoá sạch giá trị khi gọi clearForm', () => {
    const ref = createRef<EmployeePayoutBatchFilterRef>()
    render(<EmployeePayoutBatchFilter ref={ref} initialValues={INITIAL} />)

    act(() => ref.current?.clearForm())

    expect(ref.current?.getValues()).toEqual({
      period: null,
      batchDateFrom: null,
      batchDateTo: null,
      status: '',
    })
  })

  it('không để giá trị cũ hiện lại trên giao diện sau khi xoá lọc', () => {
    // Bẫy đã biết (docs/ai/patterns.md § clearForm): `<Controller>` nhớ default lúc mount nên
    // form "trông như đã xoá" ở lần đọc đầu rồi tự điền lại ở render kế tiếp. `formKey` buộc
    // các field remount; test này chết ngay nếu ai đó gỡ nó ra.
    const ref = createRef<EmployeePayoutBatchFilterRef>()
    render(<EmployeePayoutBatchFilter ref={ref} initialValues={INITIAL} />)

    expect(screen.getByText('Tháng 5 2026')).toBeInTheDocument()

    act(() => ref.current?.clearForm())

    expect(screen.queryByText('Tháng 5 2026')).toBeNull()
    expect(screen.getByText('Chọn kỳ tháng')).toBeInTheDocument()
    expect(ref.current?.getValues()).toMatchObject({ period: null, status: '' })
  })

  it('dịch nhãn trạng thái còn tiếng Anh sang tiếng Việt cho khớp chip trên bảng', async () => {
    const user = userEvent.setup()
    render(<EmployeePayoutBatchFilter />)

    // 'Paid' từ app-constant phải hiện thành 'Đã thanh toán' — giống EmployeePayoutBatchStatusBadge.
    await user.click(screen.getByText('Chọn trạng thái'))

    expect(await screen.findByText('Đã thanh toán')).toBeInTheDocument()
    expect(screen.queryByText('Paid')).toBeNull()
  })
})
