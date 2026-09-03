import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import FullCellNumberInput from './FullCellNumberInput'

// Mock requestAnimationFrame to run synchronously
beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 0
  })
})

const TestWrapper = ({
  initialValue,
  onChange,
  suffix = 'VND',
  min,
  max,
  allowPercentOverHundred,
  maxFractionDigits,
}: {
  initialValue?: string | number
  onChange?: (e: any) => void
  suffix?: string
  min?: number
  max?: number
  allowPercentOverHundred?: boolean
  maxFractionDigits?: number
}) => {
  const [value, setValue] = useState<string | number | undefined>(initialValue)
  const handleChange = (e: any) => {
    setValue(e.target.value)
    onChange?.(e)
  }
  return (
    <FullCellNumberInput
      value={value}
      onChange={handleChange}
      suffix={suffix}
      min={min}
      max={max}
      allowPercentOverHundred={allowPercentOverHundred}
      maxFractionDigits={maxFractionDigits}
    />
  )
}

describe('FullCellNumberInput', () => {
  describe('VND Suffix (Currency formatting)', () => {
    it('displays formatted currency on blur (not focused)', () => {
      render(<TestWrapper initialValue="10000000" />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('10.000.000')
    })

    // Focus chọn TOÀN BỘ giá trị (`input.select()`) để gõ đè được ngay, không phải đặt con trỏ ở
    // cuối. Assertion cũ bắt `setSelectionRange(10, 10)` không bao giờ đúng: jsdom cài `select()`
    // đặt thẳng selectionStart/End nên không đi qua property bị ghi đè trên instance.
    it('displays formatted currency value on focus and selects it all for overtyping', () => {
      render(<TestWrapper initialValue="10000000" />)
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.focus(input)

      expect(input.value).toBe('10.000.000')
      expect(input.selectionStart).toBe(0)
      expect(input.selectionEnd).toBe('10.000.000'.length)
    })

    it('formats on the fly on typing, but passes raw number string to onChange', () => {
      let onChangeVal = ''
      const handleChange = vi.fn((e) => {
        onChangeVal = e.target.value
      })
      render(<TestWrapper initialValue="1000000" onChange={handleChange} />)
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.focus(input)
      // Simulate typing a '0' at the end: value goes from '1.000.000' to '1.000.0000'
      fireEvent.change(input, { target: { value: '1.000.0000' } })

      expect(input.value).toBe('10.000.000')
      expect(handleChange).toHaveBeenCalled()
      expect(onChangeVal).toBe('10000000') // Parent receives raw digits
    })

    it('maintains format on blur after editing', () => {
      render(<TestWrapper initialValue="10000000" />)
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.focus(input)
      expect(input.value).toBe('10.000.000')

      fireEvent.blur(input)
      expect(input.value).toBe('10.000.000')
    })

    it('handles min clamping correctly', () => {
      let onChangeVal = ''
      const handleChange = vi.fn((e) => {
        onChangeVal = e.target.value
      })
      render(<TestWrapper initialValue="1000000" min={5000000} onChange={handleChange} />)
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.focus(input)
      // Type something lower than min
      fireEvent.change(input, { target: { value: '1.000' } })

      expect(input.value).toBe('5.000.000') // Clamped to min
      expect(onChangeVal).toBe('5000000')
    })

    it('handles max clamping correctly', () => {
      let onChangeVal = ''
      const handleChange = vi.fn((e) => {
        onChangeVal = e.target.value
      })
      render(<TestWrapper initialValue="1000000" max={5000000} onChange={handleChange} />)
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.focus(input)
      // Type something higher than max
      fireEvent.change(input, { target: { value: '9.000.000' } })

      expect(input.value).toBe('5.000.000') // Clamped to max
      expect(onChangeVal).toBe('5000000')
    })

    it('supports negative values when min is less than 0', () => {
      let onChangeVal = ''
      const handleChange = vi.fn((e) => {
        onChangeVal = e.target.value
      })
      render(<TestWrapper initialValue="-1000000" min={-5000000} onChange={handleChange} />)
      const input = screen.getByRole('textbox') as HTMLInputElement

      expect(input.value).toBe('-1.000.000')

      fireEvent.focus(input)
      expect(input.value).toBe('-1.000.000')

      // Type a '-' sign first (simulated)
      fireEvent.change(input, { target: { value: '-' } })
      expect(input.value).toBe('-')
      expect(onChangeVal).toBe('-')

      // Type negative digits
      fireEvent.change(input, { target: { value: '-2.000' } })
      expect(input.value).toBe('-2.000')
      expect(onChangeVal).toBe('-2000')
    })

    it('preserves scale of trailing zeros when deleting the leading non-zero digit', () => {
      render(<TestWrapper initialValue="5000000" />)
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.focus(input)
      expect(input.value).toBe('5.000.000')

      // Simulate deleting '5' by replacing value with '000.000'
      fireEvent.change(input, { target: { value: '000.000' } })
      expect(input.value).toBe('000.000')

      // Simulate typing '2' at the beginning -> '2000.000' which formats to '2.000.000'
      fireEvent.change(input, { target: { value: '2000.000' } })
      expect(input.value).toBe('2.000.000')
    })
  })

  describe('Non-VND Suffix (Percentage / Decimals)', () => {
    it('preserves decimal comma on focus and blur when suffix is %', () => {
      render(<TestWrapper initialValue="10.5" suffix="%" />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('10,5')

      fireEvent.focus(input)
      expect(input.value).toBe('10,5')

      fireEvent.blur(input)
      expect(input.value).toBe('10,5')
    })

    it('formats with comma on typing, but passes raw dot-decimal number string to onChange', () => {
      let onChangeVal = ''
      const handleChange = vi.fn((e) => {
        onChangeVal = e.target.value
      })
      render(<TestWrapper initialValue="10" suffix="%" onChange={handleChange} />)
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '10,5' } })

      expect(input.value).toBe('10,5')
      expect(onChangeVal).toBe('10.5')
    })

    it('prevents multiple dots or commas', () => {
      render(<TestWrapper initialValue="10.5" suffix="%" />)
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.focus(input)
      // Attempt to type a second dot
      fireEvent.change(input, { target: { value: '10.5.' } })

      // Should reject the change and remain 10,5
      expect(input.value).toBe('10,5')
    })

    it('limits to 3 decimal places', () => {
      render(<TestWrapper initialValue="10" suffix="%" />)
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '10.1234' } })

      expect(input.value).toBe('10,123')
    })

    // Backend trả DecimalField dạng "60.0000". Trước đây blur hiện "60" (đi qua formatNumber) còn
    // focus lại lấy chuỗi thô nên hoá "60,0000" — giá trị nhảy ngay khi bấm vào ô.
    it('does not expose the raw API decimal string on focus', () => {
      render(<TestWrapper initialValue="60.0000" suffix="%" />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('60')

      fireEvent.focus(input)
      expect(input.value).toBe('60')

      fireEvent.blur(input)
      expect(input.value).toBe('60')
    })

    it('keeps significant decimals when trimming API trailing zeros on focus', () => {
      render(<TestWrapper initialValue="60.5000" suffix="%" />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('60,5')

      fireEvent.focus(input)
      expect(input.value).toBe('60,5')
    })

    // decimal_places=4 nen API tra ve duoc 4 so le; focus phai cat cung 3 so nhu luc blur.
    it('rounds to the same decimal precision on focus as on blur', () => {
      render(<TestWrapper initialValue="60.1235" suffix="%" />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      const blurred = input.value

      fireEvent.focus(input)

      expect(input.value).toBe(blurred)
      expect(input.value).toBe('60,124')
    })

    it('trims API trailing zeros on focus for non-% numeric cells too', () => {
      render(<TestWrapper initialValue="4.0000" suffix="" />)
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.focus(input)
      expect(input.value).toBe('4')
    })

    // Giá trị lớn: lúc focus KHÔNG được chèn dấu phân cách nghìn, vì onChange chỉ nhận
    // /^-?\d*\.?\d*$/ — có dấu chấm nghìn là người dùng gõ tiếp không được.
    it('gives an editable (unseparated) string on focus for large values', () => {
      render(<TestWrapper initialValue="1234.5000" suffix="" />)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('1.234,5')

      fireEvent.focus(input)
      expect(input.value).toBe('1234,5')

      fireEvent.change(input, { target: { value: '1234,56' } })
      expect(input.value).toBe('1234,56')
    })

    it('clamps to 100 by default when suffix is %', () => {
      let onChangeVal = ''
      const handleChange = vi.fn((e) => {
        onChangeVal = e.target.value
      })
      render(<TestWrapper initialValue="10" suffix="%" onChange={handleChange} />)
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '171' } })

      expect(input.value).toBe('100')
      expect(onChangeVal).toBe('100')
    })
  })

  describe('allowPercentOverHundred', () => {
    it('accepts a % value above 100 instead of clamping it', () => {
      let onChangeVal = ''
      const handleChange = vi.fn((e) => {
        onChangeVal = e.target.value
      })
      render(
        <TestWrapper initialValue="60" suffix="%" allowPercentOverHundred onChange={handleChange} />
      )
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '171' } })

      expect(input.value).toBe('171')
      expect(onChangeVal).toBe('171')
    })

    it('keeps a decimal % value above 100 intact', () => {
      let onChangeVal = ''
      const handleChange = vi.fn((e) => {
        onChangeVal = e.target.value
      })
      render(
        <TestWrapper initialValue="60" suffix="%" allowPercentOverHundred onChange={handleChange} />
      )
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '120,5' } })

      expect(input.value).toBe('120,5')
      expect(onChangeVal).toBe('120.5')
    })

    it('still clamps below min', () => {
      let onChangeVal = ''
      const handleChange = vi.fn((e) => {
        onChangeVal = e.target.value
      })
      render(
        <TestWrapper
          initialValue="60"
          suffix="%"
          allowPercentOverHundred
          min={0}
          onChange={handleChange}
        />
      )
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '-5' } })

      expect(onChangeVal).toBe('0')
    })

    it('respects an explicit max even when the flag is set', () => {
      let onChangeVal = ''
      const handleChange = vi.fn((e) => {
        onChangeVal = e.target.value
      })
      render(
        <TestWrapper
          initialValue="60"
          suffix="%"
          allowPercentOverHundred
          max={200}
          onChange={handleChange}
        />
      )
      const input = screen.getByRole('textbox') as HTMLInputElement

      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '250' } })

      expect(input.value).toBe('200')
      expect(onChangeVal).toBe('200')
    })
  })
})

