import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  /** Props của mỗi lần render `CascadeSelectGroupOrganization`, mới nhất nằm cuối. */
  cascadeProps: [] as Array<Record<string, any>>,
  /** Tăng mỗi lần cascade MOUNT — chứng minh `formKey` thật sự remount nó. */
  cascadeMounts: 0,
}))

// Cascade tự kéo toàn bộ sơ đồ tổ chức lúc mount; stub lại và ghi nhận nó được truyền gì.
// Cố ý KHÔNG stub `OrgCascadeField` để phần map id số → id chuỗi của nó vẫn chạy thật.
vi.mock('@/components/commons/filters/CascadeSelectGroupOrganization', async () => {
  const { useEffect } = await import('react')
  return {
    CascadeSelectGroupOrganization: (props: Record<string, any>) => {
      h.cascadeProps.push(props)
      useEffect(() => {
        h.cascadeMounts += 1
      }, [])
      return null
    },
  }
})

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

// Các select quan hệ gọi API dropdown — không thuộc phạm vi test này.
vi.mock('@/hooks/useProjectSelect', () => ({
  useProjectSelect: () => ({
    loadProjectOptions: vi.fn().mockResolvedValue([]),
    loadInitialProjectOptions: vi.fn().mockResolvedValue([]),
  }),
}))
vi.mock('@/hooks/useInvestorSelect', () => ({
  useInvestorSelect: () => ({
    loadInvestorOptions: vi.fn().mockResolvedValue([]),
    loadInitialInvestorOptions: vi.fn().mockResolvedValue([]),
  }),
}))
vi.mock('@/hooks/useCustomerSelect', () => ({
  useCustomerSelect: () => ({
    loadCustomerOptions: vi.fn().mockResolvedValue([]),
    loadInitialCustomerOptions: vi.fn().mockResolvedValue([]),
  }),
}))

import { createRef } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DepositContractFilter, { type DepositContractFilterRef } from './DepositContractFilter'

const mockKeysMapOptions = new Map<string, Array<{ value: string; label: string }>>()

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMapOptions: mockKeysMapOptions, keysMap: new Map(), constants: {} }),
}))

// Giá trị thật lấy từ `GET /api/constants/` → sales.DepositContract_APPROVAL_STATUS_CHOICES
// (đo 17/08/2026). Đây là 7 giá trị BE nhận cho query param `approval_status`.
const APPROVAL_OPTIONS = [
  { value: 'pending_confirm', label: 'Chờ người bán cùng xác nhận' },
  { value: 'pending_manager', label: 'Chờ trưởng phòng duyệt' },
  { value: 'pending_admin', label: 'Chờ TKKD duyệt' },
  { value: 'pending_admin_lead', label: 'Chờ Trưởng phòng TKKD duyệt' },
  { value: 'pending_accountant', label: 'Chờ kế toán duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Đã từ chối' },
]

