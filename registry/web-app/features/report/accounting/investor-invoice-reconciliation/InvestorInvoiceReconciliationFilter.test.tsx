import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'

// Shared spies/captures — hoisted so vi.mock factories can reference them.
const h = vi.hoisted(() => ({
  useProjectMock: vi.fn(),
  useDealSelectMock: vi.fn(),
  selectProps: [] as Array<Record<string, any>>,
  dateRangePickerProps: [] as Array<Record<string, any>>,
}))

// DateRangePicker is imported directly (not through the `@/components/ui` barrel that
// `Select` goes through below), so it needs its own stub — capture props per field so the
// test can fire `onChange` for one range without touching the other.
vi.mock('@/components/ui/date-range-picker/DateRangePicker', () => ({
  default: (props: Record<string, any>) => {
    h.dateRangePickerProps.push(props)
    return null
  },
}))

vi.mock('@/services/realestate-service', () => ({
  useProject: h.useProjectMock,
}))

vi.mock('@/hooks/useDealSelect', () => ({
  useDealSelect: (opts: { projectId?: number } = {}) => {
    h.useDealSelectMock(opts)
    return { loadDealOptions: vi.fn(), loadInitialDealOptions: vi.fn() }
  },
}))

vi.mock('@/hooks/useInvestorSelect', () => ({
  useInvestorSelect: () => ({
    loadInvestorOptions: vi.fn(),
    loadInitialInvestorOptions: vi.fn(),
  }),
}))

vi.mock('@/hooks/useProjectSelect', () => ({
  useProjectSelect: () => ({
    loadProjectOptions: vi.fn(),
    loadInitialProjectOptions: vi.fn(),
  }),
}))

// Lightweight Select stub that records the props each field receives.
//
// Spread the real barrel first: `@/components/ui` is a shared index and this filter pulls
// in other components through it (DateRangePicker → Button). Returning only `Select` makes
// every one of those a missing export, which throws during render and takes the whole tree
// down — stub only what the test actually observes.
vi.mock('@/components/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui')>()
  const { forwardRef } = await import('react')
  return {
    ...actual,
    Select: forwardRef((props: Record<string, any>, _ref) => {
      h.selectProps.push(props)
      return null
    }),
  }
})

// Imported after mocks are registered.
import InvestorInvoiceReconciliationFilter, {
  type InvestorInvoiceReconciliationFilterRef,
} from './InvestorInvoiceReconciliationFilter'

beforeEach(() => {
  h.useProjectMock.mockReset()
  h.useDealSelectMock.mockReset()
  h.selectProps.length = 0
  h.dateRangePickerProps.length = 0
})

function investorFieldProps() {
  return h.selectProps.find((p) => p.label === 'Chủ đầu tư')
}

/** Latest render of the `DateRangePicker` bound to `label`. */
function dateRangeFieldProps(label: string) {
  const matches = h.dateRangePickerProps.filter((p) => p.label === label)
  return matches[matches.length - 1]
}

describe('InvestorInvoiceReconciliationFilter — liên động dự án', () => {
  it('Bug2: danh sách căn (deal) được lọc theo dự án đã chọn', () => {
    h.useProjectMock.mockReturnValue({ data: { investor: { id: 55, name: 'CĐT X' } } })

    const ref = createRef<InvestorInvoiceReconciliationFilterRef>()
    render(<InvestorInvoiceReconciliationFilter ref={ref} initialValues={{ project: '313' }} />)

    expect(h.useDealSelectMock).toHaveBeenCalledWith({ projectId: 313 })
  })

  it('Bug1: auto-fill CĐT theo investor của dự án và khoá ô CĐT', async () => {
    h.useProjectMock.mockReturnValue({ data: { investor: { id: 55, name: 'CĐT X' } } })

    const ref = createRef<InvestorInvoiceReconciliationFilterRef>()
    render(<InvestorInvoiceReconciliationFilter ref={ref} initialValues={{ project: '313' }} />)

    await waitFor(() => expect(ref.current?.getValues().investor).toBe('55'))
    expect(investorFieldProps()?.disabled).toBe(true)
  })

  it('Không chọn dự án: deal loader không giới hạn project, CĐT không auto-fill và không bị khoá', async () => {
    h.useProjectMock.mockReturnValue({ data: undefined })

    const ref = createRef<InvestorInvoiceReconciliationFilterRef>()
    render(<InvestorInvoiceReconciliationFilter ref={ref} initialValues={{}} />)

    expect(h.useDealSelectMock).toHaveBeenCalledWith({ projectId: undefined })
    await waitFor(() => expect(investorFieldProps()?.disabled).toBe(false))
    expect(ref.current?.getValues().investor ?? '').toBe('')
  })
})

