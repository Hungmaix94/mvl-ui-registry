import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { forwardRef } from 'react'
import { Controller, useForm, useWatch, type UseFormReturn } from 'react-hook-form'
import FormController from './FormController'
import { CurrencyInput } from '@/components/ui/currency-input/CurrencyInput'

/**
 * Khoá lại lý do `FormController` tự đọc giá trị bằng `useWatch` thay vì dùng `field.value`.
 *
 * Bẫy nằm ở react-hook-form, không ở component nhập liệu: `useController` dựng `field.value` bằng
 * `useWatch(defaultValue = get(_formValues, name, get(_defaultValues, name)))`, và cái default ấy
 * được CHỤP Ở LẦN RENDER ĐẦU. Hàm `get` của RHF trả về default mỗi khi giá trị là `undefined`, nên
 * field bị xoá trắng lại nhận về GIÁ TRỊ BAN ĐẦU — ở màn Sửa là dữ liệu từ server.
 *
 * Bug thật: ClickUp 86eyqrt6r, ô "Số tiền thanh toán" của HĐ đặt chỗ.
 */

type Values = { amount?: number }

const SAVED_AMOUNT = 2000000

let formApi: UseFormReturn<Values>

/** Không đặt tên mở đầu bằng `render` — `testing-library/render-result-naming-convention` bắt. */
const amountBox = () => screen.getByRole('textbox') as HTMLInputElement

/**
 * Tái hiện đúng thao tác của QA: gõ bớt cho giá trị KHÁC giá trị đã lưu, rồi mới xoá trắng.
 *
 * Thứ tự này là bắt buộc, không phải cho đẹp. Xoá trắng thẳng từ giá trị gốc thì `field.value` đi
 * từ 2000000 về đúng 2000000 (default), React bail-out, component không re-render và ô vẫn rỗng —
 * trông như không có lỗi, dù form state đã lệch khỏi thứ đang hiện.
 */
const typeDownThenClear = (input: HTMLInputElement) => {
  fireEvent.change(input, { target: { value: '2' } })
  fireEvent.change(input, { target: { value: '' } })
}

const AmountForm = ({ defaults }: { defaults: Values }) => {
  const form = useForm<Values>({ defaultValues: defaults })
  formApi = form
  return (
    <FormController<Values, Record<string, unknown>>
      register={form.register}
      control={form.control}
      name="amount"
      Field={CurrencyInput}
    />
  )
}