const STATUS_OPTIONS = [
  { value: 'new', label: 'Mới' },
  { value: 'pending_approval', label: 'Chờ duyệt' },
  { value: 'abandoned', label: 'Đã bỏ' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
]

beforeEach(() => {
  vi.clearAllMocks()
  h.cascadeProps.length = 0
  h.cascadeMounts = 0
  mockKeysMapOptions.clear()
  mockKeysMapOptions.set('DepositContract_STATUS_CHOICES', STATUS_OPTIONS)
  mockKeysMapOptions.set('DepositContract_APPROVAL_STATUS_CHOICES', APPROVAL_OPTIONS)
})

const lastCascadeProps = () => h.cascadeProps[h.cascadeProps.length - 1]

const tickedBoxes = () =>
  screen.getAllByRole('checkbox').filter((c) => c.getAttribute('aria-checked') === 'true')

describe('DepositContractFilter — nhóm ô tick trạng thái', () => {
  it('bày SẴN mọi lựa chọn thành ô tick, không giấu trong popover', () => {
    render(<DepositContractFilter />)

    expect(screen.getByText('Trạng thái')).toBeInTheDocument()
    expect(screen.getByText('Trạng thái phê duyệt')).toBeInTheDocument()
    for (const option of APPROVAL_OPTIONS) {
      expect(screen.getByText(option.label)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('checkbox')).toHaveLength(
      STATUS_OPTIONS.length + APPROVAL_OPTIONS.length
    )
  })

  it('mặc định không tick gì', () => {
    const ref = createRef<DepositContractFilterRef>()
    render(<DepositContractFilter ref={ref} />)

    expect(ref.current?.getValues().approval_status__in).toEqual([])
    expect(tickedBoxes()).toHaveLength(0)
  })

  it('tick vào ô thì giá trị vào form, bỏ tick thì ra khỏi form', async () => {
    const user = userEvent.setup()
    const ref = createRef<DepositContractFilterRef>()
    render(<DepositContractFilter ref={ref} />)

    await user.click(screen.getByText('Chờ trưởng phòng duyệt'))
    await waitFor(() =>
      expect(ref.current?.getValues().approval_status__in).toEqual(['pending_manager'])
    )

    await user.click(screen.getByText('Chờ trưởng phòng duyệt'))
    await waitFor(() => expect(ref.current?.getValues().approval_status__in).toEqual([]))
  })

  it('tick được NHIỀU ô cùng lúc', async () => {
    const user = userEvent.setup()
    const ref = createRef<DepositContractFilterRef>()
    render(<DepositContractFilter ref={ref} />)

    await user.click(screen.getByText('Chờ trưởng phòng duyệt'))
    await user.click(screen.getByText('Chờ kế toán duyệt'))

    await waitFor(() =>
      expect(ref.current?.getValues().approval_status__in).toEqual([
        'pending_manager',
        'pending_accountant',
      ])
    )
  })

  // Cùng một tập lựa chọn phải sinh ra cùng một URL dù người dùng bấm theo thứ tự nào —
  // bám thứ tự bấm thì hai người chọn giống hệt nhau lại ra hai link khác nhau.
  it('mảng phát ra bám thứ tự DANH SÁCH, không bám thứ tự bấm', async () => {
    const user = userEvent.setup()
    const ref = createRef<DepositContractFilterRef>()
    render(<DepositContractFilter ref={ref} />)

    // Bấm ngược: "Đã duyệt" (gần cuối) trước, "Chờ người bán cùng xác nhận" (đầu) sau
    await user.click(screen.getByText('Đã duyệt'))
    await user.click(screen.getByText('Chờ người bán cùng xác nhận'))

    await waitFor(() =>
      expect(ref.current?.getValues().approval_status__in).toEqual(['pending_confirm', 'approved'])
    )
  })

  it('nạp lại giá trị đang lọc từ URL và tick sẵn đúng ô', () => {
    const ref = createRef<DepositContractFilterRef>()
    render(
      <DepositContractFilter
        ref={ref}
        initialValues={{ approval_status__in: ['pending_manager', 'approved'] }}
      />
    )

    expect(ref.current?.getValues().approval_status__in).toEqual(['pending_manager', 'approved'])
    expect(tickedBoxes()).toHaveLength(2)
  })

  // `status` và `approval_status` là hai filter BE khác nhau nhưng trùng vài tên giá trị.
  // Tick ô của nhóm này không được đụng nhóm kia.
  it('giữ hai nhóm độc lập nhau', () => {
    const ref = createRef<DepositContractFilterRef>()
    render(
      <DepositContractFilter
        ref={ref}
        initialValues={{ status__in: ['new'], approval_status__in: ['rejected'] }}
      />
    )

    expect(ref.current?.getValues().status__in).toEqual(['new'])
    expect(ref.current?.getValues().approval_status__in).toEqual(['rejected'])
  })

  it('clearForm bỏ tick sạch cả hai nhóm', async () => {
    const ref = createRef<DepositContractFilterRef>()
    render(
      <DepositContractFilter
        ref={ref}
        initialValues={{ status__in: ['new'], approval_status__in: ['pending_manager'] }}
      />
    )

    expect(tickedBoxes()).toHaveLength(2)

    act(() => ref.current?.clearForm())

    await waitFor(() => expect(ref.current?.getValues().status__in).toEqual([]))
    expect(ref.current?.getValues().approval_status__in).toEqual([])
    expect(tickedBoxes()).toHaveLength(0)
  })
})

describe('DepositContractFilter — cascade tổ chức', () => {
  it('dùng cascade dùng chung, tắt nhân viên/chức vụ và bỏ validate', () => {
    render(<DepositContractFilter />)

    expect(lastCascadeProps()).toMatchObject({
      showEmployee: false,
      showPosition: false,
      skipValidation: true,
    })
  })

  it('nạp lại 3 cấp tổ chức đang lọc từ URL', () => {
    render(<DepositContractFilter initialValues={{ branch: '5', block: '7', department: '9' }} />)

    expect(lastCascadeProps().initialValues).toEqual({
      branch: '5',
      block: '7',
      department: '9',
    })
  })

  it('cascade phát id SỐ thì form nhận lại id CHUỖI', async () => {
    const ref = createRef<DepositContractFilterRef>()
    render(<DepositContractFilter ref={ref} />)

    act(() => {
      lastCascadeProps().onFormChange({ branch_id: 5, block_id: 7, department_id: 9 })
    })

    await waitFor(() => expect(ref.current?.getValues().branch).toBe('5'))
    expect(ref.current?.getValues().block).toBe('7')
    expect(ref.current?.getValues().department).toBe('9')
  })

  // Cascade giữ state nội bộ nên `reset()` của RHF không xoá được nó — chỉ remount mới xoá.
  it('clearForm REMOUNT cascade và không nạp lại giá trị vừa xoá', async () => {
    const ref = createRef<DepositContractFilterRef>()
    render(<DepositContractFilter ref={ref} initialValues={{ branch: '5' }} />)

    const mountsBefore = h.cascadeMounts
    act(() => ref.current?.clearForm())

    await waitFor(() => expect(h.cascadeMounts).toBe(mountsBefore + 1))
    expect(lastCascadeProps().initialValues).toBeUndefined()
    expect(ref.current?.getValues().branch).toBeUndefined()
  })
})

describe('DepositContractFilter — khoảng ngày và khách hàng', () => {
  const RANGE_PLACEHOLDER = 'DD/MM/YYYY - DD/MM/YYYY'

  it('gộp "Từ ngày"/"Đến ngày" thành MỘT ô khoảng ngày', () => {
    render(<DepositContractFilter />)

    expect(screen.getByText('Ngày hợp đồng')).toBeInTheDocument()
    expect(screen.queryByText('Từ ngày (HĐ)')).not.toBeInTheDocument()
    expect(screen.queryByText('Đến ngày (HĐ)')).not.toBeInTheDocument()
  })

  it('clearForm xoá cả giá trị form LẪN chữ hiển thị trên ô khoảng ngày', async () => {
    const ref = createRef<DepositContractFilterRef>()
    render(
      <DepositContractFilter
        ref={ref}
        initialValues={{
          contractDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 17) },
        }}
      />
    )

    // "Ngày làm phiếu TTGD" is a separate, independent range and stays empty here — its own
    // placeholder is the only one that should show while "Ngày hợp đồng" carries a value.
    expect(screen.getAllByText(RANGE_PLACEHOLDER)).toHaveLength(1)

    act(() => ref.current?.clearForm())

    await waitFor(() => expect(screen.getAllByText(RANGE_PLACEHOLDER)).toHaveLength(2))
    expect(ref.current?.getValues().contractDateRange).toBeNull()
  })

  it('dùng Select chọn khách hàng thay cho ô nhập tên tự do', () => {
    render(<DepositContractFilter />)

    expect(screen.getByText('Khách hàng')).toBeInTheDocument()
    expect(screen.getByText('Chọn khách hàng')).toBeInTheDocument()
    expect(screen.queryByText('Tên khách hàng')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Nhập tên khách hàng')).not.toBeInTheDocument()
  })

  it('có riêng ô "Ngày làm phiếu TTGD", độc lập với "Ngày hợp đồng"', () => {
    render(<DepositContractFilter />)

    expect(screen.getByText('Ngày hợp đồng')).toBeInTheDocument()
    expect(screen.getByText('Ngày làm phiếu TTGD')).toBeInTheDocument()
  })

  it('hydrates Ngày làm phiếu TTGD độc lập với Ngày hợp đồng', () => {
    const ref = createRef<DepositContractFilterRef>()
    render(
      <DepositContractFilter
        ref={ref}
        initialValues={{
          contractDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 17) },
          transactionSheetDateRange: { from: new Date(2026, 7, 5), to: new Date(2026, 7, 20) },
        }}
      />
    )

    expect(ref.current?.getValues().contractDateRange).toEqual({
      from: new Date(2026, 7, 1),
      to: new Date(2026, 7, 17),
    })
    expect(ref.current?.getValues().transactionSheetDateRange).toEqual({
      from: new Date(2026, 7, 5),
      to: new Date(2026, 7, 20),
    })
    // Cả hai khoảng ngày đều đã điền, nên placeholder trống không còn xuất hiện ở đâu.
    expect(screen.queryByText(RANGE_PLACEHOLDER)).not.toBeInTheDocument()
  })

  it('clearForm xoá luôn Ngày làm phiếu TTGD, không chỉ Ngày hợp đồng', async () => {
    const ref = createRef<DepositContractFilterRef>()
    render(
      <DepositContractFilter
        ref={ref}
        initialValues={{
          transactionSheetDateRange: { from: new Date(2026, 7, 5), to: new Date(2026, 7, 20) },
        }}
      />
    )

    act(() => ref.current?.clearForm())

    await waitFor(() => expect(ref.current?.getValues().transactionSheetDateRange).toBeNull())
  })
})
