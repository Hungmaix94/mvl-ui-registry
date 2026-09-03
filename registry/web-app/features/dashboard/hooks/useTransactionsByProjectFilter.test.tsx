import { useEffect, useState, forwardRef, useImperativeHandle, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TransactionsByProjectFilterFormValues } from '@/features/dashboard/components/sales/TransactionsByProjectFilterForm.tsx'

/** Giá trị mà form "trả về" khi hook bấm Áp dụng — test đặt trước mỗi lần chạy. */
let formValues: TransactionsByProjectFilterFormValues

vi.mock('@/features/dashboard/components/sales/TransactionsByProjectFilterForm.tsx', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/dashboard/components/sales/TransactionsByProjectFilterForm.tsx')
  >('@/features/dashboard/components/sales/TransactionsByProjectFilterForm.tsx')

  // Chỉ thay phần UI: hook chỉ giao tiếp với form qua `getValues()`/`clearForm()`, nên giữ
  // nguyên phần logic thật (giá trị mặc định) để test không xanh giả khi ai đó đổi nó.
  const StubForm = forwardRef((_props, ref) => {
    useImperativeHandle(ref, () => ({
      clearForm: () => {},
      getValues: () => formValues,
    }))
    return null
  })
  StubForm.displayName = 'StubTransactionsByProjectFilterForm'

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
import { useTransactionsByProjectFilter } from './useTransactionsByProjectFilter'

function Harness() {
  const [dialog, setDialog] = useState<DialogArgs | null>(null)
  useEffect(() => {
    dialogListeners.push(setDialog)
    return () => {
      dialogListeners.length = 0
    }
  }, [])

  const { openFilterModal, apiParams, subTitle, filterCount } = useTransactionsByProjectFilter()

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

const applyFilter = async () => {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Mở bộ lọc' }))
  await user.click(screen.getByRole('button', { name: 'Áp dụng' }))
}

const params = () => JSON.parse(screen.getByTestId('params').textContent || '{}')

describe('useTransactionsByProjectFilter — lọc nhiều dự án', () => {
  beforeEach(() => {
    dialogListeners.length = 0
    formValues = { projects: [], projectNames: [], dateRange: null }
  })

  it('chưa lọc thì không gửi tham số nào và badge sạch', () => {
    render(<Harness />)

    expect(params()).toEqual({})
    expect(screen.getByTestId('count').textContent).toBe('0')
    expect(screen.getByTestId('subtitle').textContent).toBe('Tất cả dự án')
  })

  it('chọn một dự án thì gửi `project__in` một phần tử, KHÔNG lọc ở client', async () => {
    formValues = { projects: [7], projectNames: ['Dự án A'], dateRange: null }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({ project__in: [7] })
  })

  it('chọn NHIỀU dự án thì gửi đủ id lên API — không được rơi mất id nào', async () => {
    // BE nhận `project__in` từ PR #3365. Gửi đại một id trong hai là im lặng vẽ thiếu hẳn
    // một dự án, mà biểu đồ vẫn nhìn như đầy đủ.
    formValues = { projects: [7, 9], projectNames: ['Dự án A', 'Dự án B'], dateRange: null }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({ project__in: [7, 9] })
  })

  it('KHÔNG gửi `project` một id nữa — hai tham số cùng nghĩa dễ trôi khỏi nhau', async () => {
    formValues = { projects: [7], projectNames: ['Dự án A'], dateRange: null }
    render(<Harness />)

    await applyFilter()

    expect(params()).not.toHaveProperty('project')
  })

  it('phụ đề liệt kê tên khi ít dự án', async () => {
    formValues = { projects: [7, 9], projectNames: ['Dự án A', 'Dự án B'], dateRange: null }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('subtitle').textContent).toBe('Dự án A, Dự án B')
  })

  it('phụ đề đếm số khi nhiều dự án — liệt kê hết thì dài hơn cả tiêu đề', async () => {
    formValues = {
      projects: [1, 2, 3, 4],
      projectNames: ['A', 'B', 'C', 'D'],
      dateRange: null,
    }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('subtitle').textContent).toBe('4 dự án')
  })

  it('badge đếm 1 cho cả cụm dự án, không đếm theo từng dự án đã chọn', async () => {
    formValues = { projects: [1, 2, 3], projectNames: ['A', 'B', 'C'], dateRange: null }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('count').textContent).toBe('1')
  })

  it('khoảng thời gian đi vào from/to và cộng thêm 1 vào badge', async () => {
    formValues = {
      projects: [],
      projectNames: [],
      dateRange: { from: new Date(2026, 0, 1), to: new Date(2026, 11, 31) },
    }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({ from: '2026-01-01', to: '2026-12-31' })
    expect(screen.getByTestId('count').textContent).toBe('1')
  })

  it('"Xoá bộ lọc" đưa về tất cả dự án, không giữ lại id cũ', async () => {
    formValues = { projects: [7], projectNames: ['Dự án A'], dateRange: null }
    render(<Harness />)

    await applyFilter()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Mở bộ lọc' }))
    await user.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }))

    expect(params()).toEqual({})
    expect(screen.getByTestId('subtitle').textContent).toBe('Tất cả dự án')
  })
})

describe('useTransactionsByProjectFilter — lọc theo Ngày làm phiếu TTGD (độc lập với Khoảng thời gian)', () => {
  beforeEach(() => {
    dialogListeners.length = 0
    formValues = { projects: [], projectNames: [], dateRange: null }
  })

  it('gửi transaction_sheet_date_from/to đúng tên tham số lên API', async () => {
    formValues = {
      ...formValues,
      transactionSheetDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 15) },
    }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
  })

  // Regression: field mới không được đổi hành vi của "Khoảng thời gian" đã có sẵn khi không đụng tới nó.
  it('không đụng field mới thì khoảng thời gian vẫn gửi đúng như trước, không có tham số TTGD', async () => {
    formValues = {
      ...formValues,
      dateRange: { from: new Date(2026, 0, 1), to: new Date(2026, 11, 31) },
    }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({ from: '2026-01-01', to: '2026-12-31' })
    expect(params().transaction_sheet_date_from).toBeUndefined()
    expect(params().transaction_sheet_date_to).toBeUndefined()
  })

  it('điền cả hai khoảng ngày thì cả hai cặp tham số cùng có mặt (AND, không ghi đè nhau)', async () => {
    formValues = {
      ...formValues,
      dateRange: { from: new Date(2026, 0, 1), to: new Date(2026, 11, 31) },
      transactionSheetDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 15) },
    }
    render(<Harness />)

    await applyFilter()

    expect(params()).toMatchObject({
      from: '2026-01-01',
      to: '2026-12-31',
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
  })

  it('badge đếm ngày TTGD riêng, độc lập với khoảng thời gian', async () => {
    formValues = {
      ...formValues,
      dateRange: { from: new Date(2026, 0, 1), to: new Date(2026, 11, 31) },
      transactionSheetDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 15) },
    }
    render(<Harness />)

    await applyFilter()

    expect(screen.getByTestId('count').textContent).toBe('2')
  })

  it('"Xoá bộ lọc" xoá luôn ngày TTGD', async () => {
    formValues = {
      ...formValues,
      transactionSheetDateRange: { from: new Date(2026, 7, 1), to: new Date(2026, 7, 15) },
    }
    render(<Harness />)
    await applyFilter()
    expect(params().transaction_sheet_date_from).toBe('2026-08-01')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Mở bộ lọc' }))
    await user.click(screen.getByRole('button', { name: 'Xoá bộ lọc' }))

    expect(params()).toEqual({})
  })
})