describe('maxFractionDigits', () => {
  /**
   * BE nới tỷ lệ hoa hồng lên numeric(14,10) ngày 26/08/2026 vì một tỷ lệ có thể là PHÂN SỐ
   * của tỷ lệ khác (1/3 của phí đại lý 10% = 3,3333333333%). Trần 3 chữ số mặc định của ô này
   * không báo lỗi khi bị vượt — nó CẮT, nên thiếu prop là mất tiền mà không ai thấy.
   */
  const TEN_DP = '3,3333333333'

  it('mặc định vẫn cắt ở 3 chữ số — hành vi cũ của mọi ô tiền không đổi', () => {
    let onChangeVal = ''
    const handleChange = vi.fn((e) => {
      onChangeVal = e.target.value
    })
    render(<TestWrapper initialValue="0" suffix="%" onChange={handleChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: TEN_DP } })

    expect(onChangeVal).toBe('3.333')
  })

  it('nhận đủ 10 chữ số khi caller nới trần', () => {
    let onChangeVal = ''
    const handleChange = vi.fn((e) => {
      onChangeVal = e.target.value
    })
    render(
      <TestWrapper initialValue="0" suffix="%" maxFractionDigits={10} onChange={handleChange} />
    )
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: TEN_DP } })

    expect(onChangeVal).toBe('3.3333333333')
  })

  it('focus vào ô KHÔNG hạ giá trị 10 chữ số có sẵn xuống 3', () => {
    // Đường mất số nguy hiểm nhất: giá trị nạp từ import/API, người dùng chỉ chạm vào ô là
    // chuỗi soạn thảo được dựng lại ở trần cũ rồi ghi đè giá trị thật.
    render(<TestWrapper initialValue="3.3333333333" suffix="%" maxFractionDigits={10} />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    expect(input.value).toBe(TEN_DP)
    fireEvent.focus(input)
    expect(input.value).toBe(TEN_DP)
    fireEvent.blur(input)
    expect(input.value).toBe(TEN_DP)
  })
})
