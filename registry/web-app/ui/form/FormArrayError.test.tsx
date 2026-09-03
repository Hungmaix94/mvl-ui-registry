import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { FormArrayError } from './FormArrayError'

const GENERIC = 'Vui lòng kiểm tra lại thông tin nhân sự'
const BE_MESSAGE =
  "'EX000001940 - Sàn Tuấn Anh 66' chưa có tỷ lệ hoa hồng: cấu hình TBC hiệu lực vào ngày 2026-08-20 đang để trống tỷ lệ. Hãy điền tỷ lệ trên TBC trước khi tiếp tục."

describe('FormArrayError', () => {
  it('renders nothing when there is no error', () => {
    const { container } = render(<FormArrayError errors={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the root message when the array itself is invalid', () => {
    render(<FormArrayError errors={{ root: { message: 'Tổng tỷ lệ doanh thu phải bằng 100%' } }} />)
    expect(screen.getByText('Tổng tỷ lệ doanh thu phải bằng 100%')).toBeInTheDocument()
  })

  // Bug 86eyez5z6 — đây là hồi quy chính. BE trả lý do rất rõ theo từng dòng; bản cũ
  // vứt hết và chỉ in một câu chung chung, nên người dùng bị chặn lưu mà không biết
  // phải sửa gì.
  it('surfaces the concrete per-row message instead of the generic fallback', () => {
    render(<FormArrayError errors={[{ exchange: { message: BE_MESSAGE } }]} />)

    expect(screen.getByText(BE_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByText(GENERIC)).not.toBeInTheDocument()
  })

  it('finds a message nested deeper than the first level', () => {
    render(
      <FormArrayError
        errors={[{ f2_source: { type: 'invalid_enum_value', message: 'Nguồn F2 không hợp lệ' } }]}
      />
    )
    expect(screen.getByText('Nguồn F2 không hợp lệ')).toBeInTheDocument()
  })

  it('numbers the rows when more than one row is at fault', () => {
    render(
      <FormArrayError
        errors={[
          { exchange: { message: 'Sàn A chưa có tỷ lệ' } },
          { exchange: { message: 'Sàn B chưa có tỷ lệ' } },
        ]}
      />
    )
    expect(screen.getByText('Dòng 1: Sàn A chưa có tỷ lệ')).toBeInTheDocument()
    expect(screen.getByText('Dòng 2: Sàn B chưa có tỷ lệ')).toBeInTheDocument()
  })

  it('skips rows with no error when numbering', () => {
    render(
      <FormArrayError errors={[undefined, { exchange: { message: 'Sàn B chưa có tỷ lệ' } }]} />
    )
    expect(screen.getByText('Dòng 2: Sàn B chưa có tỷ lệ')).toBeInTheDocument()
  })

  it('falls back to the generic message only when no message can be found', () => {
    render(<FormArrayError errors={[{ exchange: { type: 'required' } }]} />)
    expect(screen.getByText(GENERIC)).toBeInTheDocument()
  })

  // Lỗi thật của react-hook-form mang theo `ref` trỏ tới ô input; React gắn cây fiber
  // (có tham chiếu vòng) lên chính node đó. Nếu hàm gom message đi vào `ref` thì tràn
  // stack và treo form — ca nguy hiểm nhất là `message` rỗng nên không dừng sớm được.
  it('does not walk into the DOM node behind `ref`', () => {
    const input = document.createElement('input')
    ;(input as any).__reactFiber$abc = { stateNode: input }
    ;(input as any).__reactFiber$abc.self = (input as any).__reactFiber$abc

    expect(() =>
      render(
        <FormArrayError errors={[{ exchange: { type: 'required', message: '', ref: input } }]} />
      )
    ).not.toThrow()
    expect(screen.getByText(GENERIC)).toBeInTheDocument()
  })

  it('survives a self-referencing error object', () => {
    const cyclic: Record<string, unknown> = { type: 'required' }
    cyclic.self = cyclic

    expect(() => render(<FormArrayError errors={[cyclic]} />)).not.toThrow()
    expect(screen.getByText(GENERIC)).toBeInTheDocument()
  })

  it('still finds the message when a leaf also carries a ref', () => {
    const input = document.createElement('input')
    render(
      <FormArrayError
        errors={[{ exchange: { type: 'invalid', message: BE_MESSAGE, ref: input } }]}
      />
    )
    expect(screen.getByText(BE_MESSAGE)).toBeInTheDocument()
  })

  it('honours a caller-supplied fallback', () => {
    render(<FormArrayError errors={[{}]} fallbackMessage="Kiểm tra lại các dòng" />)
    expect(screen.getByText('Kiểm tra lại các dòng')).toBeInTheDocument()
  })
})
