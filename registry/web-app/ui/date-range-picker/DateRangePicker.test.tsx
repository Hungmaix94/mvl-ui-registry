import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DateRangePicker from './DateRangePicker'

/**
 * Wiring-only. The bound rule itself is covered cheaply in `date-range-bounds.test.ts`; what needs
 * a real mount is that both places consult it — the calendar matcher and Apply — because a user who
 * types a date never touches the greyed-out calendar day, and Apply is the gate that stops it.
 *
 * Drive the popover synchronously and never `await` mid-interaction: it is a Radix dismissable
 * layer, so yielding to the microtask queue between the opening click and Apply lets it close and
 * the Apply button vanishes. For the same reason there is no `fireEvent.blur` here — blur is not
 * a validation point (TextField does not forward the event) and firing it dismisses the popover.
 */

const MIN = new Date(2026, 4, 1) // 01/05/2026
const MAX = new Date(2026, 4, 31) // 31/05/2026

const openPicker = () => {
  fireEvent.click(screen.getByRole('combobox'))
  return screen.getAllByRole('textbox') as HTMLInputElement[]
}

const typeInto = (inputs: HTMLInputElement[], index: 0 | 1, value: string) => {
  fireEvent.change(inputs[index], { target: { value } })
}

const clickApply = () => fireEvent.click(screen.getByRole('button', { name: /áp dụng/i }))

describe('DateRangePicker bounds wiring', () => {
  it('commits a typed range that sits inside the bounds', () => {
    const handleChange = vi.fn()
    render(
      <DateRangePicker label="Ngày hóa đơn" minDate={MIN} maxDate={MAX} onChange={handleChange} />
    )
    const inputs = openPicker()

    typeInto(inputs, 0, '01/05/2026')
    typeInto(inputs, 1, '31/05/2026')
    clickApply()

    expect(handleChange).toHaveBeenCalledTimes(1)
    const range = handleChange.mock.calls[0][0]
    expect(range.from).toEqual(new Date(2026, 4, 1))
    expect(range.to).toEqual(new Date(2026, 4, 31))
  })

  it('blocks on Apply a typed out-of-bounds date that bypassed the greyed-out calendar', () => {
    const handleChange = vi.fn()
    render(
      <DateRangePicker label="Ngày hóa đơn" minDate={MIN} maxDate={MAX} onChange={handleChange} />
    )
    const inputs = openPicker()

    typeInto(inputs, 0, '30/04/2026')
    clickApply()

    expect(handleChange).not.toHaveBeenCalled()
    expect(screen.getByText('Ngày không được trước 01/05/2026')).toBeInTheDocument()
  })

  it('blocks on Apply a typed date past maxDate too', () => {
    const handleChange = vi.fn()
    render(
      <DateRangePicker label="Ngày hóa đơn" minDate={MIN} maxDate={MAX} onChange={handleChange} />
    )
    const inputs = openPicker()

    typeInto(inputs, 1, '01/06/2026')
    clickApply()

    expect(handleChange).not.toHaveBeenCalled()
    expect(screen.getByText('Ngày không được sau 31/05/2026')).toBeInTheDocument()
  })

  it('greys out calendar days past the bounds and opens on the bounded month', () => {
    render(<DateRangePicker label="Ngày hóa đơn" minDate={MIN} maxDate={MAX} />)
    openPicker()

    // Opening on the bounded month is what stops a bounded picker rendering a fully-disabled
    // calendar; it also puts the allowed month and the month past `maxDate` on screen together.
    expect(screen.getByRole('button', { name: /May 15th, 2026/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /June 1st, 2026/i })).toBeDisabled()
  })

  it('leaves an unbounded picker unrestricted', () => {
    const handleChange = vi.fn()
    render(<DateRangePicker label="Ngày hóa đơn" onChange={handleChange} />)
    const inputs = openPicker()

    typeInto(inputs, 0, '30/04/2026')
    typeInto(inputs, 1, '01/06/2026')
    clickApply()

    expect(handleChange).toHaveBeenCalledTimes(1)
    const range = handleChange.mock.calls[0][0]
    expect(range.from).toEqual(new Date(2026, 3, 30))
    expect(range.to).toEqual(new Date(2026, 5, 1))
  })
})
