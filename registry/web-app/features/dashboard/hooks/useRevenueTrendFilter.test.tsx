import { useEffect, useState, forwardRef, useImperativeHandle, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { RevenueTrendFilterFormValues } from '@/features/dashboard/components/sales/RevenueTrendFilterForm.tsx'
import { DashboardPerformanceGroup as TimeGroup } from '@/constants/api-schema-aliases'

/** Giá trị mà form "trả về" khi hook bấm Áp dụng — test đặt trước mỗi lần chạy. */
let formValues: RevenueTrendFilterFormValues

vi.mock('@/features/dashboard/components/sales/RevenueTrendFilterForm.tsx', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/dashboard/components/sales/RevenueTrendFilterForm.tsx')
  >('@/features/dashboard/components/sales/RevenueTrendFilterForm.tsx')

  // Chỉ thay phần UI: hook chỉ giao tiếp với form qua `getValues()`/`clearForm()`, nên giữ
  // nguyên phần logic thật (giá trị mặc định) để test không xanh giả khi ai đó đổi nó.
  const StubForm = forwardRef((_props, ref) => {
    useImperativeHandle(ref, () => ({
      clearForm: () => {},
      getValues: () => formValues,
    }))
    return null
  })
  StubForm.displayName = 'StubRevenueTrendFilterForm'

  return { ...actual, default: StubForm }
})

type DialogArgs = { content: ReactNode; footer: ReactNode }
const dialogListeners: ((args: DialogArgs) => void)[] = []

vi.mock('@/hooks/useDialog.ts', () => ({
  useDialog: () => ({
    displayFormContent: (args: DialogArgs) => dialogListeners.forEach((l) => l(args)),
    displayClose: vi.fn(),
  }),
}))

// Imported after the mocks above are registered.
import { useRevenueTrendFilter } from './useRevenueTrendFilter'

function Harness() {
  const [dialog, setDialog] = useState<DialogArgs | null>(null)
  useEffect(() => {
    dialogListeners.push(setDialog)
    return () => {
      dialogListeners.length = 0
    }
  }, [])

  const { openFilterModal, apiParams, subTitle, filterCount } = useRevenueTrendFilter()

  return (
    <>
      <button type="button" onClick={openFilterModal}>
        Mở bộ lọc
      </button>
      <span data-testid="params">{JSON.stringify(apiParams)}</span>
      <span data-testid="subtitle">{subTitle}</span>
      <span data-testid="count">{filterCount}</span>
      {dialog?.content}
      {dialog?.footer}
    </>
  )
}

const openDialog = async () => {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Mở bộ lọc' }))
  return user
}

const applyFilter = async () => {
  const user = await openDialog()
  await user.click(screen.getByRole('button', { name: 'Áp dụng' }))
}

const clearFilter = async () => {
  const user = await openDialog()
  await user.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }))
}

const params = () => JSON.parse(screen.getByTestId('params').textContent || '{}')

const AUGUST = { from: new Date(2026, 7, 1), to: new Date(2026, 7, 31) }
const JULY = { from: new Date(2026, 6, 1), to: new Date(2026, 6, 31) }

const base: RevenueTrendFilterFormValues = {
  dateRange: null,
  transactionSheetDateRange: null,
  timeGroup: TimeGroup.month,
}

beforeEach(() => {
  dialogListeners.length = 0
  formValues = { ...base }
})

describe('useRevenueTrendFilter — hai căn cứ ngày độc lập', () => {
  it('chưa lọc gì thì chỉ gửi `group`, badge sạch', () => {
    render(<Harness />)

    // `group` là tham số BẮT BUỘC của endpoint nên luôn có mặt, nhưng nó không thu hẹp dữ
    // liệu ⇒ badge vẫn phải là 0. Đếm nó vào thì badge không bao giờ về 0 và hết ý nghĩa.
    expect(params()).toEqual({ group: 'month' })
    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('chưa chọn ngày thì KHÔNG gửi tham số TTGD — giữ nguyên hành vi cũ', () => {
    render(<Harness />)

    expect(params()).not.toHaveProperty('transaction_sheet_date_from')
    expect(params()).not.toHaveProperty('transaction_sheet_date_to')
  })

  it('chọn khoảng ngày làm phiếu TTGD thì gửi đúng cặp tham số của nó', async () => {
    formValues = { ...base, transactionSheetDateRange: AUGUST }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-31',
    })
  })

  it('ô ngày cọc vẫn gửi from/to như cũ, không bị ô TTGD lấn sang', async () => {
    formValues = { ...base, dateRange: JULY }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({ from: '2026-07-01', to: '2026-07-31' })
    expect(params()).not.toHaveProperty('transaction_sheet_date_from')
  })

  it('hai ô dùng đồng thời được — cộng thêm (AND), không ô nào ghi đè ô nào', async () => {
    formValues = { ...base, dateRange: JULY, transactionSheetDateRange: AUGUST }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({
      from: '2026-07-01',
      to: '2026-07-31',
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-31',
    })
    expect(screen.getByTestId('count').textContent).toBe('2')
  })

  it('xoá khoảng TTGD thì bỏ HẲN tham số, không gửi chuỗi rỗng', async () => {
    formValues = { ...base, transactionSheetDateRange: AUGUST }
    render(<Harness />)
    await applyFilter()
    expect(params()).toHaveProperty('transaction_sheet_date_from')

    formValues = { ...base, transactionSheetDateRange: null }
    await applyFilter()

    expect(params()).not.toHaveProperty('transaction_sheet_date_from')
    expect(params()).not.toHaveProperty('transaction_sheet_date_to')
  })

  it('đổi cách nhóm thì gửi `group` mới nhưng KHÔNG đếm vào badge', async () => {
    formValues = { ...base, timeGroup: TimeGroup.week }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({ group: 'week' })
    expect(screen.getByTestId('count').textContent).toBe('0')
  })

  it('"Xoá bộ lọc" đưa cách nhóm về THÁNG chứ không bỏ trống — endpoint bắt buộc có `group`', async () => {
    formValues = { ...base, timeGroup: TimeGroup.year, dateRange: JULY }
    render(<Harness />)
    await applyFilter()
    expect(params()).toMatchObject({ group: 'year', from: '2026-07-01' })

    await clearFilter()

    expect(params()).toEqual({ group: 'month' })
  })
})

describe('useRevenueTrendFilter — phụ đề thay cho ba ô đã rời khỏi thanh tiêu đề', () => {
  it('không lọc thì vẫn nói ra phạm vi, không để ngỏ mỗi "Theo tháng"', () => {
    render(<Harness />)

    expect(screen.getByTestId('subtitle').textContent).toBe('Tất cả thời gian · Theo tháng')
  })

  it('in khoảng ngày cọc và cách nhóm', async () => {
    formValues = { ...base, dateRange: JULY }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('subtitle').textContent).toBe(
      'Từ 01/07/2026 - 31/07/2026 · Theo tháng'
    )
  })

  it('gọi TÊN căn cứ ngày TTGD, không in trần một khoảng ngày thứ hai', async () => {
    // Hai khoảng ngày cạnh nhau mà không có tên thì phụ đề không nói được cái nào theo ngày
    // cọc, cái nào theo ngày làm phiếu — đúng phản hồi người dùng 2026-08-26.
    formValues = { ...base, dateRange: JULY, transactionSheetDateRange: AUGUST }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('subtitle').textContent).toBe(
      'Từ 01/07/2026 - 31/07/2026 · Ngày làm phiếu TTGD Từ 01/08/2026 - 31/08/2026 · Theo tháng'
    )
  })
})