describe('FormController — giá trị hiển thị (86eyqrt6r)', () => {
  it('xoá trắng được ô ở form CÓ giá trị mặc định — đây là bug gốc', () => {
    render(<AmountForm defaults={{ amount: SAVED_AMOUNT }} />)
    const input = amountBox()
    expect(input.value).toBe('2.000.000') // tiền đề: form đã nạp giá trị đã lưu

    typeDownThenClear(input)

    expect(input.value).toBe('')
    expect(formApi.getValues('amount')).toBeUndefined()
  })

  it('xoá xong gõ số mới thì nhận đúng số mới, không dính lại số cũ', () => {
    render(<AmountForm defaults={{ amount: SAVED_AMOUNT }} />)
    const input = amountBox()

    typeDownThenClear(input)
    fireEvent.change(input, { target: { value: '350000' } })

    expect(input.value).toBe('350.000')
    expect(formApi.getValues('amount')).toBe(350000)
  })

  it('form KHÔNG có giá trị mặc định (màn Tạo) vẫn chạy như cũ', () => {
    render(<AmountForm defaults={{}} />)
    const input = amountBox()
    fireEvent.change(input, { target: { value: '350000' } })
    expect(input.value).toBe('350.000')

    fireEvent.change(input, { target: { value: '' } })

    expect(input.value).toBe('')
    expect(formApi.getValues('amount')).toBeUndefined()
  })

  it('vẫn hiển thị giá trị do form đặt vào (setValue), không phải chỉ hiển thị thứ user gõ', () => {
    render(<AmountForm defaults={{ amount: SAVED_AMOUNT }} />)
    const input = amountBox()

    // `setValue` gọi trần không nằm trong act() nên React 18 không xả update — phải bọc, không thì
    // test đỏ vì hạ tầng chứ không phải vì code.
    act(() => {
      formApi.setValue('amount', 777000)
    })

    expect(input.value).toBe('777.000')
  })

  it('field lồng trong mảng vẫn cập nhật khi form ghi đè CẢ mảng cha', () => {
    // 52 chỗ trong repo khai `name={`rows.${i}.x`}` qua FormController, và nhiều form ghi lại cả
    // mảng bằng `setValue('rows', ...)` (vd BookingContractForm khi đổi hoa hồng). `useWatch` của
    // FormController đăng ký `exact: true`; test này chốt rằng lượt ghi cả mảng vẫn lan xuống ô con.
    type Rows = { rows: { v?: number }[] }
    let api: UseFormReturn<Rows>
    const RowsForm = () => {
      const form = useForm<Rows>({ defaultValues: { rows: [{ v: 1000 }, { v: 2000 }] } })
      api = form
      return (
        <FormController<Rows, Record<string, unknown>>
          register={form.register}
          control={form.control}
          name="rows.0.v"
          Field={CurrencyInput}
        />
      )
    }

    render(<RowsForm />)
    expect(amountBox().value).toBe('1.000') // tiền đề: ô con đọc đúng phần tử đầu

    act(() => {
      api.setValue('rows', [{ v: 9000 }, { v: 8000 }])
    })

    expect(amountBox().value).toBe('9.000')
  })

  it('`fieldProps` vẫn đứng cuối nên call site đè được mọi prop, kể cả `value`', () => {
    // forwardRef vì `{...field}` có kèm `ref`; thiếu nó React cảnh báo giữa output test.
    const Probe = forwardRef<HTMLSpanElement, { value?: unknown }>(({ value }, ref) => (
      <span ref={ref}>hiển thị: {String(value)}</span>
    ))
    const Harness = () => {
      const form = useForm<Values>({ defaultValues: { amount: SAVED_AMOUNT } })
      return (
        <FormController<Values, Record<string, unknown>>
          register={form.register}
          control={form.control}
          name="amount"
          Field={Probe}
          fieldProps={{ value: 'GIA_TRI_DE' }}
        />
      )
    }

    render(<Harness />)

    expect(screen.getByText('hiển thị: GIA_TRI_DE')).toBeInTheDocument()
    // Đối chứng: không đè thì chính giá trị form mới là thứ tới nơi.
    expect(screen.queryByText(`hiển thị: ${SAVED_AMOUNT}`)).toBeNull()
  })
})

describe('react-hook-form — tiền đề khiến bản vá trên tồn tại', () => {
  it('`field.value` của Controller trần VẪN trả về giá trị mặc định khi form state là undefined', () => {
    // Test này KHÔNG mô tả hành vi mong muốn — nó chốt hành vi của thư viện. Ngày nào RHF bỏ nhánh
    // fallback đó thì test này đỏ, và người sửa biết `value={liveValue}` trong FormController đã
    // hết cần thiết. Đừng "sửa cho xanh" bằng cách đổi expectation.
    const RawHarness = () => {
      const form = useForm<Values>({ defaultValues: { amount: SAVED_AMOUNT } })
      formApi = form
      const live = useWatch({ control: form.control, name: 'amount' })
      return (
        <>
          <Controller
            control={form.control}
            name="amount"
            render={({ field }) => <CurrencyInput {...field} />}
          />
          <span data-testid="live">{String(live)}</span>
        </>
      )
    }

    render(<RawHarness />)
    const input = amountBox()

    typeDownThenClear(input)

    expect(input.value).toBe('2.000.000') // field.value hồi sinh giá trị ban đầu
    expect(formApi.getValues('amount')).toBeUndefined() // trong khi form state đã rỗng
    expect(screen.getByTestId('live')).toHaveTextContent('undefined') // useWatch nói thật
  })
})
