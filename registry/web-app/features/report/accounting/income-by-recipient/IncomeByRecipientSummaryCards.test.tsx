import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import IncomeByRecipientSummaryCards from './IncomeByRecipientSummaryCards'

const setup = (props: Partial<React.ComponentProps<typeof IncomeByRecipientSummaryCards>> = {}) =>
  render(
    <IncomeByRecipientSummaryCards
      gross={437138347}
      net={316225159}
      commissionActualPaid={3001531}
      {...props}
    />
  )

describe('IncomeByRecipientSummaryCards', () => {
  it('renders the three metrics as formatted currency', () => {
    setup()

    expect(screen.getByText('437.138.347')).toBeInTheDocument()
    expect(screen.getByText('316.225.159')).toBeInTheDocument()
    expect(screen.getByText('3.001.531')).toBeInTheDocument()
  })

  it('reads Net against Gross as a ratio', () => {
    // Cả hai số dùng để tính đều đang hiện ngay cạnh nhau, nên tỉ lệ này là quan hệ có thật —
    // KHÔNG được diễn giải thành "đã trừ BHXH + thuế": theo SRS, net còn trừ cả tạm giữ và tạm ứng.
    setup({ gross: 1000, net: 723 })

    expect(screen.getByText('Bằng 72,3% tổng thu nhập trước thuế')).toBeInTheDocument()
  })

  it('không chia cho 0 khi kỳ chưa có số liệu', () => {
    // `net / 0` ra `Infinity` — in ra "∞%" hoặc "NaN%" trên báo cáo kế toán là mất uy tín ngay.
    setup({ gross: 0, net: 0, commissionActualPaid: 0 })

    expect(screen.getByText('Sau BHXH, thuế TNCN, tạm giữ và tạm ứng')).toBeInTheDocument()
    expect(screen.queryByText(/NaN|Infinity|∞/)).toBeNull()
  })

  it('giữ chỗ bằng skeleton khi đang tải, không hiện số cũ', () => {
    setup({ isLoading: true })

    expect(screen.queryByText('437.138.347')).toBeNull()
    // Nhãn vẫn đứng nguyên nên khung không nhảy khi số về.
    expect(screen.getByText('Tổng thực nhận (Net)')).toBeInTheDocument()
  })
})
