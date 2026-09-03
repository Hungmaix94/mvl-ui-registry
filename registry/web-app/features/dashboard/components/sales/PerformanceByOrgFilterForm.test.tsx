import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/** Quyền mà `ability.can` sẽ trả về trong từng test. */
let grantedActions: string[] = []

vi.mock('@/lib/ability', () => ({
  useAbility: () => ({ can: (action: string) => grantedActions.includes(action) }),
}))

/** Ghi lại mọi lần `useAdminDashboardRevenueTrend` được gọi, kèm options. */
const trendCalls: { params: unknown; options?: { enabled?: boolean } }[] = []
let trendPoints: { label: string }[] = []

vi.mock('@/features/sales/admin-dashboard/services/admin-dashboard-service', () => ({
  useAdminDashboardRevenueTrend: (params: unknown, options?: { enabled?: boolean }) => {
    trendCalls.push({ params, options })
    // Mô phỏng đúng hành vi của `useApiQuery`: query bị tắt thì KHÔNG có data, và cũng
    // không có lỗi nào nổi lên — đó chính là kiểu hỏng im lặng mà bài test này canh.
    return { data: options?.enabled === false ? undefined : { points: trendPoints } }
  },
}))

const BRANCH_ITEMS = [
  { value: '7', label: 'CN Hà Nội' },
  { value: '9', label: 'CN Hải Phòng' },
]
const BLOCK_ITEMS = [
  { value: '3', label: 'Khối Kinh doanh' },
  { value: '4', label: 'Khối Hỗ trợ' },
]

const pickInitial = (items: { value: string; label: string }[]) => (values: (string | number)[]) =>
  Promise.resolve(items.filter((item) => values.map(String).includes(item.value)))

vi.mock('@/hooks/useBranchSelect.ts', () => ({
  useBranchSelect: () => ({
    loadBranchOptions: () =>
      Promise.resolve({ items: BRANCH_ITEMS, hasNextPage: false, nextPage: null }),
    loadInitialBranchOptions: pickInitial(BRANCH_ITEMS),
  }),
}))

/** Mọi lần `useBlockSelect` được gọi, kèm options — để soi luật nối tầng chi nhánh → khối. */
const blockSelectCalls: { additionalParams?: (() => unknown) | unknown }[] = []

vi.mock('@/hooks/useBlockSelect.ts', () => ({
  useBlockSelect: (options: { additionalParams?: () => unknown } = {}) => {
    blockSelectCalls.push(options)
    return {
      loadBlockOptions: () =>
        Promise.resolve({ items: BLOCK_ITEMS, hasNextPage: false, nextPage: null }),
      loadInitialBlockOptions: pickInitial(BLOCK_ITEMS),
    }
  },
}))

// Imported after the mocks above are registered.
import PerformanceByOrgFilterForm, {
  type PerformanceByOrgFilterFormRef,
} from './PerformanceByOrgFilterForm'
import { SALES_ADMIN_DASHBOARD_ACTIONS } from './sales-admin-dashboard-constants'

/** Dựng form và trả về ref — KHÔNG phải render result, nên không đặt tên `render*`. */
const mountForm = (initialValues?: Record<string, unknown>) => {
  const ref = createRef<PerformanceByOrgFilterFormRef>()
  render(<PerformanceByOrgFilterForm ref={ref} initialValues={initialValues} />)
  return ref
}

describe('PerformanceByOrgFilterForm — danh sách kỳ và quyền', () => {
  beforeEach(() => {
    trendCalls.length = 0
    trendPoints = [{ label: '2026-07' }, { label: '2026-08' }]
    grantedActions = [
      SALES_ADMIN_DASHBOARD_ACTIONS.PERFORMANCE,
      SALES_ADMIN_DASHBOARD_ACTIONS.REVENUE_TREND,
    ]
  })

  it('có quyền revenue_trend thì mới gọi endpoint lấy danh sách kỳ', () => {
    mountForm()

    expect(trendCalls.at(-1)?.options).toMatchObject({ enabled: true })
  })

  it('KHÔNG có quyền revenue_trend thì query bị tắt, không bắn 403', () => {
    grantedActions = [SALES_ADMIN_DASHBOARD_ACTIONS.PERFORMANCE]

    mountForm()

    expect(trendCalls.at(-1)?.options).toMatchObject({ enabled: false })
  })

  it('không có quyền thì kỳ đang chọn được dọn về "tất cả kỳ", không kẹt ở kỳ cũ', async () => {
    grantedActions = [SALES_ADMIN_DASHBOARD_ACTIONS.PERFORMANCE]

    const ref = mountForm({ period: '2026-08' })

    await waitFor(() => expect(ref.current?.getValues().period).toBe(''))
  })

  it('không có quyền thì nói đúng nguyên nhân, không đổ cho khoảng thời gian', async () => {
    grantedActions = [SALES_ADMIN_DASHBOARD_ACTIONS.PERFORMANCE]

    mountForm()

    expect(await screen.findByText('Không có quyền xem danh sách kỳ')).toBeInTheDocument()
    expect(screen.queryByText('Không có kỳ nào trong khoảng đã chọn')).not.toBeInTheDocument()
  })

  it('có quyền nhưng khoảng ngày không chứa kỳ nào thì mới nói "không có kỳ nào"', async () => {
    trendPoints = []

    mountForm()

    expect(await screen.findByText('Không có kỳ nào trong khoảng đã chọn')).toBeInTheDocument()
  })

  it('kỳ đang chọn không còn trong danh sách thì rơi về kỳ hiện tại của cách nhóm', async () => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    trendPoints = [{ label: '2025-01' }, { label: currentMonth }]

    const ref = mountForm({ period: '1999-01' })

    await waitFor(() => expect(ref.current?.getValues().period).toBe(currentMonth))
  })

  it('kỳ hiện tại cũng không có trong danh sách thì mới về "tất cả kỳ"', async () => {
    trendPoints = [{ label: '2025-01' }, { label: '2025-02' }]

    const ref = mountForm({ period: '1999-01' })

    await waitFor(() => expect(ref.current?.getValues().period).toBe(''))
  })
})

