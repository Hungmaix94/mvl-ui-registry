import { createRef } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  fields: [] as Array<{ name: string; fieldProps: Record<string, any> }>,
}))

// FormController owns the RHF <-> field plumbing; stub it so the test can fire `onChange`
// directly and assert what lands in form state. `name` is captured too — the form now has
// more than one field, so "the last one rendered" is no longer a safe way to address them.
vi.mock('@/components/ui/form/FormController', () => ({
  default: (props: Record<string, any>) => {
    h.fields.push({ name: props.name, fieldProps: props.fieldProps })
    return null
  },
}))

// Deal-status labels come from the backend app-constants (module `sales`). Same shape as
// the real hook: keysMapOptions.get(key) -> Array<{value,label}>.
vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({
    keysMap: new Map(),
    constants: {},
    keysMapOptions: new Map([
      [
        'DealStatus',
        [
          { value: 'active', label: 'Đang hoạt động' },
          { value: 'completed', label: 'Đã hoàn thành' },
          { value: 'abandoned', label: 'Đã bỏ' },
          { value: 'refunded', label: 'Đã hoàn tiền' },
          { value: 'cancelled', label: 'Đã hủy' },
          { value: 'cancelled_settled', label: 'Đã huỷ & tất toán' },
        ],
      ],
    ]),
  }),
}))

import SalesOverviewFilterForm, { type SalesOverviewFilterFormRef } from './SalesOverviewFilterForm'

/** Latest render of the field bound to `name`. */
const field = (name: string) => {
  const matches = h.fields.filter((f) => f.name === name)
  return matches[matches.length - 1].fieldProps
}

const EMPTY = { dateFrom: undefined, dateTo: undefined, dealStatus: [] }

beforeEach(() => {
  h.fields.length = 0
})

