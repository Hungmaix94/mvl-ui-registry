import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useState } from 'react'
import { DatePicker } from './date-picker'

/**
 * 86eymkrqu vòng 2 — QA báo 2 lỗi ở ô nhập ngày: gõ tay ngày mới rồi bấm Cập nhật thì lưu ngày CŨ,
 * và gõ `abc` rồi bấm Cập nhật thì vẫn trả 200. Cùng một gốc: `handleManualBlur` từng bỏ qua mọi
 * lần blur khi popover đang mở, mà `onFocus` lại TỰ mở popover ⇒ nhánh bỏ qua ăn luôn đường đi
 * thật của người dùng.
 *
 * Điều kiện chính xác là "blur TRƯỚC khi popover kịp đóng" — nhấn Enter (onKeyDown gọi blur() mà
 * không đóng popover) hoặc Tab. Bấm chuột ra ngoài thì tình cờ thoát vì Radix dismiss ở pointerdown
 * rồi React mới xả state, nên bug đọc như "lúc có lúc không". Test ở đây mô phỏng nhánh dính
 * (blur trong lúc popover còn mở) vì đó mới là ca cần khoá.
 *
 * TIỀN ĐỀ BẮT BUỘC của mọi test dưới đây: phải `focus` rồi cho chạy hết timer để popover mở ra
 * TRƯỚC khi gõ. Bỏ bước đó thì `isOpen` vẫn false, bản code cũ cũng commit bình thường và cả bộ
 * test này xanh trên đúng con bug nó sinh ra để bắt. `expectPopoverOpen()` ghim tiền đề ấy.
 *
 * `TextField` gọi `onBlur?.()` không kèm event nên không dò được `relatedTarget` — việc phân biệt
 * "blur vì bấm vào lịch" với "blur vì rời field" đi qua pointerdown trên popover, nên test hồi quy
 * phải bắn `pointerDown` chứ không mô phỏng bằng cách khác được.
 */

const VALUE = '12/08/2026'

const setup = (props: Partial<React.ComponentProps<typeof DatePicker>> = {}) => {
  const onChange = vi.fn()
  render(
    <DatePicker
      label="Ngày hóa đơn"
      required
      clearable
      allowManualInput
      value={VALUE}
      onChange={onChange}
      {...props}
    />
  )
  return { onChange, input: screen.getByRole('textbox') as HTMLInputElement }
}

/** Focus ô nhập rồi xả `setTimeout(…, 0)` của onFocus — đây là thứ mở popover. */
const focusAndOpen = (input: HTMLInputElement) => {
  fireEvent.focus(input)
  act(() => {
    vi.runAllTimers()
  })
}

const expectPopoverOpen = () => expect(screen.getByRole('dialog')).toBeInTheDocument()

const type = (input: HTMLInputElement, value: string) =>
  fireEvent.change(input, { target: { value } })

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
afterEach(() => vi.useRealTimers())

describe('DatePicker — nhập tay rồi rời field', () => {
  it('commit ngày vừa gõ khi người dùng bấm thẳng nút Lưu (popover vẫn đang mở)', () => {
    const { onChange, input } = setup()

    focusAndOpen(input)
    expectPopoverOpen() // tiền đề: đúng trạng thái làm bản cũ bỏ qua blur
    type(input, '09/07/2026')
    fireEvent.blur(input)

    expect(onChange).toHaveBeenLastCalledWith('09/07/2026')
  })

  it('xoá trắng bằng bàn phím thì đẩy giá trị về rỗng, không giữ ngày cũ', () => {
    const { onChange, input } = setup()

    focusAndOpen(input)
    expectPopoverOpen()
    type(input, '')
    fireEvent.blur(input)

    expect(onChange).toHaveBeenLastCalledWith('')
  })
})

