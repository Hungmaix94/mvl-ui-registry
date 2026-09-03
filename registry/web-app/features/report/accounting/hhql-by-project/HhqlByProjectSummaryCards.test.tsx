import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import HhqlByProjectSummaryCards from './HhqlByProjectSummaryCards'

const setup = (props: Partial<React.ComponentProps<typeof HhqlByProjectSummaryCards>> = {}) =>
  render(
    <HhqlByProjectSummaryCards
      totalMgmt={812450000}
      grandTotal={1004312500}
      backOffice={121862500}
      projectCount={7}
      {...props}
    />
  )

describe('HhqlByProjectSummaryCards', () => {
  it('hiện ba chỉ số dưới dạng tiền đã định dạng', () => {
    setup()

    expect(screen.getByText('812.450.000')).toBeInTheDocument()
    expect(screen.getByText('1.004.312.500')).toBeInTheDocument()
    expect(screen.getByText('121.862.500')).toBeInTheDocument()
  })

  it('đọc tỉ trọng Back-Office trên tổng cộng', () => {
    setup({ grandTotal: 1000, backOffice: 125 })

    // `formatPct` cắt số 0 thừa ở đuôi ⇒ "12,5%", không phải "12,50%".
    expect(
      screen.getByText('Chiếm 12,5% tổng cộng, chia pro-rata theo doanh thu')
    ).toBeInTheDocument()
  })

  it('không chia cho 0 khi kỳ chưa có số liệu', () => {
    // `backOffice / 0` ra `Infinity` — in "∞%" trên một báo cáo kế toán là mất uy tín ngay.
    setup({ totalMgmt: 0, grandTotal: 0, backOffice: 0, projectCount: 0 })

    expect(
      screen.getByText('Pool công ty chia pro-rata theo doanh thu ghi nhận')
    ).toBeInTheDocument()
    expect(screen.queryByText(/NaN|Infinity|∞/)).toBeNull()
  })

  it('nói rõ tổng cộng đang cộng bao nhiêu dự án', () => {
    setup({ projectCount: 7 })

    expect(screen.getByText('Khớp dòng TỔNG CỘNG cuối bảng · 7 dự án')).toBeInTheDocument()
  })

  it('giữ chỗ bằng skeleton khi đang tải, không hiện số cũ', () => {
    setup({ isLoading: true })

    expect(screen.queryByText('1.004.312.500')).toBeNull()
    // Nhãn vẫn đứng nguyên nên khung không nhảy khi số về.
    expect(screen.getByText('Tổng cộng HHQL & Back-Office')).toBeInTheDocument()
  })
})