describe('InvestorInvoiceReconciliationFilter — Ngày làm phiếu TTGD (độc lập với Ngày ký HĐ cọc)', () => {
  beforeEach(() => h.useProjectMock.mockReturnValue({ data: undefined }))

  it('hydrates the transaction-sheet date range independently from the contract sign-date range', () => {
    const ref = createRef<InvestorInvoiceReconciliationFilterRef>()
    render(
      <InvestorInvoiceReconciliationFilter
        ref={ref}
        initialValues={{
          contract_date_from: '2026-07-01',
          contract_date_to: '2026-07-31',
          transaction_sheet_date_from: '2026-08-01',
          transaction_sheet_date_to: '2026-08-15',
        }}
      />
    )

    expect(ref.current?.getValues()).toMatchObject({
      contract_date_from: '2026-07-01',
      contract_date_to: '2026-07-31',
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
    expect(dateRangeFieldProps('Ngày làm phiếu TTGD').value).toEqual({
      from: new Date(2026, 7, 1),
      to: new Date(2026, 7, 15),
    })
    // The contract sign-date range must be unaffected by the new field being present too.
    expect(dateRangeFieldProps('Ngày ký HĐ cọc').value).toEqual({
      from: new Date(2026, 6, 1),
      to: new Date(2026, 6, 31),
    })
  })

  it('writes both ends of the transaction-sheet date range from a single picker change', () => {
    const ref = createRef<InvestorInvoiceReconciliationFilterRef>()
    render(<InvestorInvoiceReconciliationFilter ref={ref} initialValues={{}} />)

    act(() => {
      dateRangeFieldProps('Ngày làm phiếu TTGD').onChange({
        from: new Date(2026, 7, 1),
        to: new Date(2026, 7, 15),
      })
    })

    expect(ref.current?.getValues()).toMatchObject({
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
  })

  it('keeps the contract sign-date range and the transaction-sheet date range independent when both are set', () => {
    const ref = createRef<InvestorInvoiceReconciliationFilterRef>()
    render(<InvestorInvoiceReconciliationFilter ref={ref} initialValues={{}} />)

    act(() => {
      dateRangeFieldProps('Ngày ký HĐ cọc').onChange({
        from: new Date(2026, 6, 1),
        to: new Date(2026, 6, 31),
      })
      dateRangeFieldProps('Ngày làm phiếu TTGD').onChange({
        from: new Date(2026, 7, 1),
        to: new Date(2026, 7, 15),
      })
    })

    expect(ref.current?.getValues()).toMatchObject({
      contract_date_from: '2026-07-01',
      contract_date_to: '2026-07-31',
      transaction_sheet_date_from: '2026-08-01',
      transaction_sheet_date_to: '2026-08-15',
    })
  })

  it('"Xoá bộ lọc" xoá luôn ngày TTGD, không chỉ ngày ký HĐ cọc', async () => {
    const ref = createRef<InvestorInvoiceReconciliationFilterRef>()
    render(
      <InvestorInvoiceReconciliationFilter
        ref={ref}
        initialValues={{
          contract_date_from: '2026-07-01',
          transaction_sheet_date_from: '2026-08-01',
        }}
      />
    )

    act(() => ref.current?.clearForm())

    await waitFor(() =>
      expect(ref.current?.getValues()).toMatchObject({
        contract_date_from: '',
        contract_date_to: '',
        transaction_sheet_date_from: '',
        transaction_sheet_date_to: '',
      })
    )
  })
})

describe('InvestorInvoiceReconciliationFilter — ô "Chỉ hiện dòng còn lại > 0" (CR 86eyhhgdv)', () => {
  const CHECKBOX_LABEL = 'Chỉ hiện dòng còn lại > 0'

  beforeEach(() => h.useProjectMock.mockReturnValue({ data: undefined }))

  it('mặc định KHÔNG tick — bật sẵn sẽ giấu luôn dòng âm (căn xuất hoá đơn vượt)', () => {
    const ref = createRef<InvestorInvoiceReconciliationFilterRef>()
    render(<InvestorInvoiceReconciliationFilter ref={ref} initialValues={{}} />)

    expect(screen.getByRole('checkbox', { name: CHECKBOX_LABEL })).toHaveAttribute(
      'aria-checked',
      'false'
    )
    expect(ref.current?.getValues().has_remaining ?? false).toBe(false)
  })

  it('seed lại trạng thái đang bật từ URL khi mở dialog', () => {
    const ref = createRef<InvestorInvoiceReconciliationFilterRef>()
    render(
      <InvestorInvoiceReconciliationFilter ref={ref} initialValues={{ has_remaining: true }} />
    )

    expect(screen.getByRole('checkbox', { name: CHECKBOX_LABEL })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(ref.current?.getValues().has_remaining).toBe(true)
  })

  it('tick vào ô thì getValues trả về true để trang ghi lên URL', async () => {
    const user = userEvent.setup()
    const ref = createRef<InvestorInvoiceReconciliationFilterRef>()
    render(<InvestorInvoiceReconciliationFilter ref={ref} initialValues={{}} />)

    await user.click(screen.getByRole('checkbox', { name: CHECKBOX_LABEL }))

    await waitFor(() => expect(ref.current?.getValues().has_remaining).toBe(true))
  })

  it('"Xoá bộ lọc" gỡ luôn ô này, không để sót lại trạng thái đang bật', async () => {
    const ref = createRef<InvestorInvoiceReconciliationFilterRef>()
    render(
      <InvestorInvoiceReconciliationFilter ref={ref} initialValues={{ has_remaining: true }} />
    )

    // `clearForm` gọi `form.reset` → state update ngoài vòng render; không bọc `act` thì
    // React cảnh báo và assert bên dưới có thể đọc phải giá trị trước khi re-render xong.
    act(() => ref.current?.clearForm())

    await waitFor(() => expect(ref.current?.getValues().has_remaining).toBe(false))
    expect(screen.getByRole('checkbox', { name: CHECKBOX_LABEL })).toHaveAttribute(
      'aria-checked',
      'false'
    )
  })

  it('bỏ tick được cả khi caller không truyền has_remaining lúc mount', async () => {
    // `has_remaining` là optional trong props, nên `defaultValues` có thể vào RHF là `undefined`.
    // Radix coi `checked={undefined}` là UNCONTROLLED và từ đó tự giữ state riêng — `reset()`
    // của RHF không gỡ được tick nữa, "Xoá bộ lọc" im lặng không ăn.
    const user = userEvent.setup()
    const ref = createRef<InvestorInvoiceReconciliationFilterRef>()
    render(<InvestorInvoiceReconciliationFilter ref={ref} initialValues={{}} />)

    await user.click(screen.getByRole('checkbox', { name: CHECKBOX_LABEL }))
    await waitFor(() => expect(ref.current?.getValues().has_remaining).toBe(true))

    act(() => ref.current?.clearForm())

    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: CHECKBOX_LABEL })).toHaveAttribute(
        'aria-checked',
        'false'
      )
    )
    expect(ref.current?.getValues().has_remaining).toBe(false)
  })
})