describe('PerformanceByOrgFilterForm — lọc chi nhánh và khối', () => {
  beforeEach(() => {
    blockSelectCalls.length = 0
    trendCalls.length = 0
    trendPoints = [{ label: '2026-07' }, { label: '2026-08' }]
    grantedActions = [
      SALES_ADMIN_DASHBOARD_ACTIONS.PERFORMANCE,
      SALES_ADMIN_DASHBOARD_ACTIONS.REVENUE_TREND,
    ]
  })

  /** Options mới nhất mà `useBlockSelect` nhận được, đã giải ra thành object tham số thật. */
  const resolvedBlockParams = () => {
    const additional = blockSelectCalls.at(-1)?.additionalParams
    return typeof additional === 'function' ? additional() : additional
  }

  it('chọn ĐÚNG 1 chi nhánh thì danh sách khối thu hẹp theo chi nhánh đó', () => {
    mountForm({ branches: [7] })

    expect(resolvedBlockParams()).toEqual({ branch: 7 })
  })

  // `/api/hrm/blocks/dropdown/` chỉ có `branch` số ít. Gửi liều id đầu tiên khi đang chọn
  // nhiều chi nhánh là giấu mất khối của các chi nhánh còn lại — người dùng tìm không ra
  // khối mình biết chắc là có, và không có gì nói vì sao.
  it('chọn từ 2 chi nhánh trở lên thì liệt kê hết khối, KHÔNG lấy liều chi nhánh đầu', () => {
    mountForm({ branches: [7, 9] })

    expect(resolvedBlockParams()).toEqual({})
  })

  it('chưa chọn chi nhánh nào thì cũng liệt kê hết khối', () => {
    mountForm()

    expect(resolvedBlockParams()).toEqual({})
  })

  /**
   * Radix khoá `pointer-events` trên lớp popover khi mở, jsdom không gỡ lại — hạn chế của môi
   * trường test, không phải thứ người dùng thật gặp. Tên option cũng hiện lại ở chip trên
   * trigger, nên lấy phần tử CUỐI: option trong danh sách nằm sau chip trong cây DOM.
   */
  const openAndPick = async (fieldLabel: RegExp, optionText: string) => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    await user.click(screen.getByRole('combobox', { name: fieldLabel }))
    const matches = await screen.findAllByText(optionText)
    await user.click(matches[matches.length - 1])
  }

  it('đổi chi nhánh thì xoá khối đang chọn — BE giao hai bộ lọc, để lại là biểu đồ rỗng', async () => {
    const ref = mountForm({ branches: [7], blocks: [3], blockNames: ['Khối Kinh doanh'] })
    await waitFor(() => expect(ref.current?.getValues().blocks).toEqual([3]))

    await openAndPick(/Chi nhánh/, 'CN Hải Phòng')

    await waitFor(() => expect(ref.current?.getValues().blocks).toEqual([]))
    expect(ref.current?.getValues().blockNames).toEqual([])
  })

  it('nhớ tên theo id: bỏ chọn một chi nhánh không làm mất tên của những cái còn lại', async () => {
    const ref = mountForm({ branches: [7, 9], branchNames: ['CN Hà Nội', 'CN Hải Phòng'] })

    await openAndPick(/Chi nhánh/, 'CN Hà Nội')

    await waitFor(() => expect(ref.current?.getValues().branches).toEqual([9]))
    expect(ref.current?.getValues().branchNames).toEqual(['CN Hải Phòng'])
  })
})

describe('PerformanceByOrgFilterForm — nhãn ô ngày nói ra căn cứ tính', () => {
  beforeEach(() => {
    trendCalls.length = 0
    trendPoints = [{ label: '2026-08' }]
    grantedActions = [
      SALES_ADMIN_DASHBOARD_ACTIONS.PERFORMANCE,
      SALES_ADMIN_DASHBOARD_ACTIONS.REVENUE_TREND,
    ]
  })

  // Phản hồi người dùng 2026-08-26: dialog có HAI ô khoảng ngày, ô TTGD thì rõ, ô còn lại
  // tên là "Khoảng thời gian" — đọc xong vẫn không biết nó lọc theo ngày nào.
  it('ô ngày cọc nêu rõ căn cứ, không còn tên chung chung "Khoảng thời gian"', () => {
    mountForm()

    expect(screen.getByText('Thời gian (tính theo ngày cọc)')).toBeTruthy()
    expect(screen.queryByText('Khoảng thời gian')).toBeNull()
  })

  it('vẫn giữ nguyên ô ngày làm phiếu TTGD bên cạnh', () => {
    mountForm()

    expect(screen.getByText('Ngày làm phiếu TTGD')).toBeTruthy()
  })
})
