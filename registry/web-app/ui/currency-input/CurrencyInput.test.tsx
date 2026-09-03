import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { CurrencyInput } from './CurrencyInput'

const TestWrapper = ({
  initialValue,
  onChange,
  allowNegative,
}: {
  initialValue?: number
  onChange?: (val: number | undefined) => void
  allowNegative?: boolean
}) => {
  const [value, setValue] = useState<number | undefined>(initialValue)
  const handleChange = (val: number | undefined) => {
    setValue(val)
    onChange?.(val)
  }
  return <CurrencyInput value={value} onChange={handleChange} allowNegative={allowNegative} />
}

describe('CurrencyInput', () => {
  it('formats initial value correctly', () => {
    render(<TestWrapper initialValue={4000000} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('4.000.000')
  })

  it('updates value on typing', () => {
    const handleChange = vi.fn()
    render(<TestWrapper initialValue={400000} onChange={handleChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.change(input, { target: { value: '4.000.000' } })
    expect(input.value).toBe('4.000.000')
    expect(handleChange).toHaveBeenLastCalledWith(4000000)
  })

  it('preserves zeros when deleting the first digit', () => {
    const handleChange = vi.fn()
    render(<TestWrapper initialValue={4000000} onChange={handleChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    // Simulate deleting the '4' from '4.000.000' -> '.000.000'
    fireEvent.change(input, { target: { value: '.000.000' } })
    expect(input.value).toBe('000.000')
    expect(handleChange).toHaveBeenLastCalledWith(0)

    // Simulate typing '5' at the start of '000.000' -> '5000.000'
    fireEvent.change(input, { target: { value: '5000.000' } })
    expect(input.value).toBe('5.000.000')
    expect(handleChange).toHaveBeenLastCalledWith(5000000)
  })

  it('hides 0 when hideZero prop is true', () => {
    render(<CurrencyInput value={0} hideZero />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('')
  })

  it('clears input to empty string when typing 0 with hideZero', () => {
    const handleChange = vi.fn()
    render(<CurrencyInput value={0} hideZero onChange={handleChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('')

    fireEvent.change(input, { target: { value: '0' } })
    expect(input.value).toBe('')
    expect(handleChange).toHaveBeenLastCalledWith(undefined)
  })
})

/**
 * The minus key was swallowed by `handleKeyDown` while `formatNumericString` and
 * `parseCurrencyVND` had handled negatives all along — a negative amount could be DISPLAYED
 * but never TYPED. Credit notes (hóa đơn điều chỉnh giảm) are the first screen that needs it.
 *
 * `fireEvent` returns false when the handler called `preventDefault`, which is the only way to
 * observe the guard: the other tests here drive the input with `change`, which never runs it.
 */
describe('CurrencyInput negative amounts', () => {
  it('swallows the minus key by default, leaving the other 58 call sites untouched', () => {
    render(<TestWrapper initialValue={4000000} />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    const notPrevented = fireEvent.keyDown(input, { key: '-' })
    expect(notPrevented).toBe(false)
    expect(input.value).toBe('4.000.000')
  })

  it('lets the minus key through when allowNegative is set', () => {
    render(<TestWrapper allowNegative />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    expect(fireEvent.keyDown(input, { key: '-' })).toBe(true)
  })

  it('formats and reports a negative amount', () => {
    const handleChange = vi.fn()
    render(<TestWrapper allowNegative onChange={handleChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.change(input, { target: { value: '-17185058' } })
    expect(input.value).toBe('-17.185.058')
    expect(handleChange).toHaveBeenLastCalledWith(-17185058)
  })

  it('keeps the lone minus on screen while the digits are still being typed', () => {
    // `parseCurrencyVND('-')` is NaN -> 0, so this intermediate step reports 0 while the sign
    // is already on screen. Losing the '-' here is how the accountant ends up sending +17tr.
    const handleChange = vi.fn()
    render(<TestWrapper allowNegative onChange={handleChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.change(input, { target: { value: '-' } })
    expect(input.value).toBe('-')

    fireEvent.change(input, { target: { value: '-5' } })
    expect(input.value).toBe('-5')
    expect(handleChange).toHaveBeenLastCalledWith(-5)
  })

  it('ignores a minus that is not leading', () => {
    const handleChange = vi.fn()
    render(<TestWrapper allowNegative onChange={handleChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.change(input, { target: { value: '5-0' } })
    expect(input.value).toBe('50')
    expect(handleChange).toHaveBeenLastCalledWith(50)
  })

  it('still displays a negative value it was given', () => {
    render(<TestWrapper initialValue={-17185058} allowNegative />)
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('-17.185.058')
  })
})