describe('DatePicker — text sai định dạng phải chặn submit', () => {
  it('gõ `abc` thì báo lỗi VÀ đẩy giá trị form về rỗng', () => {
    const { onChange, input } = setup()

    focusAndOpen(input)
    expectPopoverOpen()
    type(input, 'abc')
    fireEvent.blur(input)

    expect(screen.getByText(/Ngày không hợp lệ/i)).toBeInTheDocument()
    // Rỗng chứ không phải ngày cũ: field bắt buộc mới đỏ ở zod và chặn được lần bấm Lưu.
    expect(onChange).toHaveBeenLastCalledWith('')
    expect(onChange).not.toHaveBeenLastCalledWith(VALUE)
  })

  it('giữ nguyên text sai trong ô để người dùng thấy mình vừa gõ gì', () => {
    // Phải là harness CÓ STATE: `value` phải thật sự đổi theo onChange thì effect đồng bộ mới
    // chạy — đó chính là thứ `keepManualTextRef` chặn. Dùng spy với `value` cố định thì effect
    // không bao giờ re-fire và test xanh kể cả khi bỏ hẳn cơ chế giữ text.
    const Controlled = () => {
      const [v, setV] = useState<string>(VALUE)
      return (
        <DatePicker
          label="Ngày hóa đơn"
          allowManualInput
          value={v}
          onChange={(val) => setV(val ?? '')}
        />
      )
    }
    render(<Controlled />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe(VALUE) // tiền đề: harness thật sự điều khiển giá trị

    focusAndOpen(input)
    type(input, 'abc')
    fireEvent.blur(input)

    expect(input.value).toBe('abc')
    expect(screen.getByText(/Ngày không hợp lệ/i)).toBeInTheDocument()
  })

  it('năm ngoài khoảng fromYear/toYear cũng bị từ chối và đẩy về rỗng', () => {
    const { onChange, input } = setup({ fromYear: 2020, toYear: 2030 })

    focusAndOpen(input)
    type(input, '09/07/1899')
    fireEvent.blur(input)

    expect(screen.getByText(/Năm phải từ 2020 đến 2030/i)).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith('')
  })
})

describe('DatePicker — không hồi quy đường chọn ngày trên lịch', () => {
  it('blur do bấm vào popover lịch KHÔNG commit text đang gõ dở', () => {
    const { onChange, input } = setup()

    focusAndOpen(input)
    type(input, '09/07/2026')
    // Bấm vào lịch làm input blur TRƯỚC onSelect. Bỏ qua đúng ca này là lý do guard tồn tại;
    // commit ở đây thì người dùng phải bấm 2 lần mới chọn được ngày.
    fireEvent.pointerDown(screen.getByRole('dialog'))
    fireEvent.blur(input)

    expect(onChange).not.toHaveBeenCalled()
  })

  it('chọn ngày trên lịch xong rồi gõ tay đè lên thì vẫn commit text vừa gõ', () => {
    // Chọn lịch bật `justSelectedFromCalendarRef` mà KHÔNG có blur nào sau đó để hạ cờ, nên nếu
    // không reset lúc focus thì lượt gõ tay kế tiếp bị nuốt — đúng lỗi QA báo, chỉ khác thứ tự
    // thao tác. Đo trên dev: chọn 20/08 rồi gõ 09/07/2026, ô hiện 09/07 mà PUT gửi 2026-08-20.
    const { onChange, input } = setup()

    focusAndOpen(input)
    const ngay = screen
      .getAllByRole('button')
      .find((b) => /August 20th, 2026/.test(b.getAttribute('aria-label') || ''))
    expect(ngay).toBeTruthy() // tiền đề: đang mở đúng tháng 8/2026
    fireEvent.pointerDown(ngay!)
    fireEvent.blur(input)
    fireEvent.click(ngay!)
    expect(onChange).toHaveBeenLastCalledWith('20/08/2026')

    // lượt tương tác MỚI: gõ tay đè lên ngày vừa chọn
    focusAndOpen(input)
    type(input, '09/07/2026')
    fireEvent.blur(input)

    expect(onChange).toHaveBeenLastCalledWith('09/07/2026')
  })

  it('cờ pointerdown chỉ sống trong đúng lượt đó, lần blur sau vẫn commit', () => {
    const { onChange, input } = setup()

    focusAndOpen(input)
    // Bấm vào vùng trống của popover: không có phần tử nào nhận focus nên KHÔNG sinh blur,
    // cờ phải tự hạ ở macrotask kế — không thì lần bấm Lưu sau đó bị nuốt oan.
    fireEvent.pointerDown(screen.getByRole('dialog'))
    act(() => {
      vi.runAllTimers()
    })

    type(input, '09/07/2026')
    fireEvent.blur(input)

    expect(onChange).toHaveBeenLastCalledWith('09/07/2026')
  })
})
