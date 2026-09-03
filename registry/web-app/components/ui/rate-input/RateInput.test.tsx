import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RateInput } from './RateInput'

/**
 * Ô "%" của RateInput chấp nhận 3 chữ số thập phân (12/08/2026).
 *
 * Rate cụm F2 lưu ở numeric(6,3), nên bộ lọc cũ `(\.\d{0,2})?` nuốt mất chữ số thứ 3:
 * kế toán gõ 1,667 thì màn nhận 1,66 và BE lưu một tỷ lệ khác cái đã gõ.
 */
describe('RateInput — ô phần trăm', () => {
  const renderPct = () => {
    const onChange = vi.fn()
    render(<RateInput label="Hoa hồng sàn liên kết" onChange={onChange} />)
    return { onChange, input: screen.getByLabelText('Hoa hồng sàn liên kết — phần trăm') }
  }

  it('giữ nguyên 3 chữ số thập phân', async () => {
    const user = userEvent.setup()
    const { input } = renderPct()

    await user.type(input, '1.667')

    expect(input).toHaveValue('1.667')
  })

  it('cắt chữ số thứ 4 thay vì làm tròn', async () => {
    const user = userEvent.setup()
    const { input } = renderPct()

    await user.type(input, '1.6675')

    expect(input).toHaveValue('1.667')
  })

  it('vẫn nhận dấu phẩy làm dấu thập phân', async () => {
    const user = userEvent.setup()
    const { input } = renderPct()

    await user.type(input, '2,125')

    expect(input).toHaveValue('2.125')
  })

  it('vẫn giới hạn 3 chữ số phần nguyên', async () => {
    const user = userEvent.setup()
    const { input } = renderPct()

    await user.type(input, '1234')

    expect(input).toHaveValue('123')
  })
})