describe('SalesOverviewFilterForm', () => {
  it('hydrates the range from initialValues and labels it by the calculation basis', () => {
    const ref = createRef<SalesOverviewFilterFormRef>()
    render(
      <SalesOverviewFilterForm
        ref={ref}
        initialValues={{ dateFrom: new Date(2026, 6, 1), dateTo: new Date(2026, 6, 31) }}
      />
    )

    expect(ref.current?.getValues()).toEqual({
      dateFrom: new Date(2026, 6, 1),
      dateTo: new Date(2026, 6, 31),
      dealStatus: [],
    })
    // The report filters deals by "Ngày cọc" — the label has to say so, the field alone is
    // ambiguous against the other date columns on the screen.
    expect(field('dateFrom').label).toBe('Thời gian (tính theo ngày cọc)')
    expect(field('dateFrom').value).toEqual({
      from: new Date(2026, 6, 1),
      to: new Date(2026, 6, 31),
    })
  })

  it('writes both ends of the range from a single picker change', () => {
    const ref = createRef<SalesOverviewFilterFormRef>()
    render(<SalesOverviewFilterForm ref={ref} />)

    act(() => {
      field('dateFrom').onChange({ from: new Date(2026, 0, 1), to: new Date(2026, 0, 31) })
    })

    expect(ref.current?.getValues()).toEqual({
      dateFrom: new Date(2026, 0, 1),
      dateTo: new Date(2026, 0, 31),
      dealStatus: [],
    })
  })

  it('drops both ends when the picker is cleared', () => {
    const ref = createRef<SalesOverviewFilterFormRef>()
    render(<SalesOverviewFilterForm ref={ref} initialValues={{ dateFrom: new Date(2026, 6, 1) }} />)

    act(() => {
      field('dateFrom').onChange(undefined)
    })

    expect(ref.current?.getValues()).toEqual(EMPTY)
  })

  it('hydrates the transaction-sheet date range independently from the deposit-date range', () => {
    const ref = createRef<SalesOverviewFilterFormRef>()
    render(
      <SalesOverviewFilterForm
        ref={ref}
        initialValues={{
          dateFrom: new Date(2026, 6, 1),
          dateTo: new Date(2026, 6, 31),
          transactionSheetDateFrom: new Date(2026, 7, 1),
          transactionSheetDateTo: new Date(2026, 7, 15),
        }}
      />
    )

    expect(ref.current?.getValues()).toEqual({
      dateFrom: new Date(2026, 6, 1),
      dateTo: new Date(2026, 6, 31),
      dealStatus: [],
      transactionSheetDateFrom: new Date(2026, 7, 1),
      transactionSheetDateTo: new Date(2026, 7, 15),
    })
    expect(field('transactionSheetDateFrom').label).toBe('Ngày làm phiếu TTGD')
    expect(field('transactionSheetDateFrom').value).toEqual({
      from: new Date(2026, 7, 1),
      to: new Date(2026, 7, 15),
    })
    // The deposit-date range must be unaffected by the new field being present too.
    expect(field('dateFrom').value).toEqual({
      from: new Date(2026, 6, 1),
      to: new Date(2026, 6, 31),
    })
  })

  it('writes both ends of the transaction-sheet date range from a single picker change', () => {
    const ref = createRef<SalesOverviewFilterFormRef>()
    render(<SalesOverviewFilterForm ref={ref} />)

    act(() => {
      field('transactionSheetDateFrom').onChange({
        from: new Date(2026, 0, 5),
        to: new Date(2026, 0, 20),
      })
    })

    expect(ref.current?.getValues()).toEqual({
      ...EMPTY,
      transactionSheetDateFrom: new Date(2026, 0, 5),
      transactionSheetDateTo: new Date(2026, 0, 20),
    })
  })

  it('keeps the deposit-date range and the transaction-sheet date range independent when both are set', () => {
    const ref = createRef<SalesOverviewFilterFormRef>()
    render(<SalesOverviewFilterForm ref={ref} />)

    act(() => {
      field('dateFrom').onChange({ from: new Date(2026, 0, 1), to: new Date(2026, 0, 31) })
      field('transactionSheetDateFrom').onChange({
        from: new Date(2026, 1, 1),
        to: new Date(2026, 1, 10),
      })
    })

    expect(ref.current?.getValues()).toEqual({
      dateFrom: new Date(2026, 0, 1),
      dateTo: new Date(2026, 0, 31),
      dealStatus: [],
      transactionSheetDateFrom: new Date(2026, 1, 1),
      transactionSheetDateTo: new Date(2026, 1, 10),
    })
  })

  it('drops both ends of the transaction-sheet range when its picker is cleared', () => {
    const ref = createRef<SalesOverviewFilterFormRef>()
    render(
      <SalesOverviewFilterForm
        ref={ref}
        initialValues={{ transactionSheetDateFrom: new Date(2026, 6, 1) }}
      />
    )

    act(() => {
      field('transactionSheetDateFrom').onChange(undefined)
    })

    expect(ref.current?.getValues()).toEqual(EMPTY)
  })

  it('empties the form on "Xoá bộ lọc"', () => {
    const ref = createRef<SalesOverviewFilterFormRef>()
    render(
      <SalesOverviewFilterForm
        ref={ref}
        initialValues={{
          dateFrom: new Date(2026, 6, 1),
          dateTo: new Date(2026, 6, 31),
          dealStatus: ['abandoned'],
          transactionSheetDateFrom: new Date(2026, 7, 1),
          transactionSheetDateTo: new Date(2026, 7, 15),
        }}
      />
    )

    act(() => ref.current?.clearForm())

    expect(ref.current?.getValues()).toEqual(EMPTY)
  })

  describe('deal-status checkboxes (CR STT36)', () => {
    it('renders one checkbox per backend deal status', () => {
      render(<SalesOverviewFilterForm ref={createRef()} />)

      expect(
        screen.getAllByRole('checkbox').map((c) => c.getAttribute('aria-label') ?? c.id)
      ).toHaveLength(6)
      for (const label of [
        'Đang hoạt động',
        'Đã hoàn thành',
        'Đã bỏ',
        'Đã hoàn tiền',
        'Đã hủy',
        'Đã huỷ & tất toán',
      ]) {
        expect(screen.getByRole('checkbox', { name: label })).toBeInTheDocument()
      }
    })

    it('names the field and states the default scope in plain words', () => {
      render(<SalesOverviewFilterForm ref={createRef()} />)

      // `Checkbox` renders no heading of its own, so the group must carry one — and an
      // empty selection is not "no units", it is the report's sold-only default. A reader
      // has to learn that from the dialog, not from the backend.
      expect(screen.getByText('Tình trạng căn')).toBeInTheDocument()
      expect(
        screen.getByText(/Không chọn ô nào = đang hoạt động \+ đã hoàn thành/)
      ).toBeInTheDocument()
    })

    it('starts with every box clear so the report keeps its own default scope', () => {
      const ref = createRef<SalesOverviewFilterFormRef>()
      render(<SalesOverviewFilterForm ref={ref} />)

      expect(ref.current?.getValues().dealStatus).toEqual([])
      for (const box of screen.getAllByRole('checkbox')) {
        expect(box).toHaveAttribute('aria-checked', 'false')
      }
    })

    it('hydrates the ticked boxes from initialValues', () => {
      const ref = createRef<SalesOverviewFilterFormRef>()
      render(
        <SalesOverviewFilterForm
          ref={ref}
          initialValues={{ dealStatus: ['abandoned', 'refunded'] }}
        />
      )

      expect(ref.current?.getValues().dealStatus).toEqual(['abandoned', 'refunded'])
      expect(screen.getByRole('checkbox', { name: 'Đã bỏ' })).toHaveAttribute(
        'aria-checked',
        'true'
      )
      expect(screen.getByRole('checkbox', { name: 'Đang hoạt động' })).toHaveAttribute(
        'aria-checked',
        'false'
      )
    })

    it('adds a status when its box is ticked', () => {
      const ref = createRef<SalesOverviewFilterFormRef>()
      render(<SalesOverviewFilterForm ref={ref} />)

      fireEvent.click(screen.getByRole('checkbox', { name: 'Đã bỏ' }))

      expect(ref.current?.getValues().dealStatus).toEqual(['abandoned'])
    })

    it('removes only that status when its box is unticked', () => {
      const ref = createRef<SalesOverviewFilterFormRef>()
      render(
        <SalesOverviewFilterForm
          ref={ref}
          initialValues={{ dealStatus: ['abandoned', 'refunded'] }}
        />
      )

      fireEvent.click(screen.getByRole('checkbox', { name: 'Đã bỏ' }))

      expect(ref.current?.getValues().dealStatus).toEqual(['refunded'])
    })

    it('accumulates several statuses', () => {
      const ref = createRef<SalesOverviewFilterFormRef>()
      render(<SalesOverviewFilterForm ref={ref} />)

      fireEvent.click(screen.getByRole('checkbox', { name: 'Đã bỏ' }))
      fireEvent.click(screen.getByRole('checkbox', { name: 'Đã hoàn tiền' }))

      expect(ref.current?.getValues().dealStatus).toEqual(['abandoned', 'refunded'])
    })

    it('clears every box on "Xoá bộ lọc"', () => {
      const ref = createRef<SalesOverviewFilterFormRef>()
      render(<SalesOverviewFilterForm ref={ref} initialValues={{ dealStatus: ['abandoned'] }} />)

      act(() => ref.current?.clearForm())

      expect(ref.current?.getValues().dealStatus).toEqual([])
      expect(screen.getByRole('checkbox', { name: 'Đã bỏ' })).toHaveAttribute(
        'aria-checked',
        'false'
      )
    })
  })
})
